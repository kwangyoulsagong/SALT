/**
 * 목표 비중 안내 문구 (F010 슬라이스 5 · `FE-REQ-042` · `i18n-policy.md`).
 *
 * - **추천이 아니라 비중 안내**다. 오를 종목을 고르지 않는다 — 보유 + BTC · ETH 를 변동성만으로 나눈 계산을 되읽는다
 * - 명령형 · 확신 · 목표가 0(마스터 인덱스 §6). "사세요 · 파세요 · 줄이세요"가 없다. 차는 숫자와 "부족 · 초과 · 맞음"
 * - 3종 고지 — 근거(규칙 · σ) · 과거 성적(8년 주간 백테스트) · 실패 사례(놓친 상승 · 가장 크게 잃은 달)를 늘 같이
 * - "나았다 · 덜 빠졌다"는 서버 `claims` 가 참일 때만. 거짓이면 **증명하지 못했다고 쓴다**(사전등록 [claims])
 * - 알트(`target-weight@2` 채택 없음)는 **목표 비중이 없다고만** 쓴다. "줄이세요 · 파세요"가 아니다 — 부족 · 초과를 만들지 않는다
 * - 라이브 원장은 30주 전에는 진행(n/30)만. 숫자 문장은 30주 뒤(사전등록 [live.display])
 */
export const TARGET_WEIGHT_MESSAGES = {
  heading: "이번 주 목표 비중",
  description: "BTC · ETH 를 변동성만으로 나눴어요. 오를 종목을 고르지 않고, 확률도 말하지 않아요",
  status: { under: "부족", over: "초과", at: "맞음", no_room: "현금 없음" } as const,
  weights: (target: string, current: string) => `목표 ${target} · 지금 ${current}`,
  gap: (amount: string, quantity: string, symbol: string) => `목표와의 차 ${amount}원 (${quantity} ${symbol})`,
  atGap: "차가 최소 주문 금액(5,000원)보다 작아요",
  noRoomGap: "투자금 안에 남은 현금이 없어 부족분을 원으로 옮기지 않았어요",
  cappedGap: "투자금 안에 남은 현금만큼으로 줄인 값이에요",
  basisLine: (sigma: string) => `변동성 연 ${sigma}`,
  stopLine: (price: string, loss: string) => `손절선 ${price}원 · 목표 비중으로 들고 닿으면 ${loss}원`,
  notHeld: "보유 없음",
  totals: (target: string, current: string, cash: string) =>
    `코인 목표 합 ${target} · 지금 ${current} · 나머지 ${cash}는 현금`,
  lossTotal: (amount: string) => `모두 손절선에 닿으면 ${amount}원`,
  lossBudget: (rate: string) => ` · 이번 달 남은 손실 예산의 ${rate}`,
  beta: (sum: string) => `목표대로면 BTC 와 같이 움직이는 정도 ${sum}`,
  capital: (amount: string) => `전체 ${amount}원 기준`,
  basisCryptoValue:
    "투자금을 정하지 않아 코인 평가금 합을 전체로 봤어요. 현금이 있으면 실제 비중은 이보다 낮아요",
  capitalBelowHoldings: "적은 투자금이 코인 보유보다 작아 코인 평가금 합을 전체로 봤어요",
  setCapital: "투자금 적기",
  setCapitalLabel: "코치 리포트에서 투자금 · 목표 변동성 적기",
  noCapital: "투자금도 보유도 없어 원으로 옮기지 못했어요. 목표 비중(%)만 보여요",
  excluded: {
    volatility_unavailable: "변동성 이력이 부족해 비중에서 뺐어요",
    price_unavailable: "시세가 없어 비중에서 뺐어요",
    no_record: "알트는 과거 기록이 비중을 뒷받침하지 않아 목표 비중이 없어요",
  } as const,
  outsideRule: (rate: string) => `규칙 밖 보유 ${rate}는 계산에 넣지 않았어요 — 줄이라는 뜻이 아니에요`,
  altRecordHeading: "알트를 넣지 않는 근거",
  altRecordLine: (share: string, cagr: string, coreCagr: string) =>
    `알트에 위험 몫 ${share}를 주면 연 ${cagr} · BTC · ETH 만이면 연 ${coreCagr}`,
  altRecordVerdict: "모든 목표 변동성에서 BTC · ETH 만 쓸 때보다 나빴어요",
  altRecordBias: "상장폐지 종목이 빠진, 알트에 유리한 기록인데도 그랬어요",
  invalidationHeading: "이 안내가 낡는 때",
  expires: (at: string) => `${at}(다음 월요일 09:00)`,
  sigmaDrift: "변동성이 계산 때보다 ±25% 넘게 움직일 때",
  stopHit: "가격이 손절선에 닿을 때",
  disclosureHeading: "이 규칙의 근거 · 과거 · 빗나간 때",
  rule: (target: string, isDefault: boolean) =>
    `변동성이 큰 종목일수록 적게, 합친 변동성이 연 ${target}${isDefault ? "(기본값)" : ""}이 되게 나눠요. 한 종목은 상한까지만, 남는 몫은 현금이에요`,
  recordWindow: (from: string, to: string, fee: string) =>
    `과거 기록 · ${from} ~ ${to} · BTC · ETH · 매주 맞춤 · 수수료 편도 ${fee}`,
  recordTarget: (target: string) => `기록은 목표 변동성 ${target} 기준이에요`,
  recordLine: (cagr: string, mdd: string) => `이 규칙 연 ${cagr} · 최대 낙폭 ${mdd}`,
  holdLine: (cagr: string, mdd: string) => `BTC 만 들고 있었다면 연 ${cagr} · 최대 낙폭 ${mdd}`,
  upside: (rate: string) => `오른 달 상승의 ${rate}만 따라갔어요`,
  claimLessDrawdown: "BTC 만 들고 있을 때보다 최대 낙폭이 작았어요",
  claimTiming: "같은 비중을 고정으로 둔 것보다 나았어요",
  claimNoTiming: "같은 비중을 고정으로 둔 것과 차이를 증명하지 못했어요",
  claimTargetHit: (vol: string) => `실현 변동성이 목표 근처였어요(연 ${vol})`,
  claimVolOnly: (vol: string) => `실현 변동성 연 ${vol}`,
  missedHeading: "크게 놓친 상승",
  worstHeading: "가장 크게 잃은 달",
  monthLine: (month: string, strategy: string, btc: string) => `${month} · 이 규칙 ${strategy} · BTC ${btc}`,
  doesNot: "이 안내는 주문하지 않아요 · 오를 확률이나 기대수익을 말하지 않아요 · 실행은 직접 해요",
  backtestLabel: "백테스트",
  liveLabel: "라이브",
  livePending: (start: string) => `라이브 채점은 ${start}부터 매주 쌓여요 · 30주 전에는 백테스트 기록만 써요`,
  liveProgress: (n: number, min: number) => `라이브 채점 중 ${n}/${min}주 · 그 전에는 백테스트 기록만 써요`,
  liveRecordLine: (weeks: number, cum: string, mdd: string) => `라이브 ${weeks}주 · 이 규칙 누적 ${cum} · 최대 낙폭 ${mdd}`,
  liveHoldLine: (cum: string, mdd: string) => `같은 주 BTC 만 들고 있었다면 누적 ${cum} · 최대 낙폭 ${mdd}`,
  liveWorstHeading: "라이브에서 가장 크게 잃은 주",
  weekLine: (week: string, strategy: string, btc: string) => `${week} 주 · 이 규칙 ${strategy} · BTC ${btc}`,
  liveStartFallback: "2026년 10월 5일",
  /** 투자 화면 요약 띠 한 칸(`TargetWeightSummary`) — 3종 고지를 한 줄로 */
  summary: {
    weight: (symbol: string, weight: string) => `${symbol} ${weight}`,
    cash: (weight: string) => `현금 ${weight}`,
    basis: "변동성만으로 나눈 계산",
    backtest: (cagr: string, mdd: string, btcMdd: string) => `백테스트 연 ${cagr} · 최대 낙폭 ${mdd}(BTC ${btcMdd})`,
    live: (weeks: number, cum: string, mdd: string, btcMdd: string) =>
      `라이브 ${weeks}주 누적 ${cum} · 최대 낙폭 ${mdd}(BTC ${btcMdd})`,
    worst: (month: string, rate: string) => `가장 크게 잃은 달 ${month} ${rate}`,
    worstWeek: (week: string, rate: string) => `가장 크게 잃은 주 ${week} ${rate}`,
  },

  blocked: {
    no_volatility: "변동성 기록이 있는 종목이 없어 목표 비중을 계산하지 못했어요",
    stale_inputs: "시세나 변동성 데이터가 제때 갱신되지 않아 목표 비중을 잠시 보이지 않아요",
    disclosure_missing: "과거 성적 · 빗나간 사례를 함께 보일 수 없어 목표 비중을 보이지 않아요",
  } as const,
  unavailable: "지금은 목표 비중을 불러올 수 없어요",
} as const;
