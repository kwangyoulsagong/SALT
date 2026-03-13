// src/modules/investment-insight/news-analysis.service.ts

import prisma from "../../config/database";
import { logger } from "../../config/logger";

// ─── 키워드 사전 ────────────────────────────────────────────────────────────
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

// 심볼 관련도 키워드
const SYMBOL_KEYWORDS: Record<string, string[]> = {
  BTC: ["비트코인", "Bitcoin", "BTC", "반감기", "사토시"],
  ETH: ["이더리움", "Ethereum", "ETH", "이더", "EIP"],
  XRP: ["리플", "Ripple", "XRP", "SEC", "가레링하우스"],
  SOL: ["솔라나", "Solana", "SOL"],
  ADA: ["에이다", "Cardano", "ADA"],
  DOGE: ["도지", "Dogecoin", "DOGE", "일론"],
  AVAX: ["아발란체", "Avalanche", "AVAX"],
  BNB: ["바이낸스", "Binance", "BNB"],
};

export interface NewsAnalysisResult {
  symbol: string;
  score: number; // -100 ~ +100 (양수=bullish)
  sentiment: "bullish" | "bearish" | "neutral";
  keywords: string[]; // 감지된 주요 키워드
  articleCount: number;
  summary: string; // 서술형 요약
}

export class NewsAnalysisService {
  /**
   * 전체 심볼 뉴스 분석 실행
   * InvestmentInsightWorker에서 호출
   */
  async analyzeAll(): Promise<Map<string, NewsAnalysisResult>> {
    const symbols = Object.keys(SYMBOL_KEYWORDS);
    const resultMap = new Map<string, NewsAnalysisResult>();

    await Promise.all(
      symbols.map(async (symbol) => {
        const result = await this.analyzeSymbol(symbol);
        if (result) resultMap.set(symbol, result);
      }),
    );

    logger.info(`✅ News analysis completed: ${resultMap.size} symbols`);
    return resultMap;
  }

  /**
   * 심볼별 뉴스 감성 분석
   */
  async analyzeSymbol(symbol: string): Promise<NewsAnalysisResult | null> {
    // 최근 24h 뉴스 조회
    const articles = await prisma.newsArticle.findMany({
      where: {
        publishedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        OR: [{ symbols: { has: symbol } }, ...this.buildKeywordFilter(symbol)],
      },
      orderBy: { publishedAt: "desc" },
      take: 20,
      select: {
        title: true,
        summary: true,
        content: true,
        publishedAt: true,
        sentiment: true, // 크롤러가 이미 저장한 감성 값
      },
    });

    if (articles.length === 0) return null;

    // 시간 가중치 적용 (최신일수록 높게)
    let totalScore = 0;
    const detectedBullish: string[] = [];
    const detectedBearish: string[] = [];

    for (const article of articles) {
      const text = `${article.title} ${article.summary ?? ""} ${article.content ?? ""}`;
      const hoursAgo =
        (Date.now() - new Date(article.publishedAt).getTime()) / 3600000;
      const timeWeight = Math.max(0.3, 1 - hoursAgo / 24); // 24h 전 기사는 0.3배

      // 크롤러 감성 값 우선 활용
      let articleScore = 0;
      if (article.sentiment === "positive") articleScore += 10;
      else if (article.sentiment === "negative") articleScore -= 10;

      // 키워드 스코어링
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

    // 정규화 (-100 ~ +100)
    const normalized = Math.max(
      -100,
      Math.min(100, totalScore / articles.length),
    );

    const sentiment: "bullish" | "bearish" | "neutral" =
      normalized > 15 ? "bullish" : normalized < -15 ? "bearish" : "neutral";

    const keywords = [
      ...detectedBullish.slice(0, 3),
      ...detectedBearish.slice(0, 2),
    ];

    const summary = this.buildSummary({
      symbol,
      score: normalized,
      sentiment,
      keywords: detectedBullish.slice(0, 3),
      bearishKeywords: detectedBearish.slice(0, 2),
      articleCount: articles.length,
    });

    return {
      symbol,
      score: Math.round(normalized),
      sentiment,
      keywords,
      articleCount: articles.length,
      summary,
    };
  }

  /**
   * 서술형 뉴스 요약 생성
   */
  private buildSummary(params: {
    symbol: string;
    score: number;
    sentiment: string;
    keywords: string[];
    bearishKeywords: string[];
    articleCount: number;
  }): string {
    const {
      symbol,
      score,
      sentiment,
      keywords,
      bearishKeywords,
      articleCount,
    } = params;

    const parts: string[] = [];

    // 뉴스 감성 서술
    if (sentiment === "bullish" && keywords.length > 0) {
      parts.push(`${keywords.slice(0, 2).join(", ")} 관련 긍정적 뉴스 감지`);
    } else if (sentiment === "bearish" && bearishKeywords.length > 0) {
      parts.push(
        `${bearishKeywords.slice(0, 2).join(", ")} 관련 부정적 뉴스 감지`,
      );
    } else {
      parts.push("뉴스 감성 중립");
    }

    // 기사 수
    parts.push(`최근 24h ${articleCount}건 분석`);

    // 점수 해석
    if (score > 50) parts.push("뉴스 모멘텀 강함");
    else if (score > 20) parts.push("뉴스 분위기 우호적");
    else if (score < -50) parts.push("뉴스 리스크 높음");
    else if (score < -20) parts.push("뉴스 분위기 부정적");

    return parts.join(" · ");
  }

  /**
   * Prisma OR 필터 — 심볼 관련 키워드로 기사 검색
   */
  private buildKeywordFilter(symbol: string) {
    const kws = SYMBOL_KEYWORDS[symbol] ?? [];
    return kws.map((kw) => ({
      OR: [
        { title: { contains: kw, mode: "insensitive" as const } },
        { summary: { contains: kw, mode: "insensitive" as const } },
      ],
    }));
  }
}
