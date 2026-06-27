// Trends teaser card. Surfacing trends across thousands of services is heavy, so
// it stays on-demand: the button opens the Trends slide-in panel (TrendsPanel),
// which computes the analysis from the CareTracker progress feed and shows it
// beside the dashboard. There is a single trends action; this card and the
// reachable top trigger both open the same panel.
import { type CSSProperties } from "react";
import { Sparkles, TrendingDown } from "lucide-react";

const card: CSSProperties = { background: "#fff", border: "1px solid var(--border-soft)", borderRadius: 16, boxShadow: "var(--shadow-sm)", overflow: "hidden" };
const cardHead: CSSProperties = { padding: "13px 20px", borderBottom: "1px solid var(--border-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" };

export function OverviewTrends({ onOpen }: { onOpen: () => void }) {
  return (
    <div style={{ ...card, marginBottom: 16 }}>
      <div style={cardHead}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <TrendingDown className="h-4 w-4" style={{ color: "#DC2626" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fg1)" }}>Trends</span>
        </div>
        <span style={{ fontFamily: "var(--font-text)", fontSize: 12, color: "var(--fg4)" }}>generated on demand</span>
      </div>
      <div style={{ padding: "28px 20px", textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-text)", fontSize: 13, color: "var(--fg3)", maxWidth: 460, margin: "0 auto 14px" }}>
          Spot patterns that need attention: repeated service refusals, declining engagement, and plans falling behind on documentation.
        </p>
        <button
          onClick={onOpen}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 11, border: "none", background: "var(--ai-gradient)", color: "#fff", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 13.5, cursor: "pointer", boxShadow: "0 6px 16px rgba(124,58,237,.26)" }}
        >
          <Sparkles className="h-4 w-4" /> Generate trends
        </button>
      </div>
    </div>
  );
}
