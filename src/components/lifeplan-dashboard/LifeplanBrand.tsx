// LifePlan.ai brand mark: "LIFE" bold + "Plan" rounded chip + cyan→purple
// "AI" superscript. Sizes: sm (nav/buttons), md (headers).
export function LifeplanBrand({ size = "md", onDark = false }: { size?: "sm" | "md"; onDark?: boolean }) {
  const life = size === "sm" ? "text-[15px]" : "text-[20px]";
  const plan = size === "sm" ? "text-[13px] px-1.5 py-0.5" : "text-[17px] px-2 py-0.5";
  const ai = size === "sm" ? "text-[8px]" : "text-[10px]";
  const lifeColor = onDark ? "text-white" : "text-ink";
  return (
    <span className="inline-flex items-start font-extrabold tracking-tight leading-none select-none">
      <span className={`${life} ${lifeColor}`}>LIFE</span>
      <span
        className={`${plan} rounded-md text-white ml-0.5`}
        style={{ background: "var(--navy)" }}
      >
        Plan
      </span>
      <span
        className={`${ai} font-black ml-0.5 -mt-0.5 bg-clip-text text-transparent`}
        style={{ backgroundImage: "linear-gradient(90deg,#22d3ee,#7b3ff2)" }}
      >
        AI
      </span>
    </span>
  );
}
