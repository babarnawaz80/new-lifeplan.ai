import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Mic, Sparkles, Loader2, Languages, Check, Wand2, FileText, Scissors, RefreshCw, Smile, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

// Web Speech API typings (browser only)
type SpeechRecognitionType = any;

interface SmartTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onValueChange: (val: string) => void;
  containerClassName?: string;
}

// Languages the Web Speech API reliably recognizes
const VOICE_LANGUAGES: { code: string; label: string; flag: string }[] = [
  { code: "en-US", label: "English (US)", flag: "🇺🇸" },
  { code: "en-GB", label: "English (UK)", flag: "🇬🇧" },
  { code: "es-ES", label: "Español (España)", flag: "🇪🇸" },
  { code: "es-MX", label: "Español (México)", flag: "🇲🇽" },
  { code: "fr-FR", label: "Français", flag: "🇫🇷" },
  { code: "de-DE", label: "Deutsch", flag: "🇩🇪" },
  { code: "it-IT", label: "Italiano", flag: "🇮🇹" },
  { code: "pt-BR", label: "Português (BR)", flag: "🇧🇷" },
  { code: "pt-PT", label: "Português (PT)", flag: "🇵🇹" },
  { code: "nl-NL", label: "Nederlands", flag: "🇳🇱" },
  { code: "pl-PL", label: "Polski", flag: "🇵🇱" },
  { code: "ru-RU", label: "Русский", flag: "🇷🇺" },
  { code: "tr-TR", label: "Türkçe", flag: "🇹🇷" },
  { code: "ar-SA", label: "العربية", flag: "🇸🇦" },
  { code: "hi-IN", label: "हिन्दी", flag: "🇮🇳" },
  { code: "bn-IN", label: "বাংলা", flag: "🇮🇳" },
  { code: "ta-IN", label: "தமிழ்", flag: "🇮🇳" },
  { code: "te-IN", label: "తెలుగు", flag: "🇮🇳" },
  { code: "ur-PK", label: "اردو", flag: "🇵🇰" },
  { code: "zh-CN", label: "中文 (简体)", flag: "🇨🇳" },
  { code: "zh-TW", label: "中文 (繁體)", flag: "🇹🇼" },
  { code: "ja-JP", label: "日本語", flag: "🇯🇵" },
  { code: "ko-KR", label: "한국어", flag: "🇰🇷" },
  { code: "vi-VN", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th-TH", label: "ภาษาไทย", flag: "🇹🇭" },
  { code: "id-ID", label: "Bahasa Indonesia", flag: "🇮🇩" },
];

// Pick a sensible default from the user's browser locale
function detectDefaultLang(): string {
  if (typeof navigator === "undefined") return "en-US";
  const candidates = [navigator.language, ...(navigator.languages || [])];
  for (const c of candidates) {
    const exact = VOICE_LANGUAGES.find((l) => l.code.toLowerCase() === c.toLowerCase());
    if (exact) return exact.code;
    const base = c.split("-")[0].toLowerCase();
    const partial = VOICE_LANGUAGES.find((l) => l.code.toLowerCase().startsWith(base + "-"));
    if (partial) return partial.code;
  }
  return "en-US";
}

type AIAction = "proofread" | "refine" | "rewrite" | "shorten" | "expand" | "professional" | "friendly" | "translate-en";

// ─── Mock AI transformations (demo only, no API calls) ────────────────────
function mockAIRewrite(text: string, action: AIAction): string {
  if (!text.trim()) return text;
  const t = text.trim();

  switch (action) {
    case "proofread":
      return t
        .replace(/\bi\b/g, "I")
        .replace(/\s+/g, " ")
        .replace(/([.!?])\s*([a-z])/g, (_, p, c) => `${p} ${c.toUpperCase()}`)
        .replace(/^([a-z])/, (c) => c.toUpperCase())
        .replace(/([^.!?])$/, "$1.");

    case "refine":
      return `${t.charAt(0).toUpperCase() + t.slice(1).replace(/\s+/g, " ")}. The individual remained engaged and cooperative throughout the interaction.`.replace(/\.\.+/g, ".");

    case "rewrite":
      return `During this shift, ${t.toLowerCase().replace(/\.$/, "")}. Staff documented the activity per care plan and observed no concerns.`;

    case "shorten":
      return t.split(/[.!?]/).filter(Boolean).slice(0, 1).join(". ").trim() + ".";

    case "expand":
      return `${t.replace(/\.$/, "")}. Additionally, the individual was provided with appropriate supervision and verbal cues as outlined in the care plan. All required documentation has been completed in accordance with agency policy.`;

    case "professional":
      return `Per documentation: ${t.replace(/^./, (c) => c.toUpperCase()).replace(/\.$/, "")}. Service delivered in accordance with the individual's plan of care.`;

    case "friendly":
      return `${t.replace(/\.$/, "")} — overall a great session! 😊`;

    case "translate-en":
      // Mock: just prepend a tag for demo (real translation would need an API)
      return `[Translated to English]\n${t}`;

    default:
      return t;
  }
}

export function SmartTextarea({
  value,
  onValueChange,
  containerClassName,
  className,
  placeholder,
  ...props
}: SmartTextareaProps) {
  const [isListening, setIsListening] = useState(false);
  const [aiLoading, setAiLoading] = useState<AIAction | null>(null);
  const [interim, setInterim] = useState("");
  const [voiceLang, setVoiceLang] = useState<string>(() => detectDefaultLang());
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const baseTextRef = useRef("");
  const currentLang = VOICE_LANGUAGES.find((l) => l.code === voiceLang) ?? VOICE_LANGUAGES[0];

  const SpeechRecognition =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;
  const speechSupported = !!SpeechRecognition;

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  const startListening = () => {
    if (!speechSupported) {
      toast({
        title: "Voice input unavailable",
        description: "Your browser doesn't support speech recognition. Try Chrome, Edge, or Safari.",
        variant: "destructive",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    // Set the language explicitly — the Web Speech API needs this to recognize non-English speech
    recognition.lang = voiceLang;
    recognition.continuous = true;
    recognition.interimResults = true;
    baseTextRef.current = value ? value + " " : "";

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      if (finalTranscript) {
        baseTextRef.current = baseTextRef.current + finalTranscript + " ";
        onValueChange(baseTextRef.current.trimEnd());
        setInterim("");
      } else {
        setInterim(interimTranscript);
      }
    };

    recognition.onerror = (e: any) => {
      console.warn("Speech recognition error:", e.error);
      setIsListening(false);
      setInterim("");
      if (e.error === "not-allowed") {
        toast({
          title: "Microphone blocked",
          description: "Please allow microphone access in your browser settings.",
          variant: "destructive",
        });
      } else if (e.error !== "aborted" && e.error !== "no-speech") {
        toast({ title: "Voice input error", description: e.error, variant: "destructive" });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterim("");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsListening(false);
  };

  const runAI = async (action: AIAction, label: string) => {
    if (!value.trim()) {
      toast({ title: "Nothing to rewrite", description: "Type or dictate some text first." });
      return;
    }
    setAiLoading(action);
    // Simulated latency for demo realism
    await new Promise((r) => setTimeout(r, 700 + Math.random() * 600));
    const result = mockAIRewrite(value, action);
    onValueChange(result);
    setAiLoading(null);
    toast({ title: "✨ Text updated", description: `Applied: ${label}` });
  };

  const displayValue = isListening && interim ? `${value}${value ? " " : ""}${interim}` : value;

  return (
    <div className={cn("relative", containerClassName)}>
      <Textarea
        {...props}
        value={displayValue}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder ?? "Start typing or use voice / AI to draft your note…"}
        className={cn("pr-3 pb-12", className)}
      />

      {/* Toolbar */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Mic button — green when listening, outline otherwise */}
          <Button
            type="button"
            size="sm"
            variant={isListening ? "default" : "outline"}
            onClick={isListening ? stopListening : startListening}
            className={cn(
              "h-8 gap-1.5 transition-colors",
              isListening &&
                "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-[0_0_0_3px_hsl(var(--background)),0_0_0_5px_rgba(16,185,129,0.35)]"
            )}
          >
            {isListening ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                </span>
                <span className="text-xs font-medium">Listening…</span>
              </>
            ) : (
              <>
                <Mic className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Voice</span>
              </>
            )}
          </Button>

          {/* Compact language picker — defaults to your browser locale */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={isListening}
                className="h-8 gap-1 px-2 text-xs"
                title={`Voice language: ${currentLang.label}`}
              >
                <span className="text-base leading-none">{currentLang.flag}</span>
                <span className="hidden sm:inline text-muted-foreground">{currentLang.code.split("-")[0].toUpperCase()}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto bg-popover w-56">
              <DropdownMenuLabel className="text-xs flex items-center gap-1.5">
                <Languages className="h-3 w-3" /> Speak in…
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {VOICE_LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => setVoiceLang(lang.code)}
                  className="text-sm gap-2"
                >
                  <span className="w-5 text-base leading-none">{lang.flag}</span>
                  <span className="flex-1">{lang.label}</span>
                  {voiceLang === lang.code && <Check className="h-3.5 w-3.5 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Help me write */}
        <div className="pointer-events-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!!aiLoading}
                className="h-8 gap-1.5 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 hover:from-primary/15 hover:to-accent/15"
              >
                {aiLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                )}
                <span className="text-xs font-medium">Help me write</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover">
              <DropdownMenuLabel className="text-xs flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-primary" /> AI assist
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => runAI("proofread", "Proofread")} className="gap-2 text-sm">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <div className="flex-1">
                  <div className="font-medium">Proofread</div>
                  <div className="text-xs text-muted-foreground">Fix grammar & spelling</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => runAI("refine", "Refine")} className="gap-2 text-sm">
                <Wand2 className="h-3.5 w-3.5 text-blue-600" />
                <div className="flex-1">
                  <div className="font-medium">Refine</div>
                  <div className="text-xs text-muted-foreground">Polish clarity & flow</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => runAI("rewrite", "Rewrite")} className="gap-2 text-sm">
                <RefreshCw className="h-3.5 w-3.5 text-purple-600" />
                <div className="flex-1">
                  <div className="font-medium">Rewrite</div>
                  <div className="text-xs text-muted-foreground">Rephrase entirely</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2 text-sm">
                  <FileText className="h-3.5 w-3.5 text-orange-600" />
                  <span>Adjust length</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="bg-popover">
                    <DropdownMenuItem onClick={() => runAI("shorten", "Shorten")} className="gap-2 text-sm">
                      <Scissors className="h-3.5 w-3.5" /> Shorten
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => runAI("expand", "Expand")} className="gap-2 text-sm">
                      <FileText className="h-3.5 w-3.5" /> Expand
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2 text-sm">
                  <Smile className="h-3.5 w-3.5 text-pink-600" />
                  <span>Change tone</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="bg-popover">
                    <DropdownMenuItem onClick={() => runAI("professional", "Professional tone")} className="gap-2 text-sm">
                      Professional
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => runAI("friendly", "Friendly tone")} className="gap-2 text-sm">
                      Friendly
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => runAI("translate-en", "Translate to English")} className="gap-2 text-sm">
                <Languages className="h-3.5 w-3.5 text-teal-600" />
                <div className="flex-1">
                  <div className="font-medium">Translate to English</div>
                  <div className="text-xs text-muted-foreground">For non-English notes</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
