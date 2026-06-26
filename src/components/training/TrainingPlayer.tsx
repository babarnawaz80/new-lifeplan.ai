// Interactive narrated training "video". Plays AI-generated slides with two
// alternating hosts (Alex & Jamie), play/pause/prev/next/restart, a progress
// bar, on-screen slide visuals (heading + bullets), and a live caption.
//
// Voice: when the Vertex TTS seam is configured (server creds present), each
// slide is voiced with natural AI audio (Gemini multi-speaker on Vertex). When
// it isn't — e.g. local/demo without credentials — it falls back to the
// browser's Web Speech voice, and the player labels which voice is in use.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, Loader2 } from "lucide-react";
import type { TrainingContent } from "@/data/mock";
import { synthesizeTrainingAudio } from "@/lib/generate-training-audio.functions";

type Line = { speaker: "Alex" | "Jamie"; text: string };

function useVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);
  return voices;
}

export function TrainingPlayer({
  training,
  onFinish,
}: {
  training: TrainingContent;
  onFinish?: () => void;
}) {
  const slides = training.slides;
  const voices = useVoices();
  const ttsFn = useServerFn(synthesizeTrainingAudio);

  const [slide, setSlide] = useState(0);
  const [line, setLine] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [done, setDone] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [voiceSource, setVoiceSource] = useState<"ai" | "browser" | null>(null);
  const [buffering, setBuffering] = useState(false);
  const [captions, setCaptions] = useState(false); // closed captions off by default; CC toggles
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const audioElRef = useRef<HTMLAudioElement | null>(null);
  // slide index -> data URL, or "none" when AI audio isn't available.
  const audioCacheRef = useRef<Map<number, string | "none">>(new Map());

  const speechSupported = typeof window !== "undefined" && !!window.speechSynthesis;

  // Pick two distinct English voices for the browser-fallback hosts.
  const { alexVoice, jamieVoice } = useMemo(() => {
    const en = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
    const pool = en.length ? en : voices;
    const female = pool.find((v) => /female|samantha|victoria|karen|moira|tessa|zira|aria/i.test(v.name));
    const male = pool.find((v) => /male|daniel|alex|fred|david|george|rishi/i.test(v.name) && v !== female);
    return { alexVoice: male ?? pool[0], jamieVoice: female ?? pool[1] ?? pool[0] };
  }, [voices]);

  const allLines: Line[] = slides[slide]?.narration ?? [];
  const totalLines = useMemo(() => slides.reduce((n, s) => n + s.narration.length, 0), [slides]);
  const playedLines = useMemo(
    () => slides.slice(0, slide).reduce((n, s) => n + s.narration.length, 0) + line,
    [slides, slide, line],
  );
  const progress = totalLines ? Math.min(100, Math.round((playedLines / totalLines) * 100)) : 0;

  const stopAudio = useCallback(() => {
    const el = audioElRef.current;
    if (el) { el.onended = null; el.onerror = null; el.pause(); }
    if (speechSupported) window.speechSynthesis.cancel();
  }, [speechSupported]);

  // Lazily fetch (and cache) the AI audio clip for a slide.
  const getSlideAudio = useCallback(
    async (i: number): Promise<string | "none"> => {
      const cache = audioCacheRef.current;
      const cached = cache.get(i);
      if (cached !== undefined) return cached;
      const lines = slides[i]?.narration ?? [];
      if (!lines.length) { cache.set(i, "none"); return "none"; }
      try {
        const res = await ttsFn({ data: { lines: lines.map((l) => ({ speaker: l.speaker, text: l.text })) } });
        if (!res.available) { cache.set(i, "none"); return "none"; }
        const url = `data:${res.mimeType};base64,${res.audioBase64}`;
        cache.set(i, url);
        return url;
      } catch {
        cache.set(i, "none");
        return "none";
      }
    },
    [slides, ttsFn],
  );

  const advanceLine = useCallback(() => {
    setLine((l) => {
      if (l + 1 < (slides[slide]?.narration.length ?? 0)) return l + 1;
      // next slide
      if (slide + 1 < slides.length) { setSlide((s) => s + 1); return 0; }
      setPlaying(false); setDone(true); onFinish?.();
      return l;
    });
  }, [slides, slide, onFinish]);

  const advanceSlide = useCallback(() => {
    if (slide + 1 < slides.length) { setSlide((s) => s + 1); setLine(0); }
    else { setPlaying(false); setDone(true); onFinish?.(); }
  }, [slide, slides.length, onFinish]);

  // Playback engine: AI audio per slide when available; else browser speech per
  // line; muted advances on a timer.
  useEffect(() => {
    if (!playing || done) return;
    const slideObj = slides[slide];
    if (!slideObj) return;
    const lines = slideObj.narration;

    // Muted — silent timed walk through lines.
    if (mutedRef.current) {
      const cur = lines[line];
      const t = setTimeout(advanceLine, Math.min(4200, 900 + (cur?.text.length ?? 20) * 32));
      return () => clearTimeout(t);
    }

    // AI audio: one clip per slide. Trigger once at the slide's first line.
    if (!aiUnavailable) {
      if (line !== 0) return;
      let cancelled = false;
      (async () => {
        // Show a buffering indicator only when this slide's clip isn't cached
        // yet (prefetch usually has it ready, so transitions feel instant).
        if (audioCacheRef.current.get(slide) === undefined) setBuffering(true);
        const clip = await getSlideAudio(slide);
        if (cancelled) return;
        setBuffering(false);
        if (clip === "none") { setAiUnavailable(true); setVoiceSource("browser"); return; }
        setVoiceSource("ai");
        const el = audioElRef.current;
        if (!el) { setAiUnavailable(true); return; }
        el.src = clip;
        el.onended = advanceSlide;
        el.onerror = advanceSlide;
        el.play().catch(() => { setAiUnavailable(true); setVoiceSource("browser"); });
      })();
      return () => { cancelled = true; setBuffering(false); const el = audioElRef.current; if (el) { el.onended = null; el.pause(); } };
    }

    // Browser speech fallback (per line).
    setVoiceSource("browser");
    if (!speechSupported) {
      const cur = lines[line];
      const t = setTimeout(advanceLine, Math.min(4200, 900 + (cur?.text.length ?? 20) * 32));
      return () => clearTimeout(t);
    }
    const cur = lines[line];
    if (!cur) return;
    const u = new SpeechSynthesisUtterance(cur.text);
    u.voice = cur.speaker === "Alex" ? alexVoice : jamieVoice;
    u.rate = 1.02;
    u.pitch = cur.speaker === "Alex" ? 0.95 : 1.08;
    u.onend = advanceLine;
    u.onerror = advanceLine;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    return () => window.speechSynthesis.cancel();
  }, [playing, slide, line, done, aiUnavailable, speechSupported, slides, alexVoice, jamieVoice, advanceLine, advanceSlide, getSlideAudio]);

  // Prefetch the next slide's audio while the current one plays, so advancing
  // is instant (no gap). Also warms slide 0/1 as soon as playback starts.
  useEffect(() => {
    if (!playing || aiUnavailable || mutedRef.current) return;
    void getSlideAudio(slide + 1);
    if (slide === 0) void getSlideAudio(1);
  }, [playing, slide, aiUnavailable, getSlideAudio]);

  // The speaker button mutes the currently-playing AI audio immediately.
  useEffect(() => {
    if (audioElRef.current) audioElRef.current.muted = muted;
  }, [muted]);

  // Stop everything on unmount.
  useEffect(() => () => stopAudio(), [stopAudio]);

  const togglePlay = () => {
    if (done) return restart();
    if (playing) stopAudio();
    setPlaying((p) => !p);
  };
  const restart = () => {
    stopAudio();
    setSlide(0); setLine(0); setDone(false); setPlaying(true);
  };

  const s = slides[slide];
  const caption = allLines[line];
  // In AI mode a single clip voices the whole slide, so show the full slide
  // script as the caption; in browser mode show the current spoken line.
  const aiMode = voiceSource === "ai";

  return (
    <div className="rounded-2xl border border-line overflow-hidden shadow-soft bg-card">
      <audio ref={audioElRef} className="hidden" />
      {/* Stage */}
      <div className="relative aspect-video flex flex-col" style={{ background: "linear-gradient(135deg, #1a1140, #4c1d95 55%, #9d2c6e)" }}>
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "radial-gradient(circle at 22% 28%, rgba(255,255,255,0.22), transparent 42%), radial-gradient(circle at 82% 80%, rgba(255,255,255,0.12), transparent 45%)" }} />
        <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur text-white text-[10px] font-bold uppercase tracking-wider">
          AI-generated · Alex & Jamie
        </div>
        <div className="absolute right-4 top-4 text-white/80 text-[11px] font-semibold">
          {slide + 1} / {slides.length}
        </div>

        {/* Slide body */}
        <div className="relative flex-1 flex flex-col justify-center px-8 md:px-12">
          <h3 className="text-white text-[22px] md:text-[30px] font-extrabold leading-tight drop-shadow mb-4 max-w-3xl">
            {s?.heading}
          </h3>
          {(s?.bullets?.length ?? 0) > 0 && (
            <ul className="space-y-2 max-w-2xl">
              {s!.bullets!.map((b, i) => (
                <li key={i} className="flex items-start gap-2.5 text-white/95 text-[14px] md:text-[16px]">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-white/80 shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
          {done && (
            <div className="mt-6 inline-flex items-center gap-2 text-white text-[15px] font-bold">
              ✓ Training complete — take the quiz to certify.
            </div>
          )}
        </div>

        {/* Caption — closed captions, shown only when toggled on (CC button) */}
        {captions && !done && (aiMode ? allLines.length > 0 : !!caption) && (
          <div className="relative px-6 pb-5">
            <div className="mx-auto max-w-3xl rounded-xl bg-black/45 backdrop-blur px-4 py-2.5 text-white space-y-1">
              {aiMode ? (
                allLines.map((l, i) => (
                  <div key={i}>
                    <span className="text-[11px] font-bold uppercase tracking-wider opacity-80 mr-2">{l.speaker}</span>
                    <span className="text-[13px]">{l.text}</span>
                  </div>
                ))
              ) : (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider opacity-80 mr-2">{caption!.speaker}</span>
                  <span className="text-[13.5px]">{caption!.text}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Buffering while a slide's AI audio loads */}
        {buffering && playing && !done && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/45 backdrop-blur text-white text-[11px] font-semibold">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparing AI narration…
          </div>
        )}

        {/* Big center play when idle */}
        {!playing && !done && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 m-auto h-16 w-16 rounded-full bg-white/95 flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
            aria-label="Play training"
          >
            <Play className="h-7 w-7 text-navy ml-1" fill="currentColor" />
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="px-4 py-3 space-y-2.5">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${done ? 100 : progress}%`, background: "var(--ai-gradient)" }} />
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={togglePlay} className="h-10 w-10 rounded-full text-white flex items-center justify-center" style={{ background: "var(--ai-gradient)" }} aria-label={playing ? "Pause" : "Play"}>
            {done ? <RotateCcw className="h-4.5 w-4.5" /> : playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" fill="currentColor" />}
          </button>
          <button onClick={restart} className="h-9 w-9 rounded-lg hover:bg-muted flex items-center justify-center text-ink2" aria-label="Restart from beginning" title="Restart from the beginning"><RotateCcw className="h-4 w-4" /></button>
          <div className="flex-1" />
          {voiceSource === "ai" ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo" title="Voiced with Vertex AI multi-speaker TTS">
              <Sparkles className="h-3 w-3" /> AI voice
            </span>
          ) : voiceSource === "browser" ? (
            <span className="text-[11px] text-ink3" title="No AI voice credentials configured; using the browser's built-in voice">
              Browser preview voice
            </span>
          ) : null}
          <button
            onClick={() => setCaptions((c) => !c)}
            className={`h-9 px-2.5 rounded-lg flex items-center justify-center text-[11px] font-bold tracking-wide border ${captions ? "text-indigo border-indigo/40 bg-indigo/10" : "text-ink3 border-line hover:bg-muted"}`}
            aria-label={captions ? "Hide captions" : "Show captions"}
            aria-pressed={captions}
            title={captions ? "Hide captions" : "Show captions"}
          >
            CC
          </button>
          <button onClick={() => setMuted((m) => !m)} className="h-9 w-9 rounded-lg hover:bg-muted flex items-center justify-center text-ink2" aria-label={muted ? "Unmute" : "Mute"}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
        {voiceSource === "browser" && (
          <p className="text-[11.5px] text-ink3">
            Using the browser preview voice. Add Vertex AI credentials (server) to voice this with natural AI narration.
          </p>
        )}
      </div>
    </div>
  );
}
