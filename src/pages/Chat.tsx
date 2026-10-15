import { useState, useRef, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Square, FlaskConical, Plus, MessageSquare, RotateCcw, ArrowDown, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  streamChat,
  STARTER_PROMPTS,
  GENERAL_PROMPTS,
  type ChatMessage,
  type ToolEvent,
  type ChatStreamEvent,
} from "@/lib/chat-api";
import { friendlyChatError, CHAT_ERROR_MESSAGES } from "@/lib/chat-errors";
import { ToolResultCard } from "@/components/chat/ToolResultCard";
import { MoleculeViewer, detectSmilesInText } from "@/components/chat/MoleculeViewer";
import BrandLogo from "@/components/BrandLogo";

const STORAGE_KEY = "pawanax-chat-v1";

function uid() {
  return crypto.randomUUID?.() ?? String(Date.now() + Math.random());
}

function loadMessages(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as ChatMessage[]) : [];
    // A reply cut off by a reload is no longer streaming — mark it retryable.
    return parsed.map((m) =>
      m.streaming
        ? { ...m, streaming: false, error: m.content ? CHAT_ERROR_MESSAGES.interrupted : CHAT_ERROR_MESSAGES.interrupted }
        : m
    );
  } catch {
    return [];
  }
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Persist conversation (skip while tokens stream to avoid heavy writes).
  useEffect(() => {
    if (isStreaming) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch { /* storage full or blocked */ }
  }, [messages, isStreaming]);

  // Auto-scroll only when the user is already near the bottom.
  useEffect(() => {
    if (!atBottom) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, atBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
  };

  const jumpToLatest = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    setAtBottom(true);
  };

  const patch = (id: string, fn: (m: ChatMessage) => ChatMessage) =>
    setMessages((all) => all.map((m) => (m.id === id ? fn(m) : m)));

  /** Stream an assistant reply for the conversation ending with `userMsg`. */
  const runAssistant = useCallback(async (history: ChatMessage[], userMsg: ChatMessage) => {
    busyRef.current = true;
    setIsStreaming(true);
    setAtBottom(true);
    const assistantId = uid();
    setMessages([...history, { id: assistantId, role: "assistant", content: "", toolEvents: [], streaming: true }]);

    const controller = new AbortController();
    abortRef.current = controller;
    const toolEvents: ToolEvent[] = [];
    let gotText = false;
    let finished = false;
    let streamError: string | null = null;

    const fail = (raw: string) => {
      if (import.meta.env.DEV) console.error("[Pawanax chat] failure:", raw);
      const friendly = friendlyChatError(raw);
      patch(assistantId, (m) => ({ ...m, streaming: false, error: friendly, retryFor: userMsg.id }));
      setInput((cur) => (cur.trim() ? cur : userMsg.content));
    };

    try {
      await streamChat(
        history.filter((m) => !m.error || m.content).map(({ role, content }) => ({ role, content })),
        (event: ChatStreamEvent) => {
          switch (event.type) {
            case "token":
              if (typeof event.data?.text !== "string") return;
              gotText = gotText || event.data.text.length > 0;
              patch(assistantId, (m) => ({ ...m, content: m.content + event.data.text }));
              break;
            case "tool_start":
              toolEvents.push({ type: "tool_start", tool: event.data.tool, input: event.data.input });
              patch(assistantId, (m) => ({ ...m, toolEvents: [...toolEvents] }));
              break;
            case "tool_result": {
              const idx = toolEvents.findIndex((t) => t.type === "tool_start" && t.tool === event.data.tool);
              const ev: ToolEvent = { type: "tool_result", tool: event.data.tool, output: event.data.output };
              if (idx >= 0) toolEvents[idx] = ev;
              else toolEvents.push(ev);
              patch(assistantId, (m) => ({ ...m, toolEvents: [...toolEvents] }));
              break;
            }
            case "error":
              streamError = event.data?.message || "error";
              break;
            case "done":
              finished = true;
              break;
          }
        },
        controller.signal
      );

      if (streamError) fail(streamError);
      else if (!gotText && toolEvents.length === 0) fail("empty");
      else if (!finished) fail("interrupted");
      else patch(assistantId, (m) => ({ ...m, streaming: false }));
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        patch(assistantId, (m) => ({ ...m, streaming: false }));
      } else {
        fail((err as Error).message || String(err));
      }
    } finally {
      busyRef.current = false;
      setIsStreaming(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }, []);

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busyRef.current) return;
    const userMsg: ChatMessage = { id: uid(), role: "user", content: trimmed };
    setInput("");
    runAssistant([...messagesRef.current, userMsg], userMsg);
  }, [runAssistant]);

  const retry = useCallback((assistantId: string) => {
    if (busyRef.current) return;
    const all = messagesRef.current;
    const failed = all.find((m) => m.id === assistantId);
    const userIdx = all.findIndex((m) => m.id === failed?.retryFor);
    if (userIdx < 0) return;
    const userMsg = all[userIdx];
    // Resend without duplicating: drop the failed reply (and anything after it).
    const history = all.slice(0, userIdx + 1);
    if (input.trim() === userMsg.content) setInput("");
    runAssistant(history, userMsg);
  }, [runAssistant, input]);

  const stop = () => abortRef.current?.abort();

  // Live 2D structure preview when the input contains a SMILES string.
  const previewSmiles = detectSmilesInText(input);

  const newChat = () => {
    stop();
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  };

  return (
    <div className="h-[100dvh] flex bg-background overflow-hidden safe-top safe-bottom">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <aside
        aria-label="Chat navigation"
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
            className="touch-target w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-display font-medium bg-primary/10 text-primary hover:bg-primary/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Plus className="w-4 h-4" aria-hidden /> New chat
          </button>
          <Link
            to="/workspace"
            className="touch-target w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <MessageSquare className="w-4 h-4" aria-hidden /> Expert workspace
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest px-2 mb-2">Try asking</p>
          {STARTER_PROMPTS.map((s) => (
            <button
              key={s.label}
              onClick={() => { sendMessage(s.prompt); setSidebarOpen(false); }}
              disabled={isStreaming}
              className="w-full text-left px-3 py-2 mb-1 rounded-lg text-xs text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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

      <div className="flex-1 flex flex-col min-w-0">
        <header className="shrink-0 flex items-center gap-3 px-4 h-14 border-b border-border/40 glass-panel">
          <button
            className="lg:hidden touch-target rounded-lg text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
        </header>

        <div className="relative flex-1 min-h-0">
          <div
            ref={scrollRef}
            onScroll={onScroll}
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label="Conversation"
            className="h-full overflow-y-auto overflow-x-hidden overscroll-contain px-3 sm:px-6 py-6"
          >
            {messages.length === 0 ? (
              <EmptyState onPrompt={sendMessage} disabled={isStreaming} />
            ) : (
              <div className="max-w-3xl mx-auto space-y-6">
                {messages.map((msg) => (
                  <ChatBubble key={msg.id} message={msg} onRetry={retry} retryDisabled={isStreaming} />
                ))}
              </div>
            )}
          </div>

          <AnimatePresence>
            {!atBottom && messages.length > 0 && (
              <motion.button
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                onClick={jumpToLatest}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/60 bg-card/90 backdrop-blur text-xs font-mono text-foreground shadow-lg hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <ArrowDown className="w-3.5 h-3.5" aria-hidden /> Jump to latest
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <p className="sr-only" role="status" aria-live="polite">
          {isStreaming ? "Pawanax AI is responding" : ""}
        </p>

        <div className="shrink-0 p-3 sm:p-4 border-t border-border/30 bg-background/80 backdrop-blur-xl">
          <AnimatePresence>
            {previewSmiles && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="max-w-3xl mx-auto mb-3 flex items-center gap-3 rounded-2xl border border-primary/25 bg-card/70 p-3"
              >
                <MoleculeViewer smiles={previewSmiles} size={110} />
                <div className="min-w-0">
                  <p className="text-[10px] font-mono text-primary uppercase tracking-widest mb-1">Structure preview</p>
                  <p className="text-[10px] font-mono text-muted-foreground break-all">{previewSmiles}</p>
                  <p className="text-[9px] text-muted-foreground mt-1">Send to analyze this molecule</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <form
            className="max-w-3xl mx-auto"
            onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          >
            <div className="relative rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md shadow-[0_0_40px_hsl(var(--primary)/0.06)] focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
              <label htmlFor="chat-input" className="sr-only">Message Pawanax AI</label>
              <textarea
                id="chat-input"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder="Ask Pawanax anything…"
                rows={1}
                className="w-full resize-none bg-transparent px-4 pt-4 pb-12 text-sm placeholder:text-muted-foreground focus:outline-none min-h-[52px] max-h-40"
              />
              <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
                  Enter to send · Shift+Enter for new line
                </span>
                {isStreaming ? (
                  <button
                    type="button"
                    onClick={stop}
                    aria-label="Stop generating"
                    className="touch-target ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive/10 text-destructive text-xs font-mono hover:bg-destructive/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                  >
                    <Square className="w-3 h-3 fill-current" aria-hidden /> Stop
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    aria-label="Send message"
                    className="touch-target ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-display font-semibold disabled:opacity-40 hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <Send className="w-3.5 h-3.5" aria-hidden /> Send
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onPrompt, disabled }: { onPrompt: (t: string) => void; disabled: boolean }) {
  return (
    <div className="h-full flex flex-col items-center justify-center max-w-lg mx-auto text-center px-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <img
          src="/pawanax-logo.png"
          alt="Pawanax AI"
          className="w-16 h-16 rounded-full mx-auto ring-2 ring-primary/30 shadow-[0_0_40px_hsl(var(--primary)/0.2)]"
        />
      </motion.div>
      <h2 className="font-display text-xl sm:text-2xl font-bold text-balance mb-2">
        Hi, I'm <span className="text-primary">Pawanax AI</span>
      </h2>
      <p className="text-sm text-muted-foreground mb-8 text-balance leading-relaxed">
        Ask me to explain ideas, draft writing, plan projects — or analyze any molecule with real PubChem data shown right here.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
        {GENERAL_PROMPTS.map((p) => (
          <button
            key={p}
            disabled={disabled}
            onClick={() => onPrompt(p)}
            className="touch-target px-4 py-3 rounded-xl border border-border/60 glass-panel text-left text-xs font-display hover:border-primary/30 hover:bg-primary/5 transition-all disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {p}
          </button>
        ))}
        {STARTER_PROMPTS.slice(0, 2).map((s) => (
          <button
            key={s.label}
            disabled={disabled}
            onClick={() => onPrompt(s.prompt)}
            className="touch-target px-4 py-3 rounded-xl border border-border/60 glass-panel text-left text-xs font-display hover:border-primary/30 hover:bg-primary/5 transition-all disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <FlaskConical className="w-3.5 h-3.5 text-primary mb-1.5" aria-hidden />
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const Markdown = memo(function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: (p) => <h3 className="font-display text-base font-bold mt-3 mb-1.5" {...p} />,
        h2: (p) => <h3 className="font-display text-base font-semibold mt-3 mb-1.5" {...p} />,
        h3: (p) => <h4 className="font-display text-sm font-semibold mt-3 mb-1" {...p} />,
        p: (p) => <p className="mb-2 last:mb-0" {...p} />,
        ul: (p) => <ul className="list-disc pl-5 mb-2 space-y-1" {...p} />,
        ol: (p) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...p} />,
        a: (p) => <a className="text-primary underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...p} />,
        pre: (p) => <pre className="my-2 p-3 rounded-lg bg-secondary/60 overflow-x-auto text-xs font-mono" {...p} />,
        code: ({ className, ...p }) => (
          <code className={`font-mono text-[0.85em] ${className ? "" : "px-1 py-0.5 rounded bg-secondary/60"}`} {...p} />
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
});

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-label="Pawanax AI is thinking">
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </span>
      Pawanax is thinking…
    </div>
  );
}

const ChatBubble = memo(function ChatBubble({
  message, onRetry, retryDisabled,
}: { message: ChatMessage; onRetry: (id: string) => void; retryDisabled: boolean }) {
  const isUser = message.role === "user";
  const waiting = message.streaming && !message.content && !message.toolEvents?.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {!isUser && (
        <img src="/pawanax-logo.png" alt="" className="w-8 h-8 rounded-full ring-1 ring-primary/20 shrink-0 mt-1" />
      )}
      <div className={`min-w-0 space-y-2 ${isUser ? "max-w-[85%] items-end flex flex-col" : "flex-1 max-w-[90%]"}`}>
        <span className="sr-only">{isUser ? "You said:" : "Pawanax AI:"}</span>
        {message.toolEvents?.map((ev, i) => <ToolResultCard key={i} event={ev} />)}
        {waiting && (
          <div className="rounded-2xl px-4 py-3 glass-panel border border-border/50 w-fit">
            <TypingIndicator />
          </div>
        )}
        {message.content && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm leading-relaxed break-words ${
              isUser
                ? "bg-primary text-primary-foreground ml-auto whitespace-pre-wrap"
                : "glass-panel border border-border/50 text-foreground"
            }`}
          >
            {isUser ? message.content : <Markdown text={message.content} />}
            {message.streaming && (
              <span className="inline-block w-1.5 h-4 ml-0.5 bg-primary/60 animate-pulse align-middle" aria-hidden />
            )}
          </div>
        )}
        {message.error && (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 text-sm border border-destructive/40 bg-destructive/10 text-foreground">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" aria-hidden />
            <span className="flex-1 min-w-0">{message.error}</span>
            {message.retryFor && (
              <button
                onClick={() => onRetry(message.id)}
                disabled={retryDisabled}
                className="touch-target flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-display font-semibold hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden /> Retry
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});
