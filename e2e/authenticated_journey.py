"""Athena V1 authenticated journey scaffolding (BR-01 / BR-02).

Consumes the A-28 journey-spine data-testid hooks. Read-only by default: it walks
surfaces and records presence/state. Destructive controls (export, deletion,
sign-out-everywhere) are located and asserted reachable but never confirmed.

Requires authenticated test identities; exits 2 when they are unavailable so the
run can never be mistaken for a pass.
"""

import asyncio
import os
import sys

BASE = os.environ.get("BASE_URL", "http://localhost:8080")


def creds(slot: str):
    return (
        os.environ.get(f"ATHENA_MEMBER_{slot}_EMAIL"),
        os.environ.get(f"ATHENA_MEMBER_{slot}_PASSWORD"),
    )


async def sign_in(page, email: str, password: str) -> None:
    await page.goto(f"{BASE}/auth", wait_until="domcontentloaded")
    await page.get_by_label("Email", exact=False).fill(email)
    await page.get_by_label("Password", exact=False).fill(password)
    await page.get_by_role("button", name="Continue").click()
    await page.wait_for_url(f"{BASE}/home", timeout=20000)


async def walk(page, results: dict) -> None:
    spine = [
        ("today", "/home", "today-screen"),
        ("athena", "/athena", "athena-screen"),
        ("living-profile", "/profile", "profile-screen"),
        ("understanding", "/understanding", "understanding-screen"),
        ("correction", "/profile/review", "profile-review-screen"),
        ("membership", "/membership", "membership-screen"),
        ("meet", "/introductions", "introductions-screen"),
        ("connections", "/connections", "connections-screen"),
        ("messages", "/messages", "messages-screen"),
    ]
    for name, path, testid in spine:
        await page.goto(f"{BASE}{path}", wait_until="domcontentloaded")
        loc = page.get_by_test_id(testid)
        results[name] = await loc.count() > 0

    await page.goto(f"{BASE}/athena", wait_until="domcontentloaded")
    transcript = page.get_by_test_id("athena-transcript")
    results["athena_state"] = (
        await transcript.get_attribute("data-conversation-state")
        if await transcript.count()
        else None
    )

    await page.goto(f"{BASE}/profile", wait_until="domcontentloaded")
    results["pause_control"] = await page.get_by_test_id("profile-pause-toggle").count() > 0
    for hook in ("privacy-export", "privacy-delete-account", "privacy-sign-out-everywhere"):
        results[hook] = await page.get_by_test_id(hook).count() > 0

    for name, hook in (
        ("relationship_focus", "relationship-focus"),
        ("ending_choice", "ending-choice"),
        ("reflection", "reflection-flow"),
    ):
        await page.goto(f"{BASE}/connections", wait_until="domcontentloaded")
        results[name] = await page.get_by_test_id(hook).count() > 0


async def main() -> int:
    a_email, a_pass = creds("A")
    if not (a_email and a_pass):
        print("Identities unavailable: BR-01 remains OPEN. Not a pass.")
        return 2

    from playwright.async_api import async_playwright

    results: dict = {}
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 390, "height": 844})
        page = await ctx.new_page()
        await sign_in(page, a_email, a_pass)
        await walk(page, results)

        b_email, b_pass = creds("B")
        if b_email and b_pass:
            ctx_b = await browser.new_context(viewport={"width": 390, "height": 844})
            page_b = await ctx_b.new_page()
            await sign_in(page_b, b_email, b_pass)
            await walk(page_b, results.setdefault("member_b", {}))
            results["two_member_ready"] = True
        else:
            results["two_member_ready"] = False
            print("Second identity unavailable: BR-02 remains OPEN.")
        await browser.close()

    for k, v in results.items():
        print(f"{k}: {v}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
