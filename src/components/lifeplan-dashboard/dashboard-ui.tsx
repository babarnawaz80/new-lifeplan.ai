// Design primitives ported from the Claude Design handoff (lp-data.jsx +
// lp-ai-variants.jsx): brand mark, ring charts, and AI accent elements.
// Inline styles use the .lp-dash-scoped CSS variables from dashboard.css.
import type { CSSProperties, ReactNode } from "react";

export const AI_GRAD = "linear-gradient(118deg, #7C3AED 0%, #A855F7 42%, #E0398B 100%)";

export const aiBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: AI_GRAD,
  color: "#fff",
  border: "none",
  padding: "11px 18px",
  borderRadius: 11,
  fontWeight: 700,
  fontSize: 13.5,
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
  boxShadow: "0 6px 18px rgba(139,92,246,0.28)",
  whiteSpace: "nowrap",
};

export function AiSpark({ size = 16, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M12 2l1.7 5.1L19 9l-5.3 1.9L12 16l-1.7-5.1L5 9l5.3-1.9z" />
      <path d="M19 13.5l.85 2.15L22 16.5l-2.15.85L19 19.5l-.85-2.15L16 16.5l2.15-.85z" opacity=".75" />
    </svg>
  );
}

export function AiBadge({ size = 34 }: { size?: number }) {
  return (
    <span
      style={{
        width: size, height: size, borderRadius: 10, background: AI_GRAD,
        display: "grid", placeItems: "center", flex: "none",
        boxShadow: "0 4px 12px rgba(139,92,246,0.30)",
      }}
    >
      <AiSpark size={size * 0.52} />
    </span>
  );
}

export function AiBorder({ children, radius = 16 }: { children: ReactNode; radius?: number }) {
  return (
    <div style={{ background: AI_GRAD, padding: 1.5, borderRadius: radius }}>
      <div style={{ background: "#fff", borderRadius: radius - 1.5 }}>{children}</div>
    </div>
  );
}

export function BrandMark({ size = 22, withAI = true, dark = false }: { size?: number; withAI?: boolean; dark?: boolean }) {
  const ink = dark ? "#fff" : "var(--icm-ink)";
  const chipBg = dark ? "#fff" : "var(--icm-ink)";
  const chipFg = dark ? "var(--icm-ink)" : "#fff";
  return (
    <span style={{ display: "inline-flex", alignItems: "flex-start", fontFamily: "var(--font-display)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1, whiteSpace: "nowrap" }}>
      <span style={{ display: "inline-flex", alignItems: "center" }}>
        <span style={{ color: ink, fontSize: size }}>LIFE</span>
        <span style={{ color: chipFg, background: chipBg, fontSize: size * 0.82, padding: `${size * 0.13}px ${size * 0.26}px`, borderRadius: size * 0.34, marginLeft: size * 0.12, fontWeight: 800 }}>Plan</span>
      </span>
      {withAI && (
        <span style={{ fontSize: size * 0.42, fontWeight: 800, marginLeft: size * 0.16, marginTop: -size * 0.04, background: AI_GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "0.02em" }}>AI</span>
      )}
    </span>
  );
}

export function RingGauge({ value, size = 72, stroke = 9, color = "#3CB54A", track = "#EEF2F7", label }: {
  value: number; size?: number; stroke?: number; color?: string; track?: string; label: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - value / 100);
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .6s var(--ease-out)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: size * 0.26, color: "var(--fg1)", letterSpacing: "-0.02em" }}>{label}</div>
      </div>
    </div>
  );
}

export function ComplianceRing({ onT, offT, outC, size = 200, stroke = 22 }: {
  onT: number; offT: number; outC: number; size?: number; stroke?: number;
}) {
  const total = onT + offT + outC || 1;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = 0.012 * c;
  const segs = [
    { v: onT, color: "#3CB54A" },
    { v: offT, color: "#F5A524" },
    { v: outC, color: "#DC2626" },
  ].filter((s) => s.v > 0);
  let acc = 0;
  const pct = Math.round((onT / total) * 100);
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F4F8" strokeWidth={stroke} />
        {segs.map((s, i) => {
          const len = (s.v / total) * c;
          const dash = Math.max(0, len - gap);
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={stroke} strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-acc} strokeLinecap="butt" transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dasharray .6s var(--ease-out)" }} />
          );
          acc += len;
          return el;
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: size * 0.2, color: "var(--fg1)", letterSpacing: "-0.03em", lineHeight: 1 }}>{pct}%</div>
        <div style={{ fontFamily: "var(--font-text)", fontSize: size * 0.066, color: "var(--fg3)", marginTop: 4, fontWeight: 600 }}>On Track</div>
      </div>
    </div>
  );
}
