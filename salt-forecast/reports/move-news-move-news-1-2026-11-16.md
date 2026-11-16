# H3 큰 움직임 × 소식 — `move-news@1` (2026-11-16)

- 사전등록 `preregistration/2026-11-13-move-news.toml` · 코드 `f71840f7` · as_of 2026-11-16T05:56:54.079400+00:00
- 사건 = |r| ≥ 2σ(직전 20 · 오늘 제외) · s = 움직인 방향 × (h 봉 수익 − 같은 날 시장 평균) · 쿨다운 h
- 소식 = 국내 (전 거래일 15:30, 그날 15:30] 시황 · 공시 제목 / 코인 그 하루 심볼 제목. 움직임을 전하는 제목 · 묶음 기사 제외
- **판정은 전진 표본만**(등록 2026-11-13 뒤 · 라벨 닫히기 전 기록). 과거 숫자는 참고 — 소식 이력이 짧다
- '소식 없음' = 우리가 모은 원천에 없음(세상에 없음이 아니다)

오늘 새로 기록한 사건: kr 0 · crypto 0

## 전진 표본(판정 대상)

| 칸 | 소식 있음 사건 · 날 · 평균 s | 소식 없음 사건 · 날 · 평균 s | 차이 | 비용 뒤 있음 · 없음 | 움직임만 | 거래량 많음 있음 · 없음 | 플라시보 95% | 견고성 | 검정 상태 |
|---|---|---|---|---|---|---|---|---|---|
| kr h1 | 0 · 0 · — | 0 · 0 · — | — | — · — | — | — · — | — | 다름 · 없음 | news_up: forward · quiet_down: forward · diff: forward |
| kr h5 | 0 · 0 · — | 0 · 0 · — | — | — · — | — | — · — | — | 다름 · 없음 | news_up: forward · quiet_down: forward · diff: forward |
| crypto h1 | 0 · 0 · — | 0 · 0 · — | — | — · — | — | — · — | — | 다름 · 없음 | news_up: forward · quiet_down: forward · diff: forward |
| crypto h5 | 0 · 0 · — | 0 · 0 · — | — | — · — | — | — · — | — | 다름 · 없음 | news_up: forward · quiet_down: forward · diff: forward |

## 과거 참고(판정 아님)

| 칸 | 소식 있음 사건 · 날 · 평균 s | 소식 없음 사건 · 날 · 평균 s | 차이 | 비용 뒤 있음 · 없음 | 움직임만 | 거래량 많음 있음 · 없음 | 플라시보 95% | 견고성 | 검정 상태 |
|---|---|---|---|---|---|---|---|---|---|
| kr h1 | 0 · 0 · — | 0 · 0 · — | — | — · — | — | — · — | — | 다름 · 없음 | news_up: reference (below_min) · quiet_down: reference (below_min) · diff: reference (below_min) |
| kr h5 | 0 · 0 · — | 0 · 0 · — | — | — · — | — | — · — | — | 다름 · 없음 | news_up: reference (below_min) · quiet_down: reference (below_min) · diff: reference (below_min) |
| crypto h1 | 8 · 5 · +1.44% | 667 · 20 · +0.37% | +1.07% | +1.29% · +0.22% | +0.38% | +0.98% · -0.01% | +3.96% | 다름 · 없음 | news_up: reference (below_min) · quiet_down: reference (below_min) · diff: reference (below_min) |
| crypto h5 | 1 · 1 · -2.16% | 260 · 16 · -4.70% | +2.53% | -2.31% · -4.85% | -4.70% | — · -2.95% | +8.43% | 다름 · 없음 | news_up: reference (below_min) · quiet_down: reference (below_min) · diff: reference (below_min) |

## 자료 창

- kr: 봉 2024-11-18 ~ 2026-11-13
- crypto: 봉 2017-09-26 ~ 2026-11-16

## 한계

- 국내 소식 이력은 서버 1년 백필이 끝나야 찬다(새 맥 2026-11-16). 과거 참고 칸은 대부분 below_min
- 판정 날짜 2027-01-12 · 02-11 · 03-13 — 그 전엔 화면에 이 숫자를 쓰지 않는다
