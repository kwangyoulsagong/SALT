import type { CoachArticle, NewsAnalysisResult } from "../model";

/**
 * 뉴스 감성 — `news-analysis.service` 에서 옮겨온 **순수 계산**.
 *
 * ## 사전이 `coach` 에 있는 이유
 *
 * 이 키워드 표는 "뉴스가 무엇인가"가 아니라 **"무엇을 호재로 보는가"** 다. 판단이므로
 * `news` 가 아니라 여기 산다. `news` 는 기사를 주고, 점수는 코치가 매긴다.
 *
 * 기사 조회는 `NewsProbe` 가 한다 — 원문은 `prisma.newsArticle` 을 직접 뒤졌다.
 * `SYMBOL_KEYWORDS` 는 그 조회의 검색어로도 쓰이므로 **조회와 채점이 같은 표를 본다.**
 */

const BULLISH_KEYWORDS: Record<string, number> = {
  // 규제/제도
  "ETF 승인": 15,
  ETF: 8,
  승인: 6,
  합법화: 10,
  제도권: 8,
  "규제 완화": 10,
  친암호화폐: 8,
  라이선스: 5,
  // 기관
  "기관 매수": 12,
  "기관 투자": 10,
  헤지펀드: 7,
  자산운용: 6,
  "대규모 매수": 12,
  "대량 매수": 12,
  축적: 8,
  매집: 10,
  // 거시경제
  "금리 인하": 12,
  "금리 동결": 6,
  양적완화: 10,
  "달러 약세": 8,
  "인플레이션 둔화": 7,
  "경기 회복": 6,
  // 기술/생태계
  반감기: 10,
  업그레이드: 7,
  메인넷: 8,
  파트너십: 6,
  채택: 8,
  통합: 5,
  출시: 6,
  개발: 4,
  // 수요
  급등: 8,
  상승: 5,
  돌파: 8,
  신고가: 12,
  저점: 6,
  매수세: 8,
  순유입: 10,
  "자금 유입": 10,
};

const BEARISH_KEYWORDS: Record<string, number> = {
  // 규제/제도
  규제: 8,
  금지: 12,
  제재: 10,
  단속: 8,
  조사: 6,
  소송: 8,
  기소: 10,
  불법: 10,
  SEC: 5,
  // 매크로
  "금리 인상": 12,
  긴축: 10,
  "달러 강세": 8,
  경기침체: 10,
  인플레이션: 6,
  불황: 8,
  // 시장
  급락: 10,
  하락: 5,
  붕괴: 12,
  폭락: 12,
  매도세: 8,
  순유출: 10,
  "자금 유출": 10,
  // 리스크
  해킹: 12,
  스캠: 12,
  사기: 10,
  파산: 12,
  청산: 10,
  디페깅: 10,
  뱅크런: 12,
  "유동성 위기": 12,
  // 고래
  "대량 매도": 12,
  "대규모 매도": 12,
  덤핑: 10,
};

/** 심볼 관련도 키워드. 조회 필터와 채점이 같은 표를 쓴다. */
export const SYMBOL_KEYWORDS: Record<string, string[]> = {
  BTC: ["비트코인", "Bitcoin", "BTC", "반감기", "사토시"],
  ETH: ["이더리움", "Ethereum", "ETH", "이더", "EIP"],
  XRP: ["리플", "Ripple", "XRP", "SEC", "가레링하우스"],
  SOL: ["솔라나", "Solana", "SOL"],
  ADA: ["에이다", "Cardano", "ADA"],
  DOGE: ["도지", "Dogecoin", "DOGE", "일론"],
  AVAX: ["아발란체", "Avalanche", "AVAX"],
  BNB: ["바이낸스", "Binance", "BNB"],
};

/** 분석 대상 심볼. 사전에 있는 것만 본다 — 원문과 같다. */
export const NEWS_ANALYSIS_SYMBOLS = Object.keys(SYMBOL_KEYWORDS);

/** 기사 하나가 이 시간보다 오래되면 가중치가 0.3 까지 내려간다. */
const NEWS_WINDOW_HOURS = 24;

const buildSummary = (params: {
  score: number;
  sentiment: string;
  keywords: string[];
  bearishKeywords: string[];
  articleCount: number;
}): string => {
  const { score, sentiment, keywords, bearishKeywords, articleCount } = params;
  const parts: string[] = [];

  if (sentiment === "bullish" && keywords.length > 0) {
    parts.push(`${keywords.slice(0, 2).join(", ")} 관련 긍정적 뉴스 감지`);
  } else if (sentiment === "bearish" && bearishKeywords.length > 0) {
    parts.push(
      `${bearishKeywords.slice(0, 2).join(", ")} 관련 부정적 뉴스 감지`
    );
  } else {
    parts.push("뉴스 감성 중립");
  }

  parts.push(`최근 24h ${articleCount}건 분석`);

  if (score > 50) parts.push("뉴스 모멘텀 강함");
  else if (score > 20) parts.push("뉴스 분위기 우호적");
  else if (score < -50) parts.push("뉴스 리스크 높음");
  else if (score < -20) parts.push("뉴스 분위기 부정적");

  return parts.join(" · ");
};

/**
 * 기사 묶음 → 감성 한 건. 기사가 없으면 `null` 이다.
 *
 * **시간 가중치**: 지금에 가까울수록 1 에 가깝고 24시간 전이면 0.3 이다.
 * `now` 를 주입한다 — 도메인이 `Date.now()` 를 부르면 테스트가 시간에 묶인다.
 */
export const analyzeNewsSentiment = (
  symbol: string,
  articles: CoachArticle[],
  now: Date
): NewsAnalysisResult | null => {
  if (articles.length === 0) return null;

  let totalScore = 0;
  const detectedBullish: string[] = [];
  const detectedBearish: string[] = [];

  for (const article of articles) {
    const text = `${article.title} ${article.summary ?? ""} ${article.content ?? ""}`;
    const hoursAgo =
      (now.getTime() - new Date(article.publishedAt).getTime()) / 3600000;
    const timeWeight = Math.max(0.3, 1 - hoursAgo / NEWS_WINDOW_HOURS);

    // 크롤러가 이미 매긴 감성이 있으면 먼저 반영한다
    let articleScore = 0;
    if (article.sentiment === "positive") articleScore += 10;
    else if (article.sentiment === "negative") articleScore -= 10;

    for (const [kw, score] of Object.entries(BULLISH_KEYWORDS)) {
      if (text.includes(kw)) {
        articleScore += score;
        if (!detectedBullish.includes(kw)) detectedBullish.push(kw);
      }
    }

    for (const [kw, score] of Object.entries(BEARISH_KEYWORDS)) {
      if (text.includes(kw)) {
        articleScore -= score;
        if (!detectedBearish.includes(kw)) detectedBearish.push(kw);
      }
    }

    totalScore += articleScore * timeWeight;
  }

  const normalized = Math.max(
    -100,
    Math.min(100, totalScore / articles.length)
  );

  const sentiment: NewsAnalysisResult["sentiment"] =
    normalized > 15 ? "bullish" : normalized < -15 ? "bearish" : "neutral";

  const keywords = [
    ...detectedBullish.slice(0, 3),
    ...detectedBearish.slice(0, 2),
  ];

  return {
    symbol,
    score: Math.round(normalized),
    sentiment,
    keywords,
    articleCount: articles.length,
    summary: buildSummary({
      score: normalized,
      sentiment,
      keywords: detectedBullish.slice(0, 3),
      bearishKeywords: detectedBearish.slice(0, 2),
      articleCount: articles.length,
    }),
  };
};
