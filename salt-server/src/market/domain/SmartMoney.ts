/**
 * 스마트 머니 지수 — 대량 체결과 호가 불균형으로 만드는 -100~100 점수.
 *
 * 원문(`market-intelligence.service`)의 산술을 그대로 옮겼다. **대량 거래 기준
 * 5천만원은 여기가 아니라 `infrastructure` 에 있다** — 그건 거래소 응답을 거르는
 * 기준이고, 이 파일은 이미 걸러진 수를 받는다.
 */

export interface SmartMoneyInput {
  largeBuys: number;
  largeSells: number;
  bidPressure: number;
  askPressure: number;
}

export interface SmartMoneyIndex {
  score: number;
  signal: string;
}

export interface SmartMoneyInterpretation {
  emoji: string;
  title: string;
  message: string;
  action: string;
  color: string;
}

export const calculateSmartMoneyIndex = (
  input: SmartMoneyInput
): SmartMoneyIndex => {
  const tradeScore = (input.largeBuys - input.largeSells) * 10;

  const imbalance =
    (input.bidPressure - input.askPressure) /
    (input.bidPressure + input.askPressure);
  const orderbookScore = imbalance * 50;

  const score = Math.max(-100, Math.min(100, tradeScore + orderbookScore));

  return { score: Math.round(score), signal: signalOf(score) };
};

const signalOf = (score: number): string => {
  if (score >= 60) return "강한 매수";
  if (score >= 20) return "매수 우세";
  if (score >= -20) return "중립";
  if (score >= -60) return "매도 우세";
  return "강한 매도";
};

export const interpretSmartMoney = (
  score: number
): SmartMoneyInterpretation => {
  if (score >= 60) {
    return {
      emoji: "🐋💰",
      title: "고래들이 사고 있어요!",
      message: "대량 매수 + 호가창 매수 우세",
      action: "매수 타이밍",
      color: "#DC2626",
    };
  }
  if (score >= 20) {
    return {
      emoji: "📈",
      title: "매수세 우세",
      message: "스마트 머니가 들어오고 있습니다",
      action: "주시",
      color: "#F97316",
    };
  }
  if (score >= -20) {
    return {
      emoji: "😐",
      title: "중립",
      message: "특별한 움직임 없음",
      action: "관망",
      color: "#6B7280",
    };
  }
  if (score >= -60) {
    return {
      emoji: "📉",
      title: "매도세 우세",
      message: "스마트 머니가 빠져나가는 중",
      action: "주의",
      color: "#3B82F6",
    };
  }
  return {
    emoji: "🐋📉",
    title: "고래들이 팔고 있어요!",
    message: "대량 매도 + 호가창 매도 우세",
    action: "매도 검토",
    color: "#8B5CF6",
  };
};
