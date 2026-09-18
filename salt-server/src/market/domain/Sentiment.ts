/**
 * 시장 심리 점수 — `market-intelligence.service` 에서 옮겨온 **순수 계산**.
 *
 * ## 산술을 그대로 보존했다
 *
 * 가중치(0.4 / 0.3 / 0.3)와 Fear&Greed 혼합비(0.7 / 0.3), 구간 경계(20·40·60·80)를
 * 원문 그대로 뒀다. 이관의 목적은 **현재 동작을 옮기는 것**이고, 산술을 바꾸면서 옮기면
 * 값이 달라졌을 때 원인이 이관인지 변경인지 알 수 없다 (`coach/domain/policy` 와 같은 판단).
 *
 * `domain` 이므로 Prisma·Express·axios 를 모른다. 입력은 평범한 숫자다.
 */

export enum SentimentLabel {
  ExtremeFear = "extreme_fear",
  Fear = "fear",
  Neutral = "neutral",
  Greed = "greed",
  ExtremeGreed = "extreme_greed",
}

export interface SentimentInput {
  priceChange: number;
  volatility: number;
  volume: number;
  avgVolume: number;
  fearGreed?: number;
}

export interface SentimentScore {
  total: number;
  label: SentimentLabel;
  components: {
    price: number;
    volatility: number;
    volume: number;
    fearGreed?: number;
  };
}

/** 화면 문구. 서버가 문장을 만드는 유일한 자리이고 **예측·확신 표현을 담지 않는다.** */
export interface SentimentInterpretation {
  emoji: string;
  title: string;
  message: string;
  action: string;
  color: string;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const calculateSentimentScore = (
  input: SentimentInput
): SentimentScore => {
  // 가격 점수 (40%) — ±10% 를 0~100 으로 편다
  const priceScore = clamp(((input.priceChange + 10) / 20) * 100, 0, 100);

  // 변동성 점수 (30%) — 낮을수록 높다. 20~80 으로 눌러 극단값이 총점을 지배하지 않게 한다
  const volScore = clamp(clamp(100 - input.volatility * 5, 0, 100), 20, 80);

  // 거래량 점수 (30%) — 평균 대비 배수
  const volRatio = input.volume / input.avgVolume;
  const volumeScore = clamp(50 + (volRatio - 1) * 25, 0, 100);

  let total = priceScore * 0.4 + volScore * 0.3 + volumeScore * 0.3;
  if (input.fearGreed) {
    total = total * 0.7 + input.fearGreed * 0.3;
  }
  total = Math.round(total);

  return {
    total,
    label: labelOf(total),
    components: {
      price: Math.round(priceScore),
      volatility: Math.round(volScore),
      volume: Math.round(volumeScore),
      fearGreed: input.fearGreed,
    },
  };
};

const labelOf = (total: number): SentimentLabel => {
  if (total <= 20) return SentimentLabel.ExtremeFear;
  if (total <= 40) return SentimentLabel.Fear;
  if (total <= 60) return SentimentLabel.Neutral;
  if (total <= 80) return SentimentLabel.Greed;
  return SentimentLabel.ExtremeGreed;
};

const INTERPRETATIONS: Record<SentimentLabel, SentimentInterpretation> = {
  [SentimentLabel.ExtremeFear]: {
    emoji: "😱",
    title: "극단적 공포",
    message: "시장이 극도로 두려워하고 있습니다. 역사적으로 매수 기회!",
    action: "역발상 매수 검토",
    color: "#DC2626",
  },
  [SentimentLabel.Fear]: {
    emoji: "😰",
    title: "공포",
    message: "시장에 불안감이 있습니다.",
    action: "분할 매수 고려",
    color: "#F97316",
  },
  [SentimentLabel.Neutral]: {
    emoji: "😐",
    title: "중립",
    message: "시장이 균형 상태입니다.",
    action: "관망",
    color: "#6B7280",
  },
  [SentimentLabel.Greed]: {
    emoji: "😊",
    title: "탐욕",
    message: "시장이 낙관적입니다.",
    action: "익절 검토",
    color: "#10B981",
  },
  [SentimentLabel.ExtremeGreed]: {
    emoji: "🤑",
    title: "극단적 탐욕",
    message: "시장이 과열! 조정 가능성 높습니다.",
    action: "익절 권장",
    color: "#EF4444",
  },
};

export const interpretSentiment = (score: number): SentimentInterpretation =>
  INTERPRETATIONS[labelOf(score)];

/** 고가·저가·현재가로 만드는 변동성(%). 원문 산술 그대로다. */
export const volatilityOf = (high: number, low: number, price: number) =>
  ((high - low) / price) * 100;
