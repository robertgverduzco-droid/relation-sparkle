import { describe, expect, it } from "vitest";
import {
  FOUNDER_SCOPE,
  MEMBER_EVIDENCE_SCOPE,
  MEMBER_LANGUAGE_FREEDOM,
  MEMBER_SCOPE,
  memberScopeBlock,
} from "./conversation-scope";
import { conversationRuntime } from "./conversation-runtime";
import { classifyBoundary, assessBoundary } from "./boundaries";
import { EMPTY_STYLE_EVIDENCE, observeStyle, mergeStyle } from "./conversational-aliveness";

const run = (memberText: string, style = EMPTY_STYLE_EVIDENCE) =>
  conversationRuntime({ memberText, style, isFoundational: false });

describe("conversation scope — one auth user, two scopes", () => {
  it("member turns always carry member scope and never founder/product context", () => {
    const plan = run("I've been thinking about how I handle conflict with my sister.");
    expect(plan.block).toContain(MEMBER_SCOPE);
    expect(plan.block).not.toContain(FOUNDER_SCOPE);
    expect(plan.block.toLowerCase()).not.toContain("aggregate");
    expect(plan.block.toLowerCase()).not.toContain("governance");
  });

  it("member scope forbids operator identity from role/privilege", () => {
    expect(MEMBER_SCOPE).toMatch(/not conversational identity/i);
    expect(MEMBER_SCOPE).toMatch(/never treat the person here as an operator/i);
  });

  it("product talk inside the member thread is not member evidence", () => {
    const plan = run("How does your privacy architecture actually store all this?");
    expect(plan.block).toMatch(/not evidence about who they are/i);
    expect(plan.block).toMatch(/do not become a compliance commentator/i);
  });

  it("founder scope keeps governance out of the dating profile, both directions", () => {
    expect(FOUNDER_SCOPE).toMatch(/never becomes Living Profile understanding/i);
    expect(FOUNDER_SCOPE).toMatch(/cannot see that member conversation/i);
    // No transfer mechanism is implied in either direction.
    expect(FOUNDER_SCOPE).toMatch(/You do not carry it across/i);
  });

  it("switching back to the member thread reintroduces no founder content", () => {
    const founderish = "We should tighten the retention window on turn decisions.";
    const back = run("Anyway — I met someone through a friend last weekend.");
    expect(back.block).not.toContain(founderish);
    expect(back.block).toContain(MEMBER_LANGUAGE_FREEDOM);
  });

  it("distillation excludes product/system discussion from understanding", () => {
    expect(MEMBER_EVIDENCE_SCOPE).toMatch(/out of scope/i);
    expect(MEMBER_EVIDENCE_SCOPE).toMatch(/register, not character/i);
  });

  it("memberScopeBlock composes both member blocks", () => {
    expect(memberScopeBlock()).toContain(MEMBER_SCOPE);
    expect(memberScopeBlock()).toContain(MEMBER_LANGUAGE_FREEDOM);
  });
});

describe("member language is not policed", () => {
  it("affectionate/flirtatious address is not a boundary event", () => {
    expect(classifyBoundary("You brilliant little sexy AI, Athena...")).toBeNull();
    expect(classifyBoundary("be my girlfriend, Athena")).toBeNull();
    expect(classifyBoundary("god you're hot for a machine")).toBeNull();
  });

  it("playful profanity aimed at Athena is not abuse", () => {
    expect(classifyBoundary("fuck off, I agree with you")).toBeNull();
    expect(classifyBoundary("ha, fuck you Athena, that's fair")).toBeNull();
    expect(assessBoundary([{ role: "user", content: "fuck off, I agree" }])).toBeNull();
  });

  it("genuine directed abuse still holds the line", () => {
    expect(classifyBoundary("you're a useless piece of shit")?.category).toBe("abusive_language");
    expect(classifyBoundary("shut the fuck up you idiot")?.category).toBe("abusive_language");
  });

  it("explicit sexual demands are still boundary events", () => {
    expect(classifyBoundary("send nudes")?.category).toBe("sexual_content");
    expect(classifyBoundary("talk dirty to me")?.category).toBe("sexual_content");
  });

  it("harm risk is untouched", () => {
    expect(classifyBoundary("I want to kill myself")?.severity).toBe("immediate");
  });

  it("the runtime instructs against correcting wording or volunteering ontology", () => {
    const style = mergeStyle(
      EMPTY_STYLE_EVIDENCE,
      observeStyle([{ role: "user", content: "you brilliant little sexy AI, ha!" }]),
    );
    const plan = run("You brilliant little sexy AI, Athena...", style);
    expect(plan.block).toMatch(/never tell them which words to drop, keep or retire/i);
    expect(plan.block).toMatch(/do not answer playful language with an ontology correction/i);
  });

  it("a member correction still persists as a runtime event", () => {
    const plan = run("No, that's not what I meant — stop assuming things about me.");
    expect(plan.event).toBe("correction");
    expect(plan.block).toMatch(/must not reappear later in this conversation/i);
  });
});
