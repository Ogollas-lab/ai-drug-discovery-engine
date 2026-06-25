import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Square, Sparkles, Plus, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import {
  streamChat,
  STARTER_PROMPTS,
  type ChatMessage,
  type ToolEvent,
  type ChatStreamEvent,
} from "@/lib/chat-api";
import { ToolResultCard } from "@/components/chat/ToolResultCard";
import BrandLogo from "@/components/BrandLogo";

function uid() {
  return crypto.randomUUID?.() ?? String(Date.now() + Math.random());
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    const userMsg: ChatMessage = { id: uid(), role: "user", content: trimmed };
    const assistantId = uid();
    setMessages((m) => [
      ...m,
      userMsg,
      { id: assistantId, role: "assistant", content: "", toolEvents: [], streaming: true },
    ]);
    setInput("");
    setIsStreaming(true);

    const history = [...messages, userMsg].map(({ role, content }) => ({ role, content }));
    const controller = new AbortController();
    abortRef.current = controller;

    const toolEvents: ToolEvent[] = [];

    try {
      await streamChat(
        history,
        (event: ChatStreamEvent) => {
          if (event.type === "token") {
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantId
                  ? { ...msg, content: msg.content + event.data.text }
                  : msg
              )
            );
          }
          if (event.type === "tool_start") {
            toolEvents.push({ type: "tool_start", tool: event.data.tool, input: event.data.input });
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantId ? { ...msg, toolEvents: [...toolEvents] } : msg
              )
            );
          }
          if (event.type === "tool_result") {
            const idx = toolEvents.findIndex(
              (t) => t.type === "tool_start" && t.tool === event.data.tool
            );
            if (idx >= 0) toolEvents[idx] = { type: "tool_result", tool: event.data.tool, output: event.data.output };
            else toolEvents.push({ type: "tool_result", tool: event.data.tool, output: event.data.output });
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantId ? { ...msg, toolEvents: [...toolEvents] } : msg
              )
            );
          }
          if (event.type === "error") {
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantId
                  ? { ...msg, content: msg.content || `Error: ${event.data.message}`, streaming: false }
                  : msg
              )
            );
          }
          if (event.type === "done") {
            setMessages((m) =>
              m.map((msg) => (msg.id === assistantId ? { ...msg, streaming: false } : msg))
            );
          }
        },
        controller.signal
      );
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: `Something went wrong. Is the backend running? ${(err as Error).message}`, streaming: false }
              : msg
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [messages, isStreaming]);

  const stop = () => abortRef.current?.abort();

  const newChat = () => {
    stop();
    setMessages([]);
    setInput("");
  };

  return (
    <div className="h-[100dvh] flex bg-background overflow-hidden safe-top safe-bottom">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar — Cursor-style rail */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col border-r border-border/50 glass-panel transform transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-4 border-b border-border/40">
          <BrandLogo size="sm" />
        </div>
        <div className="p-3 space-y-1">
          <button
            onClick={newChat}
            className="touch-target w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-display font-medium bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
          >
            <Plus className="w-4 h-4" /> New chat
          </button>
          <Link
            to="/workspace"
            className="touch-target w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
          >
            <MessageSquare className="w-4 h-4" /> Expert workspace
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest px-2 mb-2">
            Try asking
          </p>
          {STARTER_PROMPTS.map((s) => (
            <button
              key={s.label}
              onClick={() => { sendMessage(s.prompt); setSidebarOpen(false); }}
              disabled={isStreaming}
              className="w-full text-left px-3 py-2 mb-1 rounded-lg text-xs text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors disabled:opacity-50"
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-border/40">
          <p className="text-[9px] font-mono text-muted-foreground text-center leading-relaxed">
            Pawanax AI · Vitalis Drug Engine
            <br />
            Not for clinical use
          </p>
        </div>
      </aside>

      {/* Main chat column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="shrink-0 flex items-center gap-3 px-4 h-14 border-b border-border/40 glass-panel">
          <button
            className="lg:hidden touch-target rounded-lg text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <img src="/pawanax-logo.png" alt="" className="w-7 h-7 rounded-full ring-1 ring-primary/30 lg:hidden" />
          <div className="min-w-0">
            <h1 className="font-display text-sm font-semibold truncate">Pawanax AI</h1>
            <p className="text-[10px] font-mono text-muted-foreground truncate">Vitalis Drug Engine · Chat</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full border border-primary/20 bg-primary/5 text-[10px] font-mono text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-slow" />
              Llama 3.1
            </span>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-6 py-6">
          {messages.length === 0 ? (
            <EmptyState onPrompt={sendMessage} disabled={isStreaming} />
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg) => (
                <ChatBubble key={msg.id} message={msg} />
              ))}
            </div>
          )}
        </div>

        {/* Composer — glassmorphic bottom bar */}
        <div className="shrink-0 p-3 sm:p-4 border-t border-border/30 bg-background/80 backdrop-blur-xl">
          <div className="max-w-3xl mx-auto">
            <div className="relative rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md shadow-[0_0_40px_hsl(var(--primary)/0.06)] focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder="Ask Pawanax anything about a molecule…"
                rows={1}
                disabled={isStreaming}
                className="w-full resize-none bg-transparent px-4 pt-4 pb-12 text-sm placeholder:text-muted-foreground focus:outline-none min-h-[52px] max-h-32"
              />
              <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
                  Tools render inline ↓
                </span>
                {isStreaming ? (
                  <button
                    onClick={stop}
                    className="touch-target ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive/10 text-destructive text-xs font-mono hover:bg-destructive/20"
                  >
                    <Square className="w-3 h-3 fill-current" /> Stop
                  </button>
                ) : (
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim()}
                    className="touch-target ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-display font-semibold disabled:opacity-40 hover:bg-primary/90 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" /> Send
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onPrompt, disabled }: { onPrompt: (t: string) => void; disabled: boolean }) {
  return (
    <div className="h-full flex flex-col items-center justify-center max-w-lg mx-auto text-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <img
          src="/pawanax-logo.png"
          alt="Pawanax AI"
          className="w-16 h-16 rounded-full mx-auto ring-2 ring-primary/30 shadow-[0_0_40px_hsl(var(--primary)/0.2)]"
        />
      </motion.div>
      <h2 className="font-display text-xl sm:text-2xl font-bold text-balance mb-2">
        Discover medicine with{" "}
        <span className="text-primary">Pawanax AI</span>
      </h2>
      <p className="text-sm text-muted-foreground mb-8 text-balance leading-relaxed">
        No chemistry degree needed. Ask about any compound — I'll analyze it with real PubChem data and show interactive results right here.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
        {STARTER_PROMPTS.map((s) => (
          <button
            key={s.label}
            disabled={disabled}
            onClick={() => onPrompt(s.prompt)}
            className="touch-target px-4 py-3 rounded-xl border border-border/60 glass-panel text-left text-xs font-display hover:border-primary/30 hover:bg-primary/5 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary mb-1.5" />
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {!isUser && (
        <img src="/pawanax-logo.png" alt="" className="w-8 h-8 rounded-full ring-1 ring-primary/20 shrink-0 mt-1" />
      )}
      <div className={`flex-1 min-w-0 space-y-2 max-w-[90%] ${isUser ? "items-end flex flex-col" : ""}`}>
        {message.toolEvents?.map((ev, i) => (
          <ToolResultCard key={i} event={ev} />
        ))}
        {(message.content || message.streaming) && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              isUser
                ? "bg-primary text-primary-foreground ml-auto"
                : "glass-panel border border-border/50 text-foreground"
            }`}
          >
            {message.content || (message.streaming ? "…" : "")}
            {message.streaming && (
              <span className="inline-block w-1.5 h-4 ml-0.5 bg-primary/60 animate-pulse align-middle" />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
