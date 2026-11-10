# 시세 수집 · 수면 뒤 백필 조사 — 코인 · 국내 주식 같이 (2026-11-10)

읽기 전용 조사. 파일 변경 없음. DB 는 `default_transaction_read_only=on` 으로만 조회. 거래소 공개 API 는 대조용으로 몇 번 직접 불렀다.

## 0. 한 줄 결론

| 증상 | 진짜 원인 | 우리 결함인가 |
|---|---|---|
| 코인 14개 일봉 6~44개 → d1 지표 없음 | **업비트 KRW 마켓이 그 날 생겼다.** KRW 일봉이 거래소에도 그만큼만 있다(BTC-/USDT- 마켓엔 200개 넘게 있다). 지표가 **전부 아니면 0**이라 50봉 미만이면 RSI 까지 빠진다 | 수집은 아니고 **지표 문턱이 결함** |
| 코인 5분봉 구멍(BTC 3회, 2h50~5h05) | 정기 수집이 **최근 N개만** 받는다. `count: 288` 을 보내지만 거래소 상한 200 이라 **16시간 40분**만 덮는다 → 그보다 길게 잤으면 앞부분이 영구 구멍 | **결함** |
| 국내 "57 중 53만 지표" | 57 은 `kr_stock_quotes` 행 수(유니버스에서 밀려난 7종목 포함). 현재 유니버스는 **50**(시총 상위 50, 보유 · 관심 0) | 세는 기준이 틀림 + 아래 둘 |
| 국내 현재 유니버스 8종목 m5 · h1 지표가 1~5일 묵음 | 실시간 슬롯(41) 밖 종목은 5분봉이 **15:40 · 20:40 보정 회차에서만** 생긴다. 그 회차가 수면 · KIS 한도 초과로 빠지면 다음 날 15:40 까지 비고, 부팅 · 깨어남엔 안 돈다 | **결함** |
| 국내 일봉 부팅 회차 50 중 8 실패 · 오늘 80분 EGW00201 1,087건 | 페이서 기본 **3건/s** 인데 모의 서버 실처리량 ≈ **2건/s** | **결함(설정)** |

## 1. 지금 코드가 하는 일 (file:line)

### 1.1 코인(업비트) — `salt-server` 프로세스 안 cron

| 무엇 | 어디 | 동작 |
|---|---|---|
| 상장 목록 | `workers/market.worker.ts:35-38` `0 */6 * * *` + 부팅 | `SyncMarketListings` → `market_assets` upsert(`PrismaMarketAssetRepository.ts:174-192`, `listed_at = 처음 본 시각`) |
| 5분봉 · 일봉 | `market.worker.ts:49-52` `*/5` + 부팅 | `CollectPriceHistory`(`SyncMarketData.ts:95-147`). 활성 코인 300종목을 4개씩(`:84`) 돌며 `COLLECT_TARGETS`(`:66-69`) = **5m 288개 · 1d 120개를 `to` 없이 "최신부터"** 받는다 |
| 1시간봉 | 수집 안 함 | 지표 계산 때 5분봉 1,200개를 묶는다(`RefreshTechnicalIndicators.ts:22-31`) |
| 일봉 과거 | 수동 스크립트 `npm run candles:backfill` | `BackfillDailyHistory`(`SyncMarketData.ts:168-221`) — **가장 오래된 봉 앞**만 400일까지. 저장된 봉이 없는 심볼은 건너뜀(`:191`) |
| 보관 | `SyncMarketData.ts:75-78` | 5m 30일 · 1d 2년(국내 1d 예외) |
| 지표 | `market.worker.ts:61-66` `*/2` | `RefreshTechnicalIndicators.ts:97-116` — 봉 < `MIN_CANDLES_FOR_INDICATORS`(=50, `domain/Indicators.ts:38`)면 **아무 것도 안 쓴다**(`:103`) |
| 저장 | `PrismaPriceHistoryRepository.ts:48-52` | `ON CONFLICT … DO UPDATE … WHERE (o,h,l,c,v) IS DISTINCT FROM EXCLUDED` — 규칙 지킴 |
| 페이서 | `UpbitClient.ts:49-55` | 캔들 그룹 8건/s(한도 10) |

- **간격 · 수면 뒤**: 커서가 없다. 깨어난 첫 회차가 최근 200개(16h40m)만 받는다. 그 앞은 다시 안 본다 → 수면 길이 − 16h40m 이 구멍.
- **새 종목 합류**: 첫 회차에 일봉 120개 · 5분봉 200개. 그 이상 과거는 수동 백필만.
- **BFF 시세 워커**(`bff/src/workers/price-updater.worker.ts`)는 WS 시세로 관심 · 보유 **가격만** 쓴다. 봉 없음.

### 1.2 국내 주식(KIS 모의) — 같은 프로세스, `Asia/Seoul` cron

| 무엇 | 어디 | 동작 |
|---|---|---|
| 유니버스 | `SyncKrStock.ts:47-63` | 보유 ∪ 관심 ∪ 시총 상위 `KIS_UNIVERSE_TOP_N`(기본 50, `env.ts:59`). **DB 에 저장 안 함** — 매번 계산 |
| 일봉 | `kr-stock.worker.ts:51` 평일 15:45 `catchUp` + 부팅(`:120`) | `SyncKrDailyCandles`(`SyncKrStock.ts:220-268`) — 처음 보는 종목 2년(`:162`), 아니면 **마지막 봉 −14일 ~ 오늘**(`:170`, `:246`). 커서가 있어 며칠 빠져도 자가 복구 |
| 전 종목 일봉 5년 | `:54-55` 평일 18:00 · 주말 08:00 | `SyncKrFullDailyCandles` — 밤 배치 |
| 5분봉(장중) | 실시간 WS 체결 집계, 슬롯 41(`RunKrRealtime.ts:36`) | 슬롯 밖 9종목 이상은 장중 5분봉 없음 |
| 5분봉(보정 · 백필) | `:57` 평일 15:40 · 20:40 `catchUp`. **부팅 목록(`:110-130`)에 없다** | `SyncKrMinuteBars`(`SyncKrStock.ts:578-646`) — 오늘 + 지난 29일 중 봉 < 70 인 날, 회차 1,200호출 상한(`:559`) |
| 페이서 | `KisClient.ts:150` · `env.ts:58` | **3건/s**(설정 없음 → 기본값). 초과 시 1→8초 쿨다운 |
| 놓친 회차 | `shared/infrastructure/scheduler.ts:15-21` | node-cron v4 `missed execution` 이벤트 → 깨어난 자리에서 **한 번**. 매분 작업 · 플래그 없는 작업은 그냥 사라짐 |

## 2. 근본 원인 — DB · 로그 근거

### 2.1 코인 14종목 짧은 일봉 — 거래소 KRW 이력 자체가 짧다

```
symbol  listed_at  n1d first1d       업비트 KRW days(count=200) 가장 오래된 봉
CARDS   11-05      6   11-05         6  2026-11-05
NIL     10-27      15  10-27   BMT 10-25 18 · AXIS 21 · MPLX 22 · CT 23 · PUFFER 27
RSR     10-23      30  10-12         30 2026-10-12   (BTC-RSR 은 200개 이상)
GTC     10-23      30  10-12         30 2026-10-12
KAIA    10-23      33  10-09         33 2026-10-09
PONS    10-08      34  10-08         34 · NMR 36(10-06) · POD 40 · CASHCAT 44
```

- 우리 수집은 처음 본 회차에 120일을 요청했고 거래소가 가진 만큼 다 받았다. **수집 누락이 아니다.**
- 막힌 곳은 `RefreshTechnicalIndicators.ts:103` — RSI14 는 15봉, MA20 은 20봉이면 되는데 MA50 문턱(50)으로 **한 벌 전체를 버린다.** 그래서 장기 판단(`coach/application/lib/judgeSymbols.ts:191` `indicators[mode]?.rsi14`)에 RSI 가 없다.
- 덤: `listed_at` 이 첫 봉보다 최대 11일 늦다(RSR 10-12 → 10-23). 상장 목록이 6시간마다 + 부팅에만 돈다 · 그동안 서버가 꺼져 있었던 것. 120일 요청이 덮어서 데이터 손실은 없다.
- 비활성 7종목(SXP · IP · FLOW …)은 일봉 0개 · `delisted_at 11-10 05:09` — 오늘 상폐 표시. 지표 대상 아님(정상).

### 2.2 코인 5분봉 구멍 — 고정 개수 + 거래소 상한 200

```sql
-- BTC 5분봉 구멍(거래 없는 5분은 BTC 엔 없다)
gap_start            gap_end              len
2026-10-31 10:05  →  12:55   02:50
2026-11-07 03:15  →  08:05   04:50
2026-11-08 16:55  →  22:00   05:05
```

- `count=288` 실호출 → **200개만** 온다(2026-11-09 22:50 ~ 11-10 15:25 KST). 288 은 거래소가 말없이 자른다.
- 구멍 길이 = 수면 길이 − 16h40m 과 맞는다(예: 11-07 03:15 에 잠들어 약 21시간 뒤 깨어남 → 깨어난 회차가 08:05 이후만 받음).
- 1시간봉 지표는 이 5분봉을 묶어 만든다(`aggregateCandles`) → 구멍 시간대는 **봉이 빠지거나 일부만 든 시간봉**이 된다. m5 · h1 RSI 가 조용히 틀린다.

### 2.3 국내 — 세는 기준 · 슬롯 밖 5분봉 · 한도 초과

- `kr_stock_quotes` 57행 = 현재 유니버스 50 + 밀려난 7(LIG디펜스 10-07 · HD현대 10-09 · 한화시스템 10-25 · KODEX 인버스 10-29 · 두산 10-30 · 알테오젠 · 미래에셋증권 11-10 아침). 보유 0 · 관심 0.
  - LIG(079550): 일봉 1,239개인데 5분봉 0 · 지표 0 — 5분봉 수집 시작(10-12) 전에 빠졌다.
  - KODEX 인버스(114800): 일봉 0 · 5분봉 2 — 10-29 오전 잠깐 유니버스에 들었다 15:45 일봉 회차 전에 빠졌다(**합류 즉시 백필이 없다**).
- 현재 유니버스 50 중 **m5 · h1 지표가 묵은 8종목**(포스코퓨처엠 11-06 · S-Oil 11-05 · 삼성E&A 11-05 · KT 11-06 · LG · 삼성중공업 · 한진칼 · HD현대일렉트릭 11-09). d1 은 전부 최신.
  - 일별 5분봉 종목 수: 10-30 51 · 11-02 53 · 11-03 52 · 11-04 51 · 11-05 51 · **11-06 48 · 11-09 46** · 11-10 42(장중 — 슬롯 41 + 1). 보정 회차가 빠진 날이 메워지지 않았다.
  - 서버 로그(`~/Library/Logs/salt-server.log.1`, 11-10 14:10 기동 뒤 80분): **EGW00201 1,087건**(현재가 928 · 기간별 시세 68 …), 부팅 일봉 `종목 50 · 실패 8` 전부 EGW00201. 이전 로그는 회전으로 없음.
  - 장중엔 매분 현재가 폴링(슬롯 밖) · 프로그램 · 업종 · VI 가 2건/s 한 줄을 나눠 쓴다. 15:40 보정 회차가 그 꼬리에 붙으니 실패가 쌓이고, 남은 날은 **다음 날 15:40** 에야 다시 본다.

## 3. 외부 API 사실

| 항목 | 값 | 근거 |
|---|---|---|
| 업비트 캔들 그룹 한도 | **IP 당 10건/s**(초 · 분 · 일 · 주 … 공유). `Remaining-Req: group=candles; min=600; sec=9` — `min` 은 폐기 예정 | [Rate limits](https://docs.upbit.com/kr/reference/rate-limits), 실호출 헤더 |
| 429 · 418 | 429 = 초 한도 초과, 다음 초에 재시도. 429 누적 시 **418 임시 차단**(반복하면 길어짐) | 같은 문서 |
| WebSocket | 연결 5/s · 메시지 5/s 및 100/min(연결당) | 같은 문서 |
| Origin 헤더 | 붙이면 10초에 1회 — 서버에서 부를 땐 붙이지 않는다 | 같은 문서 |
| 분봉 `count` | **최대 200**(초과는 조용히 200) · 단위 1·3·5·10·15·30·60·240 | [분봉 조회](https://docs.upbit.com/kr/reference/list-candles-minutes), `count=288` 실호출 200 |
| `to` | 그 시각 **미만**(배타적) · ISO 8601(`Z` 또는 `+09:00`) · 생략 = 지금 | 실호출 `to=06:00Z` → 05:55 · 05:50 |
| 과거 깊이 | 문서 언급 없음. 실호출로 KRW-BTC 5분봉 2017-12-31 · 일봉 2017-09-30 까지 나옴 | 실호출 |
| 거래 없는 봉 | **만들지 않는다**(응답에서 빠짐) → 저유동 코인의 5분 "구멍"은 정상일 수 있다 | 분봉 문서 |
| 일봉 | `/candles/days` count 최대 200, `to` 동일 | [일봉 조회](https://docs.upbit.com/kr/reference/list-candles-days) |
| KIS 기간별 시세(일봉) `FHKST03010100` | 한 번 **최대 100건** | `KisClient.ts:58` 주석(공식 포털 명세) |
| KIS 당일 분봉 `FHKST03010200` | 1분봉 · 한 번 30건 · **당일만** | `KisClient.ts:60` |
| KIS 일별 분봉 `FHKST03010230` | 1분봉 · 한 번 **120건** · 과거 **최대 1년** · 모의 키로 동작(11-02 로그 99종목·일 성공) | `KisClient.ts:62`, [AlgoLab 분봉 글](https://algolab.co.kr/blog/stock-minute-candle-data-kis-api-2026) |
| KIS 유량 | 실전 20건/s. **모의는 공식 수치가 공개 문서로 확인 안 됨** — 커뮤니티 2~5건/s, 모의는 0.6초 간격에서도 EGW00201 → 1초 권장. 우리 실측 처리량 ≈ 2건/s(10-07), 3건/s 페이서에서 80분 1,087건 초과 | [인프런 EGW00201](https://www.inflearn.com/community/questions/1825942/api-오류-egw00201-초당-거래건수를-초과), [wikidocs 실측](https://wikidocs.net/453548), [AlgoLab 모의 한계](https://algolab.co.kr/blog/kis-paper-trading-limits-2026), 공식 [open-trading-api](https://github.com/koreainvestment/open-trading-api) |
| KIS 실시간 | 세션당 등록 41건(체결 · 호가 합) | `RunKrRealtime.ts:36` |

> 모의 서버는 한도가 **앱 키 단위**이고 정확한 값이 공개돼 있지 않다. 실측으로 정하고 설정(`KIS_REQUESTS_PER_SECOND`)에 둔다.

## 4. 수면이 잦은 단일 호스트 수집기 — 패턴

1. **깨어남 감지는 "벽시계 점프"로.** 30초 `setInterval` 이 직전 박동과의 차이가 90초를 넘으면 깨어남으로 본다(`process.hrtime` 은 수면 중 멈추고 `Date.now()` 는 간다 — 둘의 차이가 수면 길이). macOS `pmset -g log` · IOKit 알림은 Node 에서 번거롭다. 부팅도 깨어남과 같은 경로로 처리한다.
2. **간격은 "기대 봉 격자 − 있는 봉"으로 센다**, 하지만 거래소가 거래 없는 봉을 안 만들므로 **격자 대비 빈칸 = 결함이 아니다.** 그래서 "봉이 있나"가 아니라 **"이 구간을 거래소에 물어봤나"**(수위선 · watermark)를 저장한다: `collect_watermark(symbol, asset_type, timeframe, filled_through)`. 물어보고 0봉이면 그건 "거래 없음"으로 확정.
   - 국내는 장 달력(`kr_market_calendar`)이 격자다 — 개장일 × 09:00~15:25 = 78칸. 지금 `MINUTE_DAY_COMPLETE`(70)가 이 역할.
3. **따라잡기 순서**: ① 화면에 걸린 것(보유 → 관심) ② 지표 계산에 필요한 최근 창(m5 100 · h1 100시간 · d1 100일) ③ 나머지 과거. 각 심볼 안에서는 **최신 → 과거**(`to` 커서를 뒤로) — 지표가 먼저 살아난다. 회차 호출 상한을 두고 남은 일은 다음 회차가 수위선부터 잇는다(멱등).
4. **페이싱**: 한도의 70~80% 고정 속도 + `Remaining-Req sec` 이 낮으면 쉼 + 429/418 · EGW00201 은 프로세스 전체 쿨다운(이미 있음). 따라잡기는 **우선순위 낮은 줄**에 넣어 실시간 · 화면 요청을 굶기지 않는다(국내는 `KIS_PRIORITY.candles=3` 이 이미 있다).
5. **덮어쓰기 없는 upsert**: 지금 `DO UPDATE … WHERE … IS DISTINCT FROM` 그대로. 따라잡기는 한 문장 `INSERT … SELECT unnest(…)`(행마다 `Promise.all` 금지 — `noParallelRowWrites.test.ts`), 묶음 크기 ≤ 1,000행.
6. **신선도 SLO**: 자산군 × 주기 × "지금이 수집 시간인가"로 기대치를 다르게(코인 24h, 국내는 장중만). 상태판은 **프로세스가 떠 있나**가 아니라 **데이터가 기대만큼 있나**를 센다.
7. **사용자에게**: 판정마다 `asOf` 와 "이력 N일 · 일부 지표 없음" 사유를 붙인다. 백필 중이면 "깨어난 뒤 채우는 중 (n/m)".

## 5. 고치는 설계 — 코인 · 국내 같이

### F1. 지표를 지표별 문턱으로 (코인 · 국내 공통) — 14종목 RSI 즉시 복구

- `calculateIndicators` 가 봉 수에 따라 각 값을 `null` 로: RSI14 ≥ 15 · MA20 · 거래량평균20 ≥ 20 · MACD(12,26,9) ≥ 35 · MA50 ≥ 50. 전체 문턱(`RefreshTechnicalIndicators.ts:103`)은 15 로 내린다. 컬럼은 이미 nullable(`technical_indicators`).
- 장기 판단은 MA50 이 없으면 "이력 짧음 — 추세 판정 보류"를 사유로 내고 RSI 는 쓴다(판정 규칙 · 문구는 서버 정책 — 프론트 상수 금지).
- **하지 않는 것**: BTC-/USDT- 마켓 봉을 환율로 KRW 봉으로 바꿔 `price_history` 에 섞기 — 다른 시장 가격이라 김치 프리미엄이 섞이고 채점이 틀린다. 필요하면 별도 표 · `proxy` 표시로만(이번 범위 밖).
- 수용: 아래 Q1 에서 일봉 ≥ 15 인 활성 코인 중 d1 `rsi_14` 없는 종목 0. CARDS(6봉)만 남고 사유가 붙는다.

### F2. 코인 5분봉 — 수위선 따라잡기 (`CollectPriceHistory`)

- `COLLECT_TARGETS` 5m 를 288 → **200**(실제 상한과 일치, 의도 명시).
- 새 유스케이스 `CatchUpPriceHistory`: 심볼마다 `filled_through`(없으면 `max(timestamp)`)부터 지금까지, `to` 를 뒤로 옮기며 200개씩. 상한: 30일(보관 창) = 심볼당 최대 44쪽. 300종목 × 44 = 13,200호출 ÷ 8건/s ≈ **28분**(최악, 30일 꺼져 있던 경우). 하룻밤(10시간 수면 · 16h40m 이내)은 0호출 — 정기 회차가 덮는다.
- 순서: 보유 · 관심 → 거래대금 상위(`topByTradeValue`) → 나머지. 회차 상한 600호출(≈75초), 남은 건 다음 5분 회차.
- 깨어남(F5) · 부팅 · 정기 회차 뒤에 돈다. 일봉은 120개 정기 수집이 120일 수면까지 덮으므로 커서 불필요.
- 수용: 수면 20시간 재현(서버 내림 → 20h 뒤 올림 대신, 테스트는 `now` 주입 + 가짜 거래소) 뒤 Q2 에서 BTC 등 상위 50 종목 5분봉 구멍 0(거래소가 봉을 준 구간 기준). 깨어난 뒤 **30분 이내** 채움.

### F3. 국내 — KIS 한도부터 (모든 국내 수집의 전제)

- `.env` `KIS_REQUESTS_PER_SECOND=1.8`(또는 기본값을 모의 URL 이면 1.8 로). 근거: 3/s 에서 80분 1,087건 초과 · 부팅 일봉 8/50 실패. 10-27 실험("1.5 에서도 21%")은 같은 키로 다른 프로세스가 돌던 때일 수 있어 재측정 — `kr-provider-metrics`(10분) 초과율로 판단.
- 수용: 장중 1시간 EGW00201 ≤ 호출의 1%(`kr-provider-metrics` 로그), 부팅 일봉 회차 실패 0.

### F4. 국내 5분봉 — 깨어남 · 부팅에도 보정, 합류 즉시 백필

- `kr-minute-bars` 를 부팅 목록(`kr-stock.worker.ts:110-130` 일봉 뒤)과 깨어남 이벤트에 넣는다. 오늘은 15:35 전이면 대상에서 빠지므로(`SyncKrStock.ts:603`) 장중 실행도 안전.
- 유니버스 차이 감지: `ResolveKrStockUniverse` 결과를 직전과 비교해 **새 코드**면 그 자리에서 일봉 2년 + 5분봉 29일 백필을 낮은 우선순위로(KODEX 인버스 사례). 유니버스를 `kr_universe(code, since, source)` 로 저장하면 상태판 · 세기가 쉬워진다.
- 슬롯 밖 종목 장중 5분봉: 지금은 장 마감 뒤에만 생긴다(설계상). 장중 판단이 필요하면 `FHKST03010200`(당일 1분봉 30건) 을 슬롯 밖 9종목만 10분마다 — 9 × 1 호출/10분, 한도 영향 미미. 아니면 m5 · h1 판단에 "장 마감 뒤 갱신" 사유를 붙인다(결정 필요 — 제품 쪽).
- 수용: Q3 에서 현재 유니버스 × 지난 5개장일 중 5분봉 < 70 인 (종목, 날) 0 — 다음 보정 회차 뒤. 깨어난 뒤 30분 이내.

### F5. 깨어남 감지 하나 — 두 자산군이 같이 듣는다

- `shared/infrastructure/wake.ts`: 30초 박동, 벽시계 점프 > 90초면 `wake(sleptMs)` 발행. 구독: 코인 `CatchUpPriceHistory` · 국내 `syncDailyCandles`(커서 있음 — 15:45 지났으면) · `syncMinuteBars` · 지표 갱신 한 번. node-cron `catchUp`(`scheduler.ts:43`)은 남겨 두되 매분 · 5분 작업은 이 경로로 메운다.
- 로그 한 줄: `💤→☀️ 수면 HH:MM~HH:MM (n시간) — 따라잡기 시작` · 끝나면 종목 · 호출 · 봉 수.

### F6. 상태판 (`ops/salt.sh status` · `latest()` 141-183 에 추가)

자산군 대칭으로 아래 넷을 센다(✗ 기준 괄호):

| 줄 | 코인 | 국내 |
|---|---|---|
| 5분봉 마지막 | max(ts) (> 15분 ✗) | 장중만 (> 15분 ✗), 장 밖 `·` |
| 5분봉 구멍 | 최근 24h, 상위 50 종목 중 5분봉 < 260 인 수 (> 0 ✗) | 지난 5개장일 (종목, 날) 중 봉 < 70 수 (> 0 ✗) |
| 지표 없음 · 묵음 | 활성 중 d1 rsi 없음(일봉 ≥ 15 인데) · m5 > 30분 묵음 | 현재 유니버스 중 d1 > 1개장일 · m5 > 1개장일 묵음 |
| 짧은 이력 | 일봉 < 50 종목 수(정보 `·` — 거래소 사정) | 일봉 < 120 종목 수 |

## 6. 측정 쿼리 (읽기 전용 — 상태판 · 수용 기준에 그대로)

```sql
-- Q1 코인: 지표 없는 활성 코인과 일봉 수
SELECT a.symbol, count(p.*) n1d,
       (SELECT rsi_14 FROM technical_indicators t WHERE t.symbol=a.symbol AND t.timeframe='d1' ORDER BY timestamp DESC LIMIT 1) rsi
FROM market_assets a LEFT JOIN price_history p ON p.symbol=a.symbol AND p.timeframe='1d'
WHERE a.asset_type='crypto' AND a.is_active GROUP BY a.symbol HAVING count(p.*) < 50 ORDER BY n1d;

-- Q2 코인 5분봉 구멍(30분 넘는 것만 — 저유동 코인의 거래 없는 5분은 거른다), 최근 7일
WITH b AS (SELECT symbol, timestamp t, lag(timestamp) OVER (PARTITION BY symbol ORDER BY timestamp) p
           FROM price_history WHERE asset_type='crypto' AND timeframe='5m' AND timestamp > now() - interval '7 days')
SELECT symbol, p gap_start, t gap_end, t-p len FROM b
WHERE t-p > interval '30 minutes' AND symbol IN (SELECT symbol FROM market_assets WHERE is_active ORDER BY trade_value_24h DESC NULLS LAST LIMIT 50)
ORDER BY len DESC;

-- Q3 국내: 현재 유니버스(시총 상위 50 ∪ 보유 ∪ 관심) × 날짜별 5분봉 수 — 70 미만이 구멍
WITH u AS (
  (SELECT code FROM kr_stock_master WHERE group_code='ST' AND delisted_at IS NULL AND is_preferred=false AND market_cap IS NOT NULL
   ORDER BY market_cap DESC LIMIT 50)
  UNION SELECT symbol FROM portfolio_holdings WHERE asset_type='kr_stock' AND total_quantity > 0
  UNION SELECT symbol FROM investment_watchlist WHERE asset_type='kr_stock')
SELECT u.code, (p.timestamp + interval '9 hours')::date d, count(p.*) bars
FROM u LEFT JOIN price_history p ON p.symbol=u.code AND p.timeframe='5m' AND p.timestamp > now() - interval '8 days'
GROUP BY 1,2 HAVING count(p.*) < 70 ORDER BY 2,1;

-- Q4 국내: 현재 유니버스 중 지표 묵음(주기별 마지막 시각)
WITH u AS (/* Q3 와 같은 u */ SELECT code FROM kr_stock_master WHERE group_code='ST' AND delisted_at IS NULL
           AND is_preferred=false AND market_cap IS NOT NULL ORDER BY market_cap DESC LIMIT 50)
SELECT u.code, t.timeframe, max(t.timestamp) last
FROM u LEFT JOIN technical_indicators t ON t.symbol=u.code
GROUP BY 1,2 HAVING max(t.timestamp) IS NULL OR max(t.timestamp) < now() - interval '1 day' ORDER BY 3 NULLS FIRST;

-- Q5 일별 5분봉 종목 수(자산군 대칭) — 갑자기 줄면 보정 회차가 빠진 날
SELECT asset_type, (timestamp + interval '9 hours')::date d, count(DISTINCT symbol)
FROM price_history WHERE timeframe='5m' AND timestamp > now() - interval '12 days' GROUP BY 1,2 ORDER BY 1,2;
```

> Q3 · Q4 는 `kr_stock_quotes` 로 세면 안 된다 — 밀려난 종목 행이 남는다(그래서 "57 중 53").

## 7. 사용자에게 보이는 신선도

- 판단 카드 · 해설: `asOf`(마지막 봉 시각) + 사유 하나 — "이력 30일 · 추세(50일) 보류", "장 마감 뒤 갱신 종목(장중 5분봉 없음)", "수면 뒤 채우는 중". 문구 · 임계는 서버 정책 → BFF 뷰모델 → 화면(프론트 상수 금지 규칙).
- "빈 칸 0" 원칙과 맞추려면 값이 없을 때 **빈칸이 아니라 사유 칸**을 그린다.

## 8. 남는 위험 · 확인 못 한 것

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| KIS 모의 정확한 유량 | 공식 공개 수치 미확인 · 커뮤니티 2~5건/s | F3 적용 뒤 `kr-provider-metrics` 1장중 측정 |
| 11-06 · 11-09 국내 보정 회차가 왜 빠졌나(수면 vs 한도) | 로그가 11-10 14:10 이전 회전으로 없음 | F5 깨어남 로그가 들어간 뒤 다음 수면 |
| `FHKST03010230` 1년 · 120건 | 블로그 + 우리 주석. 공식 포털 페이지 직접 확인 못 함 | 구현 때 KIS 포털 명세 대조 |
| 업비트 5분봉 깊이 | 문서 없음, 2017년까지 실호출로 나옴 — 보관 30일에는 충분 | — |
