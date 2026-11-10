# FE-REQ-038 가격 변동 범위 카드 — 체크리스트 (2026-09-24)

| 확인 | 결과 |
|---|---|
| 정적 | `@repo/core` · `web` `check-types` · `lint --max-warnings 0` · `layer-check` 7파일 |
| 화면 — 소유자 | Playwright(BFF 는 route 로 실제 BTC 값 고정) — 카드 1개, 1 · 2주 띠 · 가격 표 · 보유 0.05 시나리오(−428,128 ~ +486,647원) · 성적(87% · 단순 예측보다 9% 넓음 · 52주) · 빗나간 때 2 · 꺼 둔 3 · 4주 |
| 화면 — 실제 로그인 (2026-09-24) | 소유자 계정으로 사용자가 직접 확인 |
| 화면 — 비소유자 | 404 → 카드 0개, "변동 범위" 문자열 0 |
| 금지 | 목표가 · 확신 · "파세요/사세요" · 방향 판정 0(챔피언이 방향이 없다). 이름 "변동 범위 · 방향 예측 아님" |
| 금액 | 전부 서버 값 — 프론트 계산은 띠 좌표뿐 |
| 주요 사건 카드 (2026-09-24, FR-13) | 실제 DB 통계를 서버 유스케이스 → BFF 뷰모델로 만든 응답을 route 로 재생 — 일정 3개(D-8 · D-20 · D-35, 서울 시각) · 하루/5일/20일 전환 · 평소 대비 1.3배 · 빗나간 때 3 · FOMC 펼침. 비소유자(404)는 자리 없음(전망과 같은 분기) |
| 해설 스트림 (2026-09-24, FR-7) | 서버 유스케이스를 가짜 포트로 실제 실행해 만든 이벤트를 Playwright route 로 재생 — 성공: 4단계 체크 · 교체된 AI 문장 · 명령형 1문장 탈락 알림 · 출처 칩 2 · "AI 생성" 배지. 실패: 다듬기 · 검사 "건너뜀" · 타자 중 커서 · "규칙 기반 설명" 배지 · 알림은 글자가 다 드러난 뒤. `check-types` · `lint` 통과 |
| 차트 개정 (2026-09-24, FR-8~12) | Playwright — WS 는 `routeWebSocket` 으로 300ms 틱. 384ms 시점 선 `draw` · 범위 `unfold` 진행 중, 하이라이트 대기 확인 · 5.4초에 2주로 자동 전환 · 실시간 점 "지금" 고정 · 머리 가격 116,357,923 → 116,350,752 변함. 실제 `asOf`(봉 **닫힌** 시각 09-23 00:00Z) 로 기준 봉 09-22 매칭 — 날짜 같음 비교가 하루 어긋나 "지금"이 왼쪽 끝으로 가던 버그를 사용자 화면에서 발견 · 수정 |

| 미검증 · 범위 밖 | 사유 | 언제 닫히나 |
|---|---|---|
| 모바일 폭(≤ 420px) 레이아웃 | 상세 페이지가 PC 2컬럼 기준 | 모바일 슬라이스 |
| 해설 스트림 — 실제 로그인 · 실제 Gemini 로 끝까지 | 서버 · BFF 가 전역 인증이라 토큰 없이 경로만 확인 가능. 흐름은 실제 유스케이스가 만든 이벤트를 route 로 재생해 확인 | 사용자가 로그인 화면에서 [해설 보기] |
| 스트림이 조각으로 도착할 때의 표시 | Playwright route 는 본문을 한 번에 준다 — 조각 도착은 파서 단위 테스트(core · BFF, 한 글자씩)로만 | 실사용 확인 시 |
| 실시간 점 · 머리 가격 — 실제 업비트 시세로 장시간 | 로컬 WS 는 스텁으로만 확인 | 사용자 로그인 화면 확인 시 |
| 앱 테스트 러너 | 앱에 단위 테스트 러너가 없다(기존) | 부채 |

## 2026-09-27 — 판단이 막힌 모드의 해설 자리 · 카드 위치 (FR-7 · FE-REQ-026 FR-135)

| 확인 | 결과 |
|---|---|
| 원인 | C06(`6c18593`) 뒤 판단 표본을 live 만 센다 → 표본 17 < 20 종목의 모드가 `renderable: false` → `ExplainCard` 가 `null` → 카드째 사라짐 |
| 고침 | `features/explain-symbol/ui/ExplainCard.tsx` — 막힌 모드는 제목 + "코치 판단이 열리면 AI 해설도 함께 열려요" + "지금 표본 N건 · 채점이 쌓이면 자동으로 열려요"(서버 `trackSample`, 없으면 줄 없음). `model/messages.ts` 두 키 |
| 3종 규칙 | 막힌 모드에 버튼 · 성적 · 사례 0 — FR-135 "버튼 자체가 없다" 그대로. 기준 20 은 프론트 소스에 없다(서버 소유) |
| 위치 | `widgets/symbol-analysis/ui/SymbolAnalysis.tsx` — 해설 · 수익 플랜을 주요 사건 바로 아래로, 내 계획 · 거래 기록을 그 아래로(슬라이스 3 `68d6bd0` 이전 순서) |
| 정적 | `pnpm check-types` · `pnpm lint` |

| 미검증 · 범위 밖 | 사유 | 언제 닫히나 |
|---|---|---|
| 실제 로그인 화면에서 막힌 모드 카드 · 새 순서 | 로컬 토큰 발급 불가 — 타입 · 린트로만 확인했다. 화면으로 본 적 없다 | `QA-001` 로그인 QA(사용자) |
| 표본이 20 을 넘어 판단이 열리는 순간 | 채점이 쌓여야 한다 — 열리면 기존 FR-7 흐름 그대로 | 해당 종목 표본 ≥ 20 이 된 뒤 `QA-001` 로그인 QA |

## 슬라이스 23 — FR-14 쏠림 신호 카드 (2026-09-27)

| 확인 | 결과 |
|---|---|
| 구현 | `@repo/core/coach` `positioning.ts` · `entities/coach` `useSymbolPositioning` · `PositioningCard` · `ReactionDetail`(EventsCard 에서 분리) · `POSITIONING_MESSAGES` · `widgets/symbol-analysis` 우측 주요 사건 아래 |
| 검사 | `pnpm check-types` · `pnpm lint` · `pnpm test`(모노레포) 통과 · `layer-check` 사후 실행 8파일 통과(Bash 로 쓴 파일) |
| 빌드 | 워크트리 `next build` — `web` 통과(`/investments/[symbol]` 115 kB, 전과 같음) · `web-tax` 통과(102 kB) |
| 화면 | Playwright 고정 응답(실 DB 로 서버 유스케이스가 만든 값) — BTC 1280(보통 · 확정 역프 + 확정 전 한 줄 · 김프 → 역프 반응 펼침) · AAVE 390(롱 쏠림 상위 2% · 통상 해석 · 표본 쌓이는 중). 미결제약정 표기를 유효 3자리로 고침("6652.5만" → "6650만") |
| 공통 수용 기준 | 확신 · 명령형 · 목표가 0 · "과열" · 매수/매도 신호 문구 0 · 초록/빨강 판정 색 0 · 숫자 계산 0(표기 · 가까운 끝 고르기만) · 면책 표시 |

미검증: 실 토큰 로그인 화면 · 200% 확대 · 대비 측정(`QA-001` 로그인 QA).

## F011 슬라이스 5d — 국내 주식 `assetType` (2026-10-23)

| 항목 | 결과 |
|---|---|
| 코인 무변경 | `assetType` 기본 `crypto` — 바뀐 세 자리는 모두 `kr ? 국내 : 기존` 이라 코인 분기는 이전 식 그대로. 코인 상세(`SymbolAnalysis`)는 prop 을 넘기지 않는다 |
| 국내 | Playwright 고정 응답 — 거래일 안내 · "보유 30주" · 막힘 4기간 사유 · 비소유자 자리 없음(`FE-REQ-041` 체크리스트 §슬라이스 5d) |
| axe | 카드 기존 색 대비 19건(badge 4.08 · lead · note · th · 범례 3.03 · 기간 칩 2.68 · 시나리오 칸 2.88) — 코인 · 국내 공통, 이번에 바꾸지 않음 |
| 게이트 | `pnpm check-types` · `lint` · `test` · `test:layer-check` · `build`(`web` · `web-tax`) 통과 |

코인 확인: 실서버 BTC 1440 — 거래일 안내 줄 없음 · 기준가 · 시나리오 문구 이전과 같음 · 넘침 0(2026-10-23).

### 슬라이스 5d 추가 — 막힘 사유 문구 2개 (2026-10-23)

실서버 005930: "1주 뒤 — 단순 예측보다 범위가 좁지 않아 꺼 둠" ×2 · "범위가 실제와 잘 맞지 않아 꺼 둠" ×2 · 면책. 003670 4기간 렌더 · BTC 그대로. `pnpm check-types` · `lint` · `test` · `test:layer-check` · `build`(137 kB) · 훅 사후 실행 통과.

## F011 5e (2026-10-23)

- 막힘 문구 4개 추가(국내 상태). 렌더 확인은 `FE-REQ-041` 체크리스트 §슬라이스 5e

## 2026-10-28 — F000 웹 API 에러 정규화 (파일만 걸침)

| 항목 | 결과 |
|---|---|
| `useSymbolForecast · useSymbolEvents · useExplainStream · streamSse` | 404 = 소유자 아님은 `hasApiStatus` · 해설 429 = 잠시 후 판정 그대로 · `StreamHttpError` → `ApiError` |
| 검증 | check-types · lint · web · web-tax build · layer-check pass. 재시도 실측은 루트 `requirements/reports/checklists/F000-api-error-normalize.md` §2 |

미검증: 없음 — 판단 · 화면 무변경

## 2026-11-02 — FR-7 출처 칩 링크 (F008 해설 근거)

| 확인 | 결과 |
|---|---|
| 코드 | 주소 있으면 `<a target="_blank" rel="noopener noreferrer">` · 없으면 이름만 · 시각 없으면 시각 칸 없음 |
| 게이트 | `pnpm check-types` · `pnpm lint` · `pnpm test`(core 51 · ui 43) · `pnpm test:layer-check` · `pnpm --filter web build` · 훅 사후 실행 exit 0 |

| 미검증 | 사유 | 언제 닫히나 |
|---|---|---|
| ~~화면에서 칩 링크~~ **닫음 2026-11-02** — 임시 사용자 토큰 · Playwright `/investments/LINK?mode=scalp`: 칩 5개 `<a target=_blank rel="noopener noreferrer">` · "13시간 전" ~ "33일 전" · 스크린리더 라벨. 새 탭 실제 열림은 헤드리스라 속성으로 확인 | — | — |

## F008 해설 공급자 라우팅 · 스트리밍 (2026-11-02) — 검증

Playwright route 6종 · 실스택 화면(3100, 임시 사용자) · `pnpm check-types` · `lint` · `--filter web build`(3.06 kB · 137 kB 그대로) · `web-tax build`

루트 `requirements/specs/done/F008-explain-llm-routing-slice.md` · 영역 `SRV-REQ-050` · `BFF-REQ-050` · `FE-REQ-059`

## F008 슬라이스 24 국내 증시 일정 (2026-11-02)

- 변경: `EventsCard` 가 국내 · 미국 섞임을 그린다 — 지역 표시 · 짧은 이름 · 범위 묶음 · 국내 안내 문구(`FE-REQ-046` FR-1 · 2). 종류 이름은 `@repo/core/coach` 한 벌
- 검증: 코인 상세 카드 동작 무변경(지역 하나면 표시 없음) · 실화면 국내 카드
- 미검증 · 범위 밖: 없음(슬라이스 2단계는 `FC-REQ-021` · `FE-REQ-046` 표)

## 2026-11-02 — MONEY-F1(`FE-REQ-053`) 투자 zone 분리 · 홈 카드

- MONEY-F1(`FE-REQ-053`) 에서 이 REQ 가 걸렸다 — shared 레이어 → `@repo/web-shared`(import 경로 치환)(`20971abf`) · 투자 화면 `apps/web/src` → `packages/domain-invest/src`(내용 무변경) · 투자 zone 조립(`b00b0cea`) · 조회 훅 렌더 중 `localStorage` 토큰 읽기 → `useHasAccessToken`(`/search` 수화 불일치 수정)(`b4a59677`). 파일 11개(경로 이동 내용 무변경 4 · 수정 7 · 추가 0 · 삭제 0). 화면 · 동작이 바뀐 몫은 위 커밋 설명대로
- 확인: 모노레포 check-types · lint · test · zone 5 빌드 · layer-check · 훅 사후 실행(바뀐 TS 전부) · 실화면 — `salt-microFe/requirements/reports/checklists/FE-REQ-053.md` §2

## 2026-11-04 — `DEV-001` 렌더 중 읽기 lint

- `ForecastFanChart` 의 렌더 중 `Date.now()` 두 줄에 `no-render-read` 예외 주석 — 전망은 소유자 전용 조회라 마운트 뒤 브라우저에서만 그려진다(서버 렌더에 없음, `DEV-001`)
- 검증: 프론트 전체 `pnpm lint` 12/12 · 규칙 변이(나쁜 6줄 다 걸림 · 처리기 · 효과 · 일반 함수 통과)


## 2026-11-05 — FE-REQ-013 FR-80 2단계 쿠키 세션

- 파일만 걸침 — `packages/domain-invest/src/entities/coach/api/useSymbolEvents.ts` `packages/domain-invest/src/entities/coach/api/useSymbolForecast.ts` `packages/domain-invest/src/entities/coach/api/useSymbolPositioning.ts`(이 REQ 가 머리 주석 주인)에서 토큰 헤더(`authHeader()`)를 뺐다 · 로그인 여부 `useHasSession`. 토큰은 httpOnly 쿠키 · 같은 origin 이라 브라우저가 싣는다(`721063fc`). 화면 · 동작 무변경
- 확인: check-types · lint · test · zone 4 빌드 · 훅 사후 실행 · 실스택 — `salt-microFe/requirements/reports/checklists/FE-REQ-013.md` 2026-11-05


## F017 v2 단계 1 — 판단 막지 않음 (2026-11-10, `feat/f017-s1a-judgment-caveats`)

| 항목 | 결과 | 근거 |
|---|---|---|
| 해설 카드 막힌 분기 삭제 · 성적 · 사례 중복 제거 | 충족 | `pnpm check-types` 13/13 · `lint` 13/13 · `test`(core 295 · ui 63) · 투자 zone 운영 빌드(worktree, `/investments/[symbol]` First Load 153 kB) · 레이어 훅 사후(음성 대조 exit 2) · 실화면 BTC |

| 미충족 · 미검증 | 사유 | 언제 닫히나 |
|---|---|---|
| 3종 결함 160(코인 장기 100 · 국내 단타 50 · 코인 단타 10) | 채울 과거 검산 · 국내 단타 원장 채점이 아직 없다 — 숨기지 않고 결함 꼬리표 | 1b(`FC-REQ-028` FR-5 · `SRV-REQ-040` FR-63) |
