// DETERMINISTIC INTEGRATION HARNESS
//
// A small in-memory stand-in for PostgREST used by the state-transition
// suites. It exists so the two halves of the security contract can both be
// exercised in one place:
//
//   * the MEMBER client enforces the live `authenticated` grants from
//     `acl-manifest.ts` — a write the database would reject fails here too,
//     with the same shape of error;
//   * the ADMIN client is unrestricted, standing in for the service role.
//
// It is not a Postgres emulator. It supports the query surface this codebase
// actually uses: select/insert/update/upsert/delete with eq/neq/in/is/not/or,
// order, limit, maybeSingle, single.
import { AUTHENTICATED_ACL } from "./acl-manifest";

export type Row = Record<string, unknown>;
export type Tables = Record<string, Row[]>;

type Filter = (row: Row) => boolean;

let idSeq = 0;
export const nextId = () =>
  `00000000-0000-4000-8000-${String(++idSeq).padStart(12, "0")}`;

function matchOr(expr: string): Filter {
  // "user_low.eq.x,user_high.eq.x"
  const parts = expr.split(",").map((p) => p.split("."));
  return (row) =>
    parts.some(([col, op, val]) => (op === "eq" ? String(row[col!]) === val : false));
}

class Query implements PromiseLike<{ data: unknown; error: { message: string } | null }> {
  private filters: Filter[] = [];
  private limitN: number | null = null;
  private single: "maybe" | "one" | null = null;
  private pending: { kind: "select" } | { kind: "mutate"; rows: Row[] } = { kind: "select" };

  constructor(
    private db: Db,
    private table: string,
    private role: "member" | "admin",
  ) {}

  private denied: string | null = null;

  /** Mirrors a PostgREST 42501: recorded, then surfaced as `{ error }`. */
  private acl(op: "insert" | "update" | "delete", payload?: Row): boolean {
    if (this.role === "admin") return true;
    const acl = AUTHENTICATED_ACL[this.table];
    const granted = !acl ? [] : op === "delete" ? (acl.delete ? ["*"] : []) : acl[op];
    if (granted.length === 0) {
      this.denied = `permission denied for table ${this.table} (no ${op.toUpperCase()} grant for authenticated)`;
      return false;
    }
    for (const col of Object.keys(payload ?? {})) {
      if (op !== "delete" && !granted.includes(col)) {
        this.denied = `permission denied for column "${col}" of table ${this.table}`;
        return false;
      }
    }
    return true;
  }

  private rows() {
    return (this.db.tables[this.table] ??= []);
  }

  select(_cols?: string) {
    return this;
  }
  eq(col: string, val: unknown) {
    this.filters.push((r) => String(r[col]) === String(val));
    return this;
  }
  neq(col: string, val: unknown) {
    this.filters.push((r) => String(r[col]) !== String(val));
    return this;
  }
  in(col: string, vals: unknown[]) {
    this.filters.push((r) => vals.map(String).includes(String(r[col])));
    return this;
  }
  is(col: string, val: null | boolean) {
    this.filters.push((r) => (r[col] ?? null) === val);
    return this;
  }
  not(col: string, op: string, val: unknown) {
    this.filters.push((r) => (op === "is" ? (r[col] ?? null) !== val : String(r[col]) !== String(val)));
    return this;
  }
  or(expr: string) {
    this.filters.push(matchOr(expr));
    return this;
  }
  order(_col: string, _opts?: unknown) {
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  maybeSingle() {
    this.single = "maybe";
    return this;
  }

  insert(payload: Row | Row[]) {
    const list = Array.isArray(payload) ? payload : [payload];
    for (const p of list) this.acl("insert", p);
    if (this.denied) return this;
    const created = list.map((p) => ({ id: nextId(), created_at: new Date().toISOString(), ...p }));
    this.rows().push(...created);
    this.pending = { kind: "mutate", rows: created };
    return this;
  }

  upsert(payload: Row | Row[], opts?: { onConflict?: string }) {
    const list = Array.isArray(payload) ? payload : [payload];
    const keys = (opts?.onConflict ?? "id").split(",").map((k) => k.trim());
    const out: Row[] = [];
    for (const p of list) {
      if (!this.acl("insert", p)) return this;
      const found = this.rows().find((r) => keys.every((k) => String(r[k]) === String(p[k])));
      if (found) {
        Object.assign(found, p);
        out.push(found);
      } else {
        const created = { id: nextId(), created_at: new Date().toISOString(), ...p };
        this.rows().push(created);
        out.push(created);
      }
    }
    this.pending = { kind: "mutate", rows: out };
    return this;
  }

  update(payload: Row) {
    if (!this.acl("update", payload)) return this;
    this.pending = { kind: "mutate", rows: [] };
    this.deferred = () => {
      const hit = this.rows().filter((r) => this.filters.every((f) => f(r)));
      for (const r of hit) Object.assign(r, payload);
      return hit;
    };
    return this;
  }

  delete() {
    if (!this.acl("delete")) return this;
    this.pending = { kind: "mutate", rows: [] };
    this.deferred = () => {
      const keep: Row[] = [];
      const gone: Row[] = [];
      for (const r of this.rows()) (this.filters.every((f) => f(r)) ? gone : keep).push(r);
      this.db.tables[this.table] = keep;
      return gone;
    };
    return this;
  }

  private deferred: (() => Row[]) | null = null;

  private resolve() {
    if (this.denied) return { data: null, error: { message: this.denied } };
    let data: Row[];
    if (this.deferred) data = this.deferred();
    else if (this.pending.kind === "mutate") data = this.pending.rows;
    else data = this.rows().filter((r) => this.filters.every((f) => f(r)));
    if (this.limitN !== null) data = data.slice(0, this.limitN);
    if (this.single) return { data: data[0] ?? null, error: null };
    return { data, error: null };
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: unknown; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.resolve()).then(onfulfilled as never, onrejected);
  }
}

export class Db {
  tables: Tables;
  constructor(seed: Tables = {}) {
    this.tables = seed;
  }
  /** RLS-as-the-member client: subject to the live `authenticated` grants. */
  member(): SupabaseLike {
    return this.clientFor("member") as SupabaseLike;
  }
  /** Service-role client: the only sanctioned writer for system-owned tables. */
  admin(): SupabaseLike {
    return this.clientFor("admin") as SupabaseLike;
  }
  private clientFor(role: "member" | "admin"): FakeClient {
    const db = this;
    return {
      role,
      from(table: string) {
        return new Query(db, table, role) as unknown as AnyBuilder;
      },
    };
  }
  rows(table: string) {
    return this.tables[table] ?? [];
  }
  one(table: string, match: Row) {
    return this.rows(table).find((r) =>
      Object.entries(match).every(([k, v]) => String(r[k]) === String(v)),
    );
  }
}

/**
 * The builder is intentionally loose: call sites pass these clients where a
 * real `SupabaseClient` is expected, and the harness only needs to satisfy the
 * query surface actually exercised.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyBuilder = any;

export type FakeClient = { role: "member" | "admin"; from(table: string): AnyBuilder };

/**
 * Call sites expect a real `SupabaseClient`. The harness satisfies only the
 * query surface, so it is handed over under a permissive alias rather than
 * casting at every call site.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SupabaseLike = any;
