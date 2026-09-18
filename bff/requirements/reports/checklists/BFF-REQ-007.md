# BFF-REQ-007 (F000 FUNC) — 검증 체크리스트

- REQ: `requirements/specs/in-progress/BFF-REQ-007-F000-FUNC.md`
- 브랜치: `feat/f000-watchlist-tab` · 검증일: 2026-09-18
- 상태: **부분 완료** — D·E·F절이 닫혔고 A·B·C·G절이 남았다
- **전 영역 통합 기록**: 루트 `requirements/reports/checklists/F000-watchlist-tab.md`

## 1. 닫힌 것

| FR | 내용 | 결과 | 근거 |
|---|---|---|---|
| FR-30 | `/api/app/news?symbol=&limit=` | **pass** | 실기사 2건 응답 |
| FR-31 | 제목·요약·이미지·출처·발행시각, **`content` 없음** | **pass** | 테스트 `content 를 담지 않는다` |
| FR-32 | 0건이면 빈 배열, 더미 0건 | **pass** | 테스트 + 실측 |
| FR-33 | 이미지 없으면 `null`, 플레이스홀더 0건 | **pass** | GoogleNews 기사 전부 `imageUrl: null` |
| FR-34 | `viewCount` 는 서버가 줄 때만 | **pass** | 테스트 `viewCount 는 서버가 줄 때만 있다` |
| FR-40 | `/api/app/watchlist` | **pass** | GET·POST·DELETE |
| FR-41 | 서버 값 우선, 없으면 캐시 보정 | **pass** | 테스트 4건 |
| FR-42 | 캐시에 없으면 `priceStale: true` + 서버 값 | **pass** | AAPL `null` + `true` |
| FR-43 | 0건이면 빈 배열 | **pass** | `{"items":[]}` |
| FR-50~52 | `period` 를 **교정하지 않고** 422 | **pass** | BFF `miniute` 422 · `minute` 200 |

## 2. 남은 것

| FR | 내용 | 언제 닫히나 |
|---|---|---|
| FR-1~6 | 동면 route 제거 + 410 Gone + 1주 로그 | `SRV-REQ-007`(서버 동면)과 같이 |
| FR-10~15 | `app-home.service` 재작성 (`allSettled` · 동면 소스 제거 · 뷰모델) | 홈 블록이 생기는 F006 `BFF-REQ-027` 과 순서 조율 필요 |
| FR-20~24 | 알림 2종 축소 | `SRV-REQ-008` FR-20~25 선행 |
| FR-60~64 | 인증 경로 정리 · 온보딩 3개 | `SRV-REQ-009` 초대 엔드포인트 선행 |

## 3. 판단이 REQ와 다른 것

- **`priceStale` 을 캐시 적중이 아니라 "돌려주는 값의 나이"로 판정한다.** 구독을 부르는
  것은 `price-updater.worker`(별도 프로세스)라 REST 만 띄우면 캐시가 비어 **전부 지연**이
  된다. 서버 값이 기본이고 캐시는 빈 자리를 채우거나 더 새로울 때만 이긴다 — FR-41 의
  의도는 그대로다. 임계값 60초는 실측 근거가 있다(표본 40 · p50 2.5s · 최대 4.8s · 12.4배).
- **`CHART_PERIODS` 가 둘이다**(FR-52 는 넷). 서버에 `week`·`month` 가 없어서 넷을 적으면
  BFF 는 통과시키고 서버가 422 를 준다.

## 4. 이번에 생긴 것 · 드러난 것

- **테스트 러너가 이 REQ 작업에서 처음 생겼다** (`npm test`, 23건). 막고 있던 것은
  "서비스를 import 하면 `upbit-ws.service` 가 최상위에서 소켓을 연다"였고, 판정 규칙을
  import 없는 순수 함수(`*.viewmodel.ts`)로 떼어 풀었다.
- **관심 목록을 한 페이지만 읽고 있었다.** 별 아이콘이 이 응답으로 판정하므로 101번째부터
  "담겨 있는데 빈 별"이 된다 — 페이지를 끝까지 읽도록 고쳤다(상한 10페이지).
- **`/portfolio/internal/update-prices` 를 아무도 부르지 않았다.** 워커가 관심 목록 쪽만
  밀어 넣어서 보유 평가금액이 영원히 0 이었다. 같은 페이로드를 두 곳에 보낸다(`allSettled`).
- `market-overview.service` 도 같은 캐시를 쓴다 — **REST 프로세스에서는 보정이 조용히
  no-op 이다.** 실패가 아니라 "보정이 안 된" 상태라 아무도 모른다. `BFF-REQ-010` 에서
  캐시 적중률을 관측 항목으로 넣을 것.

## 5. 명령

`npm run build` pass · `npm test` **23건 pass**.
