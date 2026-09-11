// Browser speech helpers for the Care Companion (voice in, voice out).
// Uses the Web Speech API; everything degrades to text when unsupported.

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
};

type RecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function voiceInputSupported(): boolean {
  return getRecognitionCtor() !== null;
}

export function createListener(handlers: {
  onTranscript: (text: string) => void;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}) {
  const Ctor = getRecognitionCtor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = "en-US";
  rec.continuous = false;
  rec.interimResults = true;

  let finalText = "";
  rec.onresult = (e) => {
    let text = "";
    for (let i = 0; i < e.results.length; i += 1) text += e.results[i][0].transcript;
    finalText = text;
    handlers.onTranscript(text);
  };
  rec.onerror = (err) => handlers.onError?.(err);
  rec.onend = () => {
    handlers.onEnd?.();
    finalText = "";
  };

  return {
    start: () => rec.start(),
    stop: () => rec.stop(),
    abort: () => rec.abort(),
    get text() {
      return finalText;
    },
  };
}

let currentUtterance: SpeechSynthesisUtterance | null = null;
let currentAudio: HTMLAudioElement | null = null;
let speechToken = 0;

// Natural AI voice first (ElevenLabs, server-side); browser voice only if that
// is unavailable or fails.
export function speak(text: string, onDone?: () => void): void {
  if (typeof window === "undefined") {
    onDone?.();
    return;
  }
  stopSpeaking();
  const token = ++speechToken;

  // Stream the AI voice straight into an <audio> element: playback starts as
  // soon as the first bytes arrive instead of waiting for the whole clip.
  try {
    const audio = new Audio(`/api/companion-voice?text=${encodeURIComponent(text.slice(0, 2000))}`);
    audio.preload = "auto";
    currentAudio = audio;
    let started = false;
    const finish = () => {
      if (currentAudio === audio) currentAudio = null;
      if (token === speechToken) onDone?.();
    };
    audio.onplaying = () => {
      started = true;
    };
    audio.onended = finish;
    audio.onerror = () => {
      if (currentAudio === audio) currentAudio = null;
      if (token !== speechToken) return;
      // No AI voice available (or it failed before any audio) — use the browser.
      if (!started) speakWithBrowser(text, onDone);
      else onDone?.();
    };
    void audio.play().catch(() => {
      if (token === speechToken && !started) speakWithBrowser(text, onDone);
    });
  } catch {
    if (token === speechToken) speakWithBrowser(text, onDone);
  }
}


function speakWithBrowser(text: string, onDone?: () => void): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onDone?.();
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.02;
  u.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find((v) => /samantha|google us english|jenny|aria/i.test(v.name)) ??
    voices.find((v) => v.lang.startsWith("en"));
  if (preferred) u.voice = preferred;
  u.onend = () => onDone?.();
  u.onerror = () => onDone?.();
  currentUtterance = u;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  if (typeof window === "undefined") return;
  speechToken += 1;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio = null;
  }
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  currentUtterance = null;
}

export function isSpeaking(): boolean {
  if (currentAudio && !currentAudio.paused) return true;
  return typeof window !== "undefined" && "speechSynthesis" in window
    ? window.speechSynthesis.speaking
    : Boolean(currentUtterance);
}
