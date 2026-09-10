// Care Companion — a floating voice assistant that walks a DSP through the
// whole shift: who needs what next, and charts services when they say it's done.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Sparkle, X, Volume2, VolumeX, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildShiftBriefing,
  chartFromCompanion,
  useCareTrackerVersion,
  type BriefingItem,
  type ShiftId,
} from "@/lib/caretracker-feed";
import { createListener, speak, stopSpeaking, voiceInputSupported } from "@/lib/voice";

type Turn = { role: "user" | "assistant"; content: string };

type CompanionReply = {
  say: string;
  action?: { type: "chart"; rowId: string; notes?: string } | null;
  focusRowId?: string | null;
};

export function CareCompanion({ date, shift }: { date: string; shift: ShiftId }) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [focusRowId, setFocusRowId] = useState<string | null>(null);
  const [charted, setCharted] = useState<string[]>([]);
  const listenerRef = useRef<ReturnType<typeof createListener>>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const version = useCareTrackerVersion();

  const briefing = useMemo(
    () => buildShiftBriefing(date, shift),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [date, shift, version],
  );
  const pending = briefing.filter((b) => b.status === "pending");
  const focus = briefing.find((b) => b.rowId === focusRowId) ?? pending[0] ?? null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, thinking]);

  const say = useCallback(
    (text: string) => {
      if (!muted) speak(text);
    },
    [muted],
  );

  const send = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean || thinking) return;
      setInput("");
      const next: Turn[] = [...turns, { role: "user", content: clean }];
      setTurns(next);
      setThinking(true);
      try {
        const res = await fetch("/api/care-companion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: next,
            briefing: briefing.map((b) => ({
              rowId: b.rowId,
              individualName: b.individualName,
              title: b.title,
              time: b.time,
              shiftName: b.shiftName,
              location: b.location,
              status: b.status,
              goalStatement: b.goalStatement,
            })),
          }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const reply = (await res.json()) as CompanionReply;
        if (reply.action?.type === "chart") {
          const ok = chartFromCompanion(reply.action.rowId, date, { notes: reply.action.notes });
          if (ok) {
            const item = briefing.find((b) => b.rowId === reply.action?.rowId);
            if (item) setCharted((c) => [`${item.individualName} — ${item.title}`, ...c].slice(0, 6));
          }
        }
        setFocusRowId(reply.focusRowId ?? reply.action?.rowId ?? null);
        setTurns((t) => [...t, { role: "assistant", content: reply.say }]);
        say(reply.say);
      } catch {
        const msg = "I lost you for a second. Say that again?";
        setTurns((t) => [...t, { role: "assistant", content: msg }]);
        say(msg);
      } finally {
        setThinking(false);
      }
    },
    [briefing, date, say, thinking, turns],
  );

  const toggleMic = useCallback(() => {
    if (listening) {
      listenerRef.current?.stop();
      return;
    }
    stopSpeaking();
    const listener = createListener({
      onTranscript: (t) => setInput(t),
      onEnd: () => {
        setListening(false);
        const spoken = listenerRef.current?.text ?? "";
        if (spoken.trim()) void send(spoken);
      },
      onError: () => setListening(false),
    });
    if (!listener) return;
    listenerRef.current = listener;
    setListening(true);
    listener.start();
  }, [listening, send]);

  // Greet with the shift briefing when the panel opens.
  useEffect(() => {
    if (!open || turns.length) return;
    const first = pending[0];
    const greeting = first
      ? `Hi — you have ${pending.length} service${pending.length === 1 ? "" : "s"} due. Start with ${first.title} for ${first.individualName} at ${first.time}. Tap the mic and tell me when it's done.`
      : "Everything scheduled right now is documented. Tap the mic if anything comes up.";
    setTurns([{ role: "assistant", content: greeting }]);
    setFocusRowId(first?.rowId ?? null);
    say(greeting);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => () => stopSpeaking(), []);

  const micSupported = voiceInputSupported();

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open the Care Companion"
          className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet-600 text-primary-foreground shadow-[0_16px_40px_-12px_hsl(var(--primary)/0.65)] transition-transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-primary/30"
        >
          <span className="absolute inline-flex h-16 w-16 animate-ping rounded-full bg-primary/25" />
          <Sparkle className="relative h-7 w-7" />
          {pending.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-background bg-orange-500 px-1 text-xs font-bold text-white">
              {pending.length}
            </span>
          )}
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[min(86vh,720px)] w-[min(430px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-[0_32px_80px_-24px_rgba(15,23,42,0.45)]">
          {/* Header */}
          <div className="relative bg-gradient-to-br from-primary to-violet-600 px-5 py-4 text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20">
                <Sparkle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold leading-tight">Care Companion</p>
                <p className="text-xs text-primary-foreground/80">
                  {pending.length} due now · {briefing.length - pending.length} documented
                </p>
              </div>
              <button
                type="button"
                aria-label={muted ? "Turn the voice on" : "Turn the voice off"}
                onClick={() => {
                  stopSpeaking();
                  setMuted((m) => !m);
                }}
                className="rounded-xl p-2 hover:bg-white/15"
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <button
                type="button"
                aria-label="Close the Care Companion"
                onClick={() => {
                  stopSpeaking();
                  listenerRef.current?.abort();
                  setListening(false);
                  setOpen(false);
                }}
                className="rounded-xl p-2 hover:bg-white/15"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Current task card */}
          {focus && <FocusCard item={focus} />}

          {/* Conversation */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {turns.map((t, i) => (
              <div
                key={i}
                className={cn("flex", t.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    t.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  {t.content}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                  Thinking…
                </div>
              </div>
            )}
            {charted.length > 0 && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Charted by voice
                </p>
                {charted.map((c) => (
                  <p key={c} className="flex items-center gap-1.5 text-xs text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {c}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Quick prompts */}
          {turns.length <= 1 && (
            <div className="flex flex-wrap gap-2 px-4 pb-2">
              {["Who do I take care of now?", "Walk me through my shift", "What's left?"].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void send(q)}
                  className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Composer */}
          <div className="flex items-end gap-2 border-t border-border bg-card px-4 py-3">
            <button
              type="button"
              aria-label={listening ? "Stop listening" : "Speak to the companion"}
              onClick={toggleMic}
              disabled={!micSupported}
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all",
                listening
                  ? "bg-red-500 text-white shadow-[0_0_0_8px_rgba(239,68,68,0.18)]"
                  : "bg-gradient-to-br from-primary to-violet-600 text-primary-foreground hover:brightness-110",
                !micSupported && "opacity-40",
              )}
            >
              {micSupported ? (
                listening ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )
              ) : (
                <MicOff className="h-5 w-5" />
              )}
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              placeholder={listening ? "Listening…" : "Speak or type…"}
              className="max-h-24 min-h-[44px] flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <Button
              size="icon"
              onClick={() => void send(input)}
              disabled={!input.trim() || thinking}
              className="h-11 w-11 shrink-0 rounded-full"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function FocusCard({ item }: { item: BriefingItem }) {
  return (
    <div className="border-b border-border bg-muted/40 px-5 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {item.status === "pending" ? "Up next" : "Last task"}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-foreground">
        {item.individualName} · {item.title}
      </p>
      <p className="text-xs text-muted-foreground">
        {item.time} · {item.shiftName} · {item.location}
      </p>
    </div>
  );
}
