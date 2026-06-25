import { describe, it, expect } from "vitest";

describe("chat-api", () => {
  it("exports streamChat and starter prompts", async () => {
    const mod = await import("@/lib/chat-api");
    expect(mod.streamChat).toBeTypeOf("function");
    expect(mod.STARTER_PROMPTS.length).toBeGreaterThan(0);
  });
});

describe("Chat page", () => {
  it("exports default Chat component", async () => {
    const mod = await import("@/pages/Chat");
    expect(mod.default).toBeTypeOf("function");
  });
});
