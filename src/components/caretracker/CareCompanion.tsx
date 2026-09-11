// Care Companion — a full-screen, voice-first assistant that walks a DSP
// through the shift: who needs what next, and charts services when they say
// it's done. Opened from the "AI Companion" button on the Care Tracker header.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, X, Volume2, VolumeX, Send, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { VoicePoweredOrb } from "@/components/ui/voice-powered-orb";
import {
  buildShiftBriefing,
  chartFromCompanion,
  useCareTrackerVersion,
  CURRENT_CAREGIVER,
  shiftGreeting,
  type BriefingItem,
  type ShiftId,
} from "@/lib/caretracker-feed";
import { createListener, speak, stopSpeaking, voiceInputSupported } from "@/lib/voice";

type Turn = { role: "user" | "assistant"; content: string };

type CompanionAction =
  | { type: "chart"; rowId: string; notes?: string }
  | { type: "summary" }
  | { type: "commit" };

type CompanionReply = {
  say: string;
  action?: CompanionAction | null;
  focusRowId?: string | null;
};

type StagedItem = { rowId: string; individualName: string; title: string; notes?: string };

export function CareCompanion({
  date,
  shift,
  open,
  onClose,
}: {
  date: string;
  shift: ShiftId;
  open: boolean;
  onClose: () => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
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

  const sendRef = useRef<(text: string) => void>(() => {});
  const handsFreeRef = useRef(true);
  const [handsFree, setHandsFree] = useState(true);
  handsFreeRef.current = handsFree;

  // Open the mic and keep it open until the caregiver stops talking.
  const startListening = useCallback(() => {
    if (!voiceInputSupported()) return;
    listenerRef.current?.abort();
    const listener = createListener({
      onTranscript: (t) => setInput(t),
      onEnd: () => {
        setListening(false);
        const spoken = listenerRef.current?.text ?? "";
        if (spoken.trim()) sendRef.current(spoken);
        else if (handsFreeRef.current) setTimeout(() => startListening(), 400);
      },
      onError: () => setListening(false),
    });
    if (!listener) return;
    listenerRef.current = listener;
    setListening(true);
    try {
      listener.start();
    } catch {
      setListening(false);
    }
  }, []);

  const say = useCallback(
    (text: string) => {
      if (muted) {
        if (handsFreeRef.current) startListening();
        return;
      }
      setSpeaking(true);
      speak(text, () => {
        setSpeaking(false);
        if (handsFreeRef.current) setTimeout(() => startListening(), 250);
      });
    },
    [muted, startListening],
  );

  const send = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean || thinking) return;
      listenerRef.current?.abort();
      setListening(false);
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
            caregiver: CURRENT_CAREGIVER,
            greeting: shiftGreeting(),
            briefing: briefing.map((b) => ({
              rowId: b.rowId,
              individualName: b.individualName,
              title: b.title,
              time: b.time,
              shiftName: b.shiftName,
              location: b.location,
              status: b.status,
              servicesProvided: b.servicesProvided,
              prompts: b.prompts,
              description: b.description,
              protocol: b.protocol,
              goalStatement: b.goalStatement,
              outcomeStatement: b.outcomeStatement,
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

  useEffect(() => {
    sendRef.current = (t: string) => void send(t);
  }, [send]);

  // Mic button pauses / resumes the hands-free conversation.
  const toggleMic = useCallback(() => {
    if (handsFree) {
      setHandsFree(false);
      handsFreeRef.current = false;
      listenerRef.current?.abort();
      setListening(false);
      return;
    }
    setHandsFree(true);
    handsFreeRef.current = true;
    stopSpeaking();
    setSpeaking(false);
    startListening();
  }, [handsFree, startListening]);

  // Hands-free is on every time the companion opens.
  useEffect(() => {
    if (!open) return;
    handsFreeRef.current = true;
    setHandsFree(true);
  }, [open]);

  // Greet by time of day and caregiver name when the companion opens.
  useEffect(() => {
    if (!open || turns.length) return;
    const first = pending[0];
    const salutation = `${shiftGreeting()}, ${CURRENT_CAREGIVER}. I'm ready to assist you.`;
    const greeting = first
      ? `${salutation} You have ${pending.length} service${pending.length === 1 ? "" : "s"} on the board this shift. Just say the word — ask me who to start with, and I'll walk you through it.`
      : `${salutation} Everything scheduled right now is documented. I'm here if anything comes up.`;
    setTurns([{ role: "assistant", content: greeting }]);
    setFocusRowId(first?.rowId ?? null);
    say(greeting);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => () => stopSpeaking(), []);

  const close = useCallback(() => {
    handsFreeRef.current = false;
    setHandsFree(false);
    stopSpeaking();
    listenerRef.current?.abort();
    setListening(false);
    setSpeaking(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const micSupported = voiceInputSupported();
  const statusLine = thinking
    ? "Thinking…"
    : listening
      ? input || "Listening…"
      : handsFree
        ? speaking
          ? ""
          : "One moment…"
        : "Paused — tap the mic to talk again";
  const lastAssistant = [...turns].reverse().find((t) => t.role === "assistant")?.content ?? "";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(124,58,237,0.28),transparent_60%)]" />

      {/* Top bar */}
      <div className="relative flex items-center justify-between px-6 py-5">
        <div>
          <p className="text-sm font-semibold tracking-wide">Care Companion</p>
          <p className="text-xs text-white/60">
            {pending.length} due now · {briefing.length - pending.length} documented
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={muted ? "Turn the voice on" : "Turn the voice off"}
            onClick={() => {
              stopSpeaking();
              setSpeaking(false);
              setMuted((m) => !m);
            }}
            className="rounded-full p-2.5 text-white/80 hover:bg-white/10"
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
          <button
            type="button"
            aria-label="Close the Care Companion"
            onClick={close}
            className="rounded-full p-2.5 text-white/80 hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Center stage */}
      <div className="relative flex flex-1 flex-col items-center justify-center gap-6 overflow-hidden px-6">
        <div className="h-[min(46vh,380px)] w-[min(46vh,380px)]">
          <VoicePoweredOrb
            hue={listening ? 160 : 280}
            enableVoiceControl={listening}
            activity={speaking ? 0.55 : thinking ? 0.3 : 0}
          />
        </div>

        {focus && (
          <div className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-center backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
              {focus.status === "pending" ? "Up next" : "Last task"}
            </p>
            <p className="mt-1 text-base font-semibold">
              {focus.individualName} · {focus.title}
            </p>
            <p className="text-xs text-white/60">
              {focus.time} · {focus.shiftName} · {focus.location}
            </p>
          </div>
        )}

        <p className="max-w-2xl text-center text-lg leading-relaxed text-white/90">
          {thinking || listening ? statusLine : lastAssistant}
        </p>
        {!thinking && !listening && !handsFree && (
          <p className="text-xs text-white/50">{statusLine}</p>
        )}

        {charted.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {charted.map((c) => (
              <span
                key={c}
                className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> {c}
              </span>
            ))}
          </div>
        )}

        {turns.length <= 1 && (
          <div className="flex flex-wrap justify-center gap-2">
            {["Who do I take care of now?", "Walk me through my shift", "What's left?"].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void send(q)}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-white/80 hover:bg-white/10"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Transcript + controls */}
      <div className="relative border-t border-white/10 bg-black/30 px-6 py-4 backdrop-blur">
        <div ref={scrollRef} className="mx-auto mb-3 max-h-28 max-w-3xl space-y-2 overflow-y-auto">
          {turns.map((t, i) => (
            <div key={i} className={cn("flex", t.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                  t.role === "user" ? "bg-primary text-primary-foreground" : "bg-white/10 text-white/85",
                )}
              >
                {t.content}
              </div>
            </div>
          ))}
        </div>

        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button
            type="button"
            aria-label={handsFree ? "Pause the conversation" : "Resume the conversation"}
            onClick={toggleMic}
            disabled={!micSupported}
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-all",
              listening
                ? "bg-red-500 text-white shadow-[0_0_0_10px_rgba(239,68,68,0.18)]"
                : handsFree
                  ? "bg-gradient-to-br from-primary to-violet-600 text-white hover:brightness-110"
                  : "bg-white/10 text-white/70 hover:bg-white/20",
              !micSupported && "opacity-40",
            )}
          >
            {micSupported && handsFree ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
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
            placeholder={listening ? "Listening…" : "Speak, or type here…"}
            className="max-h-24 min-h-[48px] flex-1 resize-none rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="button"
            onClick={() => void send(input)}
            disabled={!input.trim() || thinking}
            aria-label="Send"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-40"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export type { BriefingItem };
