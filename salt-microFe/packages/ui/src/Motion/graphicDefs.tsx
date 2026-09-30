import { vars } from "../styles/tokens.css";

/** 그래픽 면 그라데이션 — 위 하이라이트 → 본색 → 아래 그늘 (FE-REQ-044 원칙 1) */
export const GraphicGradient = ({ id, tone = "primary" }: { id: string; tone?: "primary" | "error" | "neutral" }) => {
  const stops =
    tone === "error"
      ? [vars.colors.status.error, vars.colors.status.error, vars.colors.status.errorDark]
      : tone === "neutral"
        ? [vars.colors.neutral[200], vars.colors.neutral[300], vars.colors.neutral[400]]
        : [vars.colors.graphic.highlight, vars.colors.graphic.primary, vars.colors.graphic.shade];

  return (
    <radialGradient id={id} cx="38%" cy="28%" r="80%">
      <stop offset="0%" style={{ stopColor: stops[0] }} />
      <stop offset="55%" style={{ stopColor: stops[1] }} />
      <stop offset="100%" style={{ stopColor: stops[2] }} />
    </radialGradient>
  );
};

/** 장면 뒤 옅은 원광 */
export const BackdropGlow = ({ id }: { id: string }) => (
  <radialGradient id={id} cx="50%" cy="50%" r="50%">
    <stop offset="0%" style={{ stopColor: vars.colors.graphic.soft, stopOpacity: 0.9 }} />
    <stop offset="100%" style={{ stopColor: vars.colors.graphic.backdrop, stopOpacity: 0 }} />
  </radialGradient>
);
