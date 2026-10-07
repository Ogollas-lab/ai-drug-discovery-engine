import { describe, it, expect } from "vitest";
import { classifyChatError } from "@/lib/chat-errors";

describe("classifyChatError", () => {
  it("network", () => expect(classifyChatError("TypeError: Failed to fetch")).toBe("network"));
  it("rate limit", () => expect(classifyChatError("Chat failed (429)")).toBe("rate_limit"));
  it("credits", () => expect(classifyChatError("Chat failed (402)")).toBe("credits"));
  it("auth", () => expect(classifyChatError("Chat failed (401)")).toBe("auth"));
  it("timeout", () => expect(classifyChatError("Chat failed (504)")).toBe("timeout"));
  it("empty", () => expect(classifyChatError("empty")).toBe("empty"));
  it("fallback", () => expect(classifyChatError("Chat failed (500)")).toBe("unavailable"));
});
