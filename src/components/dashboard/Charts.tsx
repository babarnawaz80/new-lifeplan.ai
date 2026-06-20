// Small SVG chart primitives shared by the iCM dashboard and the LifePlan
// compliance hero — single-value ring and multi-segment donut.

export function Ring({ pct, color, center }: { pct: number; color: string; center: string }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" className="shrink-0">
      <circle cx="38" cy="38" r={r} fill="none" stroke="var(--muted)" strokeWidth="8" />
      <circle
        cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
        transform="rotate(-90 38 38)"
      />
      <text x="38" y="43" textAnchor="middle" className="fill-ink" style={{ fontSize: 16, fontWeight: 800 }}>
        {center}
      </text>
    </svg>
  );
}

export function SegmentDonut({
  segments,
  size = 76,
}: {
  segments: { value: number; color: string }[];
  size?: number;
}) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox="0 0 76 76" className="shrink-0">
      <circle cx="38" cy="38" r={r} fill="none" stroke="var(--muted)" strokeWidth="8" />
      {segments.map((seg, i) => {
        const len = (seg.value / total) * c;
        const el = (
          <circle
            key={i} cx="38" cy="38" r={r} fill="none" stroke={seg.color} strokeWidth="8"
            strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset}
            transform="rotate(-90 38 38)"
          />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}
