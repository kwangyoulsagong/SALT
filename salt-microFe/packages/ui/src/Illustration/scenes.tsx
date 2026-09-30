import { m, type Variants } from "framer-motion";

import { durations, ease, motionTokens, springs } from "../Motion/motionPresets";
import { vars } from "../styles/tokens.css";

export type IllustrationScene = "coinPouch" | "candles" | "scale" | "coachBubble" | "target" | "ledger";

interface SceneProps {
  /** 본면 그라데이션 `url(#…)` */
  fill: string;
}

const g = vars.colors.graphic;
const white = vars.colors.text.white;

/** 바닥 그림자 — 모든 장면이 같은 바닥 위에 선다 */
const Floor = ({ cx = 100, rx = 46 }: { cx?: number; rx?: number }) => (
  <ellipse cx={cx} cy={148} rx={rx} ry={5} style={{ fill: g.shade, opacity: 0.12 }} />
);

const rise = (delay: number): Variants => ({
  hidden: { scaleY: 0, opacity: 0 },
  shown: { scaleY: 1, opacity: 1, transition: { ...springs.bouncy, delay } },
});

const drop = (delay: number, distance = 16): Variants => ({
  hidden: { y: -distance, opacity: 0 },
  shown: { y: 0, opacity: 1, transition: { ...springs.bouncy, delay } },
});

// ── 동전 주머니: 떨어지고 → 닿고 → 주머니가 한 번 출렁인다 ─────────────────────────
const CoinPouch = ({ fill }: SceneProps) => (
  <>
    <Floor />
    <m.g
      variants={{
        hidden: { y: -78, opacity: 0 },
        shown: {
          y: 0,
          opacity: 1,
          transition: { y: { duration: durations.slow, ease: ease.fall }, opacity: { duration: durations.instant } },
        },
      }}
    >
      <circle cx={100} cy={57} r={15} style={{ fill: g.coin }} />
      <circle cx={100} cy={57} r={10.5} fill="none" strokeWidth={2} style={{ stroke: g.highlight }} />
      <text x={100} y={62} textAnchor="middle" fontSize={13} fontWeight={800} style={{ fill: g.primary }}>
        ₩
      </text>
    </m.g>
    <m.g
      style={{ originX: "50%", originY: "100%" }}
      variants={{
        hidden: { scaleX: 1, scaleY: 1 },
        shown: {
          scaleX: [1, 1.06, 0.98, 1],
          scaleY: [1, 0.9, 1.03, 1],
          transition: { duration: durations.slow + durations.base, delay: durations.slow - 0.04, ease: ease.move },
        },
      }}
    >
      <path
        d="M76 66 C76 58 124 58 124 66 C124 71 118 74 115 77 C141 88 156 106 152 125 C148 143 125 147 100 147 C75 147 52 143 48 125 C44 106 59 88 85 77 C82 74 76 71 76 66 Z"
        fill={fill}
      />
      <ellipse cx={100} cy={66} rx={21} ry={4.5} style={{ fill: g.shade, opacity: 0.55 }} />
      <text x={100} y={125} textAnchor="middle" fontSize={32} fontWeight={800} style={{ fill: white, opacity: 0.92 }}>
        ₩
      </text>
    </m.g>
  </>
);

// ── 캔들: 왼쪽부터 차례로 솟고, 가장 높은 캔들에 표식이 내려앉는다 ─────────────────
const CANDLES = [
  { x: 46, wickTop: 90, top: 104, bottom: 126, wickBottom: 134, light: false },
  { x: 70, wickTop: 70, top: 78, bottom: 88, wickBottom: 104, light: true },
  { x: 94, wickTop: 50, top: 58, bottom: 100, wickBottom: 114, light: false },
  { x: 118, wickTop: 60, top: 84, bottom: 120, wickBottom: 130, light: true },
  { x: 142, wickTop: 76, top: 88, bottom: 108, wickBottom: 122, light: false },
] as const;

const Candles = ({ fill }: SceneProps) => (
  <>
    {[42, 74, 106, 138].map((y) => (
      <line key={y} x1={28} x2={172} y1={y} y2={y} strokeWidth={1} style={{ stroke: g.soft }} />
    ))}
    {[56, 100, 144].map((x) => (
      <line key={x} x1={x} x2={x} y1={30} y2={146} strokeWidth={1} style={{ stroke: g.soft }} />
    ))}
    {CANDLES.map((candle, index) => (
      <m.g
        key={candle.x}
        style={{ originX: "50%", originY: "100%" }}
        variants={rise(index * motionTokens.stagger * 2)}
      >
        <rect
          x={candle.x + 5.5}
          y={candle.wickTop}
          width={3}
          height={candle.wickBottom - candle.wickTop}
          rx={1.5}
          style={{ fill: candle.light ? g.highlight : g.primary }}
        />
        <rect
          x={candle.x}
          y={candle.top}
          width={14}
          height={candle.bottom - candle.top}
          rx={3}
          fill={candle.light ? undefined : fill}
          style={candle.light ? { fill: g.highlight } : undefined}
        />
      </m.g>
    ))}
    <m.g variants={drop(CANDLES.length * motionTokens.stagger * 2 + durations.base, 20)}>
      <path d="M92 26 h18 a3 3 0 0 1 3 3 v12 l-12 8 l-12 -8 v-12 a3 3 0 0 1 3 -3 Z" style={{ fill: g.shade }} />
      <path d="M95.5 37 l5.5 -5 l5.5 5" fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: white }} />
    </m.g>
  </>
);

// ── 저울: 흔들리다 수평을 찾는다 ──────────────────────────────────────────────
const Pan = ({ cx }: { cx: number }) => (
  <>
    <line x1={cx} x2={cx - 16} y1={52} y2={92} strokeWidth={1.6} style={{ stroke: g.highlight }} />
    <line x1={cx} x2={cx + 16} y1={52} y2={92} strokeWidth={1.6} style={{ stroke: g.highlight }} />
    <path d={`M${cx - 22} 92 h44 a22 12 0 0 1 -44 0 Z`} style={{ fill: g.primary }} />
  </>
);

const Scale = ({ fill }: SceneProps) => (
  <>
    <Floor rx={40} />
    <path d="M96 52 h8 l6 86 h-20 Z" fill={fill} />
    <rect x={72} y={136} width={56} height={10} rx={5} style={{ fill: g.shade }} />
    <m.g
      style={{ originX: "50%", originY: "0%" }}
      variants={{
        hidden: { rotate: -14 },
        shown: { rotate: [-14, 9, -5, 2, 0], transition: { duration: durations.scene * 1.4, ease: ease.move } },
      }}
    >
      <rect x={40} y={48} width={120} height={7} rx={3.5} style={{ fill: g.shade }} />
      <Pan cx={52} />
      <Pan cx={148} />
      <circle cx={46} cy={86} r={7} style={{ fill: g.coin }} />
      <circle cx={58} cy={86} r={7} style={{ fill: g.coin }} />
      <rect x={138} y={78} width={20} height={14} rx={4} style={{ fill: g.coin }} />
    </m.g>
    <circle cx={100} cy={51} r={7} style={{ fill: g.highlight }} />
  </>
);

// ── 코치 말풍선: 부풀고 점이 차례로 뛴다 ─────────────────────────────────────
const CoachBubble = ({ fill }: SceneProps) => (
  <>
    <Floor rx={40} />
    <m.g
      style={{ originX: "10%", originY: "100%" }}
      variants={{
        hidden: { scale: 0.5, opacity: 0 },
        shown: { scale: 1, opacity: 1, transition: springs.bouncy },
      }}
    >
      <path d="M58 30 h84 a26 26 0 0 1 26 26 v22 a26 26 0 0 1 -26 26 h-54 l-22 18 l4 -18 h-12 a26 26 0 0 1 -26 -26 v-22 a26 26 0 0 1 26 -26 Z" fill={fill} />
      {[78, 100, 122].map((cx, index) => (
        <m.circle
          key={cx}
          cx={cx}
          cy={67}
          r={7}
          style={{ fill: white }}
          variants={{
            hidden: { y: 0 },
            shown: {
              y: [0, -8, 0],
              transition: { duration: durations.slow + durations.instant, delay: durations.base + index * 0.1, ease: ease.move },
            },
          }}
        />
      ))}
    </m.g>
    <m.g
      style={{ originX: "90%", originY: "100%" }}
      variants={{
        hidden: { scale: 0.4, opacity: 0 },
        shown: { scale: 1, opacity: 1, transition: { ...springs.bouncy, delay: durations.slow + durations.base } },
      }}
    >
      <rect x={128} y={112} width={46} height={26} rx={13} style={{ fill: g.soft }} />
      <rect x={138} y={122} width={26} height={6} rx={3} style={{ fill: g.highlight }} />
    </m.g>
  </>
);

// ── 과녁: 원이 퍼지고 화살이 꽂힌 뒤 한 번 떨린다 ───────────────────────────
const TARGET_RINGS = [
  { r: 50, color: g.soft },
  { r: 38, color: "fill" },
  { r: 26, color: white },
  { r: 13, color: g.shade },
] as const;

const Target = ({ fill }: SceneProps) => (
  <>
    <Floor cx={92} rx={42} />
    {TARGET_RINGS.map((ring, index) => (
      <m.circle
        key={ring.r}
        cx={92}
        cy={90}
        r={ring.r}
        fill={ring.color === "fill" ? fill : undefined}
        style={{ ...(ring.color === "fill" ? {} : { fill: ring.color }), originX: "50%", originY: "50%" }}
        variants={{
          hidden: { scale: 0, opacity: 0 },
          shown: { scale: 1, opacity: 1, transition: { ...springs.bouncy, delay: index * motionTokens.stagger * 1.5 } },
        }}
      />
    ))}
    <m.g
      variants={{
        hidden: { x: 46, y: -46, opacity: 0 },
        shown: {
          x: 0,
          y: 0,
          opacity: 1,
          transition: { duration: durations.base + 0.06, delay: durations.slow, ease: ease.fall },
        },
      }}
    >
      <m.g
        style={{ originX: "0%", originY: "100%" }}
        variants={{
          hidden: { rotate: 0 },
          shown: { rotate: [0, -5, 4, -2, 0], transition: { duration: durations.slow, delay: durations.slow + durations.base + 0.06 } },
        }}
      >
        <line x1={93} y1={89} x2={150} y2={32} strokeWidth={4} strokeLinecap="round" style={{ stroke: g.shade }} />
        <path d="M150 32 l-2 -14 l10 10 Z M150 32 l14 2 l-10 -10 Z" style={{ fill: g.primary }} />
      </m.g>
    </m.g>
  </>
);

// ── 장부: 종이가 놓이고 줄이 차례로 채워지고 체크가 찍힌다 ────────────────────
const LEDGER_ROWS = [
  { y: 70, width: 50 },
  { y: 90, width: 38 },
  { y: 110, width: 56 },
  { y: 130, width: 32 },
] as const;

const Ledger = ({ fill }: SceneProps) => (
  <>
    <Floor rx={50} />
    <m.g variants={drop(0, 12)}>
      <rect x={50} y={24} width={100} height={122} rx={14} strokeWidth={1.5} style={{ fill: white, stroke: g.soft }} />
      <path d="M50 38 a14 14 0 0 1 14 -14 h72 a14 14 0 0 1 14 14 v14 h-100 Z" fill={fill} />
      <rect x={64} y={34} width={40} height={7} rx={3.5} style={{ fill: white, opacity: 0.85 }} />
    </m.g>
    {LEDGER_ROWS.map((row, index) => (
      <m.g
        key={row.y}
        style={{ originX: "0%", originY: "50%" }}
        variants={{
          hidden: { scaleX: 0, opacity: 0 },
          shown: {
            scaleX: 1,
            opacity: 1,
            transition: { duration: durations.base, delay: durations.base + index * motionTokens.stagger * 3, ease: ease.enter },
          },
        }}
      >
        <circle cx={68} cy={row.y} r={4} style={{ fill: g.highlight }} />
        <rect x={78} y={row.y - 3} width={row.width} height={6} rx={3} style={{ fill: g.soft }} />
        <rect x={138 - 14} y={row.y - 3} width={14} height={6} rx={3} style={{ fill: g.coin }} />
      </m.g>
    ))}
    <m.g
      style={{ originX: "50%", originY: "50%" }}
      variants={{
        hidden: { scale: 0, opacity: 0 },
        shown: {
          scale: 1,
          opacity: 1,
          transition: { ...springs.bouncy, delay: durations.base + LEDGER_ROWS.length * motionTokens.stagger * 3 + durations.base },
        },
      }}
    >
      <circle cx={150} cy={134} r={15} style={{ fill: g.shade }} />
      <path d="M143 134 l5 5 l9 -10" fill="none" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: white }} />
    </m.g>
  </>
);

export const SCENES: Record<IllustrationScene, (props: SceneProps) => JSX.Element> = {
  coinPouch: CoinPouch,
  candles: Candles,
  scale: Scale,
  coachBubble: CoachBubble,
  target: Target,
  ledger: Ledger,
};
