import axios from 'axios';
import prisma from '../../config/database';
import { logger } from '../../config/logger';

export class MarketIntelligenceService {
  /**
   * 시장 심리 온도계 계산
   */
  async calculateSentiment(symbol: string) {
    try {
      logger.info(`😨 Calculating sentiment for ${symbol}`);

      // 1. Fear & Greed Index
      const fearGreed = await this.getFearGreedIndex();

      // 2. Upbit 시장 데이터
      const market = `KRW-${symbol}`;
      const ticker = await axios.get(`https://api.upbit.com/v1/ticker?markets=${market}`);
      const t = ticker.data[0];

      // 3. 평균 거래량 (7일)
      const candles = await axios.get(
        `https://api.upbit.com/v1/candles/days?market=${market}&count=7`
      );
      const avgVolume = candles.data.reduce((sum: number, c: any) => 
        sum + c.candle_acc_trade_price, 0) / 7;

      // 4. 변동성 계산
      const volatility = ((t.high_price - t.low_price) / t.trade_price) * 100;

      // 5. 심리 점수 계산
      const score = this.calculateScore({
        priceChange: t.signed_change_rate * 100,
        volatility,
        volume: t.acc_trade_price_24h,
        avgVolume,
        fearGreed: fearGreed?.value,
      });

      // 6. DB 저장
      const sentiment = await prisma.marketSentiment.create({
        data: {
          symbol,
          sentimentScore: score.total,
          fearGreedIndex: fearGreed?.value,
          volatility,
          volume24h: t.acc_trade_price_24h,
          priceChange24h: t.signed_change_rate * 100,
          sentimentLabel: score.label,
        },
      });

      return {
        ...sentiment,
        interpretation: this.interpretSentiment(score.total),
        components: score.components,
      };
    } catch (error: any) {
      logger.error('Sentiment error:', error.message);
      throw error;
    }
  }

  /**
   * 똑똑한 돈 추적
   */
  async trackSmartMoney(symbol: string) {
    try {
      logger.info(`🐋 Tracking smart money for ${symbol}`);

      const market = `KRW-${symbol}`;

      // 1. 최근 200개 체결 내역
      const trades = await axios.get(
        `https://api.upbit.com/v1/trades/ticks?market=${market}&count=200`
      );

      // 2. 대량 거래 필터 (5천만원 이상)
      const largeTrades = trades.data.filter(
        (t: any) => t.trade_price * t.trade_volume >= 50000000
      );

      // 3. 매수/매도 분류
      const largeBuys = largeTrades.filter((t: any) => t.ask_bid === 'bid');
      const largeSells = largeTrades.filter((t: any) => t.ask_bid === 'ask');

      // 4. 호가창 분석
      const orderbook = await axios.get(`https://api.upbit.com/v1/orderbook?markets=${market}`);
      const ob = orderbook.data[0];
      
      const totalBids = ob.orderbook_units.reduce(
        (sum: number, u: any) => sum + u.bid_size, 0
      );
      const totalAsks = ob.orderbook_units.reduce(
        (sum: number, u: any) => sum + u.ask_size, 0
      );

      // 5. 스마트 머니 지수 계산
      const index = this.calculateSmartMoneyIndex({
        largeBuys: largeBuys.length,
        largeSells: largeSells.length,
        bidPressure: totalBids,
        askPressure: totalAsks,
      });

      // 6. DB 저장 (대량 거래)
      for (const trade of largeTrades.slice(0, 10)) {
        await prisma.whaleTransaction.create({
          data: {
            symbol,
            transactionType: trade.ask_bid === 'bid' ? 'buy' : 'sell',
            amount: trade.trade_volume,
            amountKRW: trade.trade_price * trade.trade_volume,
            exchange: 'upbit',
          },
        });
      }

      return {
        smartMoneyIndex: index,
        signals: {
          largeTrades: largeTrades.length,
          largeBuys: largeBuys.length,
          largeSells: largeSells.length,
          orderbookRatio: (totalBids / totalAsks).toFixed(2),
        },
        interpretation: this.interpretSmartMoney(index.score),
      };
    } catch (error: any) {
      logger.error('Smart money error:', error.message);
      throw error;
    }
  }

  /**
   * Fear & Greed Index
   */
  private async getFearGreedIndex() {
    try {
      const res = await axios.get('https://api.alternative.me/fng/');
      return {
        value: parseInt(res.data.data[0].value),
        classification: res.data.data[0].value_classification,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 심리 점수 계산
   */
  private calculateScore(params: {
    priceChange: number;
    volatility: number;
    volume: number;
    avgVolume: number;
    fearGreed?: number;
  }) {
    // 가격 점수 (40%)
    let priceScore = ((params.priceChange + 10) / 20) * 100;
    priceScore = Math.max(0, Math.min(100, priceScore));

    // 변동성 점수 (30%)
    let volScore = Math.max(0, 100 - params.volatility * 5);
    volScore = Math.max(20, Math.min(80, volScore));

    // 거래량 점수 (30%)
    const volRatio = params.volume / params.avgVolume;
    let volumeScore = 50 + (volRatio - 1) * 25;
    volumeScore = Math.max(0, Math.min(100, volumeScore));

    // 종합 점수
    let total = priceScore * 0.4 + volScore * 0.3 + volumeScore * 0.3;
    
    if (params.fearGreed) {
      total = total * 0.7 + params.fearGreed * 0.3;
    }

    total = Math.round(total);

    // 라벨
    let label: string;
    if (total <= 20) label = 'extreme_fear';
    else if (total <= 40) label = 'fear';
    else if (total <= 60) label = 'neutral';
    else if (total <= 80) label = 'greed';
    else label = 'extreme_greed';

    return {
      total,
      label,
      components: {
        price: Math.round(priceScore),
        volatility: Math.round(volScore),
        volume: Math.round(volumeScore),
        fearGreed: params.fearGreed,
      },
    };
  }

  /**
   * 심리 해석
   */
  private interpretSentiment(score: number) {
    if (score <= 20) {
      return {
        emoji: '😱',
        title: '극단적 공포',
        message: '시장이 극도로 두려워하고 있습니다. 역사적으로 매수 기회!',
        action: '역발상 매수 검토',
        color: '#DC2626',
      };
    } else if (score <= 40) {
      return {
        emoji: '😰',
        title: '공포',
        message: '시장에 불안감이 있습니다.',
        action: '분할 매수 고려',
        color: '#F97316',
      };
    } else if (score <= 60) {
      return {
        emoji: '😐',
        title: '중립',
        message: '시장이 균형 상태입니다.',
        action: '관망',
        color: '#6B7280',
      };
    } else if (score <= 80) {
      return {
        emoji: '😊',
        title: '탐욕',
        message: '시장이 낙관적입니다.',
        action: '익절 검토',
        color: '#10B981',
      };
    } else {
      return {
        emoji: '🤑',
        title: '극단적 탐욕',
        message: '시장이 과열! 조정 가능성 높습니다.',
        action: '익절 권장',
        color: '#EF4444',
      };
    }
  }

  /**
   * 스마트 머니 지수 계산
   */
  private calculateSmartMoneyIndex(params: {
    largeBuys: number;
    largeSells: number;
    bidPressure: number;
    askPressure: number;
  }) {
    // 대량 거래 점수
    const tradeScore = (params.largeBuys - params.largeSells) * 10;

    // 호가창 점수
    const imbalance = (params.bidPressure - params.askPressure) / 
                     (params.bidPressure + params.askPressure);
    const orderbookScore = imbalance * 50;

    // 종합 점수 (-100 ~ 100)
    let score = tradeScore + orderbookScore;
    score = Math.max(-100, Math.min(100, score));

    let signal: string;
    if (score >= 60) signal = '강한 매수';
    else if (score >= 20) signal = '매수 우세';
    else if (score >= -20) signal = '중립';
    else if (score >= -60) signal = '매도 우세';
    else signal = '강한 매도';

    return { score: Math.round(score), signal };
  }

  /**
   * 스마트 머니 해석
   */
  private interpretSmartMoney(score: number) {
    if (score >= 60) {
      return {
        emoji: '🐋💰',
        title: '고래들이 사고 있어요!',
        message: '대량 매수 + 호가창 매수 우세',
        action: '매수 타이밍',
        color: '#DC2626',
      };
    } else if (score >= 20) {
      return {
        emoji: '📈',
        title: '매수세 우세',
        message: '스마트 머니가 들어오고 있습니다',
        action: '주시',
        color: '#F97316',
      };
    } else if (score >= -20) {
      return {
        emoji: '😐',
        title: '중립',
        message: '특별한 움직임 없음',
        action: '관망',
        color: '#6B7280',
      };
    } else if (score >= -60) {
      return {
        emoji: '📉',
        title: '매도세 우세',
        message: '스마트 머니가 빠져나가는 중',
        action: '주의',
        color: '#3B82F6',
      };
    } else {
      return {
        emoji: '🐋📉',
        title: '고래들이 팔고 있어요!',
        message: '대량 매도 + 호가창 매도 우세',
        action: '매도 검토',
        color: '#8B5CF6',
      };
    }
  }

  /**
   * 심리 히스토리
   */
  async getSentimentHistory(symbol: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return await prisma.marketSentiment.findMany({
      where: {
        symbol,
        calculatedAt: { gte: since },
      },
      orderBy: { calculatedAt: 'asc' },
      select: {
        sentimentScore: true,
        sentimentLabel: true,
        calculatedAt: true,
      },
    });
  }

  /**
   * 최근 고래 거래
   */
  async getRecentWhaleTransactions(symbol: string, limit: number = 20) {
    return await prisma.whaleTransaction.findMany({
      where: { symbol },
      orderBy: { detectedAt: 'desc' },
      take: limit,
    });
  }
}
