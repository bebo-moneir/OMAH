import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, X, Bot, User, Loader2, BrainCircuit, FileText, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useLang } from "@/lib/providers";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS_EN = [
  { icon: FileText, label: "Summarize a topic", prompt: "Summarize the key ideas of HACCP in 5 bullet points." },
  { icon: BrainCircuit, label: "Mind map", prompt: "Build a mind map for Molecular Biology (DNA, RNA, protein synthesis)." },
  { icon: MessageSquare, label: "Explain simply", prompt: "Explain fermentation like I'm 15." },
];
const SUGGESTIONS_AR = [
  { icon: FileText, label: "لخّص موضوعًا", prompt: "لخّص أهم أفكار نظام الهاسب في 5 نقاط." },
  { icon: BrainCircuit, label: "خريطة ذهنية", prompt: "اعمل لي خريطة ذهنية للبيولوجيا الجزيئية (DNA و RNA وتصنيع البروتين)." },
  { icon: MessageSquare, label: "اشرح ببساطة", prompt: "اشرح لي التخمير كأنني في الخامسة عشر من عمري." },
];

export function SolyChat() {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 150); }, [open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/soly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (res.status === 429) throw new Error(lang === "ar" ? "محاولات كثيرة، انتظر قليلاً." : "Too many requests, please wait.");
      if (res.status === 402) throw new Error(lang === "ar" ? "نفدت رصيد الذكاء الاصطناعي." : "AI credits exhausted.");
      if (!res.ok) throw new Error(lang === "ar" ? "خطأ في الاتصال بسولي." : "Soly is unavailable.");
      const data = (await res.json()) as { content: string };
      setMessages([...next, { role: "assistant", content: data.content || "…" }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
      setMessages(next);
    } finally { setBusy(false); }
  }

  const suggestions = lang === "ar" ? SUGGESTIONS_AR : SUGGESTIONS_EN;

  return (
    <>
      {/* Floating trigger */}
      <motion.button
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((v) => !v)}
        aria-label="Soly AI"
        className="fixed bottom-5 end-5 z-[60] h-14 w-14 rounded-full shadow-2xl grid place-items-center text-white"
        style={{ background: "linear-gradient(135deg, hsl(260 90% 60%), hsl(200 90% 55%))" }}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="h-6 w-6" />
            </motion.div>
          ) : (
            <motion.div key="s" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <Sparkles className="h-6 w-6" />
            </motion.div>
          )}
        </AnimatePresence>
        {!open && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ background: "hsl(260 90% 60%)" }} />
        )}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
            className="fixed bottom-24 end-5 z-[59] w-[min(420px,calc(100vw-2.5rem))] h-[min(640px,calc(100vh-8rem))] glass-strong rounded-3xl shadow-2xl border border-border/60 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border/50" style={{ background: "linear-gradient(135deg, hsl(260 90% 60% / 0.15), hsl(200 90% 55% / 0.10))" }}>
              <div className="h-10 w-10 rounded-2xl grid place-items-center text-white" style={{ background: "linear-gradient(135deg, hsl(260 90% 60%), hsl(200 90% 55%))" }}>
                <Bot className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold font-display">Soly</div>
                <div className="text-xs text-muted-foreground">
                  {lang === "ar" ? "مساعدك الدراسي بالذكاء الاصطناعي" : "Your AI study companion"}
                </div>
              </div>
              {messages.length > 0 && (
                <Button size="sm" variant="ghost" onClick={() => setMessages([])} className="text-xs">
                  {lang === "ar" ? "مسح" : "Clear"}
                </Button>
              )}
            </div>

            {/* Messages */}
            <div ref={scrollerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <Sparkles className="h-10 w-10 mx-auto text-primary/70" />
                  <h3 className="mt-3 font-semibold font-display text-lg">
                    {lang === "ar" ? "أهلاً! أنا سولي 👋" : "Hi! I'm Soly 👋"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                    {lang === "ar"
                      ? "اسألني عن أي مادة، أو خليني ألخصلك محاضرة أو أعمل خريطة ذهنية."
                      : "Ask me about any topic, or let me summarize a lecture or build a mind map."}
                  </p>
                  <div className="mt-5 grid gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s.label}
                        onClick={() => send(s.prompt)}
                        className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-background/40 hover:bg-background/70 px-3 py-2.5 text-start text-sm transition"
                      >
                        <s.icon className="h-4 w-4 text-primary shrink-0" />
                        <span className="flex-1 truncate">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div className={`h-8 w-8 rounded-full grid place-items-center shrink-0 ${
                    m.role === "user" ? "bg-primary text-primary-foreground" : "text-white"
                  }`} style={m.role === "assistant" ? { background: "linear-gradient(135deg, hsl(260 90% 60%), hsl(200 90% 55%))" } : undefined}>
                    {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/60"
                  }`}>
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:mt-2 prose-headings:mb-1 prose-ul:my-1 prose-ol:my-1 prose-pre:my-2">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    )}
                  </div>
                </motion.div>
              ))}
              {busy && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5">
                  <div className="h-8 w-8 rounded-full grid place-items-center text-white shrink-0" style={{ background: "linear-gradient(135deg, hsl(260 90% 60%), hsl(200 90% 55%))" }}>
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-muted/60 rounded-2xl px-3.5 py-2.5 text-sm inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="text-muted-foreground">{lang === "ar" ? "سولي يفكر…" : "Soly is thinking…"}</span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Composer */}
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="p-3 border-t border-border/50 flex items-end gap-2"
            >
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
                }}
                rows={1}
                dir={lang === "ar" ? "rtl" : "ltr"}
                placeholder={lang === "ar" ? "اكتب سؤالك لسولي…" : "Ask Soly anything…"}
                className="min-h-[42px] max-h-32 resize-none rounded-xl"
              />
              <Button type="submit" size="icon" disabled={busy || !input.trim()} className="h-[42px] w-[42px] shrink-0 rounded-xl">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 rtl-flip" />}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
