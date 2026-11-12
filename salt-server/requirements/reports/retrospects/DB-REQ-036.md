# DB-REQ-036 회고 (2026-11-03, S0)

- 모델 수 "42 → 43" 이 낡아 있었다 — 10-30 drop 2 를 이 REQ 에 반영하지 않았다. 셈은 문서가 아니라 `schema.prisma` 를 파싱해서 했다(41).
- 주인 표를 Prisma 호출 위치로 세니 **사용처 0 · 행 0 인 표 셋**(알림 설정 둘 · 실행 기록)이 나왔다. 주인을 억지로 붙이지 않고 drop 후보로 표시했다.
- 경계 참조 목록에서 **FR-7 export 뷰에 없는 예측 읽기(B9 — 보유 ∪ 관심 종목 코드)** 를 찾았다. ADR-007 의 "public 읽기 4곳"도 실제는 6개 표 7곳이다 — 숫자를 적은 문서는 grep 으로 다시 센다.
- 계정 스크립트는 psql `\gexec` 로 멱등하게(DO 블록은 psql 변수를 못 쓴다). 운영 DB 적용은 서비스가 옮겨 오는 S1 로 — 쓰이지 않는 계정을 미리 만들지 않았다.

## Action

- S1 착수 때 B1 · B3 · B4 줄부터 닫는다(savings FK · 프로필 통계 · 온보딩 목표 수)
- B9 뷰는 S5 `FC-REQ-025` 에 행으로 넘긴다

## 2026-11-03 — MONEY-S1a 저축 서비스 첫 판 · 저축 zone 첫 화면

- 걸린 몫은 위 체크리스트 한 줄. 근거 · 판단은 루트 회고 `requirements/reports/retrospects/MONEY-S1a-savings-calculator.md`. Action 없음

## 2026-11-04 — 가계부 S1a(`MONEY-S1-household-entry`)

- 계정 · 스키마는 S0 가 NOLOGIN 으로 만들어 둔 덕에 한 줄(ALTER ROLE)로 끝났다.

## 2026-11-05 — 금융 팁 S2a(`MONEY-S2a-tips-content`)

- 몫: content 스키마가 플랫폼에서 태어나 `svc_content` 로그인을 연다(`roles.sql` · `init.sh` · Compose · 로컬 운영 DB 관리자 적용). 권한 검사 표본을 `content.probe` → `identity.probe`(content 는 Flyway 가 쓴다). Flyway V1 = 공통 세 표 + 글 · 파라미터 · 트리거 · 닫기 · 신호
- **Action**: 없음 — 기존 결정 위에 한 줄

## 2026-11-06 — 서버 S2c notification(`MONEY-S2c-notification`) · `9cee4715` · `33e949e8` · `2fa68f61` · `f1a3c64c`

- 서비스 풀이 늘면 테스트 연결 상한을 같이 본다(Action — 루트 회고)

## 2026-11-06 — 서버 S3a identity 셸 설정(`MONEY-S3a-identity-shell`)

- 새 서비스가 기존 스키마에 '첫 표'로 들어가는 것이 가능해 사용자 표 이동(S3b)과 분리됐다


## 2026-11-09

- 새 표를 만드는 REQ 가 주인 표(부록 A)를 같이 고치지 않았다 — 단계 A~C 세 번 연속. 표를 만드는 마이그레이션의 체크리스트에 "부록 A 행" 칸을 둔다

## F017 단계 1c 수집 따라잡기 (2026-11-11, `feat/f017-s1c-collection`)

- 닿은 것: 부록 A market 행에 `market_universe_snapshot` · `price_fill_mark` · 부록 B11(예측 스냅샷 읽기 — S5 export 뷰)
- 문제 · 액션: 없음 — 주인 REQ 는 `SRV-REQ-057` · `DB-REQ-044`

## F017 v2 단계 2 점검 (2026-11-11, `feat/f017-s2-checks-plain-line`)

- 닿은 것: 마이그레이션 `20261111140000_trade_check_export_and_outcome` 이 export 뷰 `public.v_trade_check_ledger_export` 를 더해 예측이 점검 원장을 뷰로 읽는다 — FR-3 직접 읽기 목록은 늘리지 않았다
- 문제 · 액션: 없음 — 주인 REQ 는 `DB-REQ-043` · 서버 `SRV-REQ-053` · 예측 `FC-REQ-028`

## F017 v2 단계 4 등급 (2026-11-11)

- export 뷰 하나로 예측이 판단 원장을 읽게 했다 — S6 에 coach 스키마로 옮길 때 이 뷰 이름만 옮긴다. 문제 · 액션 없음

## 2026-11-12 — F017 단계 6 덧붙임

- 이 REQ 의 코드에 측정 태그 칸을 더했다(덧붙임 — 없거나 실패면 이전과 같은 화면). 새 교훈은 주인 REQ(`SRV-REQ-053` 회고)에

## 2026-11-12 — 서버 S3b(`MONEY-S3b-identity-accounts`)

- B1 FK 18 끊기 마이그레이션 · B5 코치 배치 대상(`users` 읽기 0). 회고 본문은 루트 `requirements/reports/retrospects/MONEY-S3b-identity-accounts.md` — 플랫폼 단독 종단이 BFF 의 `Bearer undefined` 를 몰랐다 · 반쯤 옮긴 상태의 FK 틈
- Action: 경로를 옮기면 BFF 를 거친 실스택을 첫 확인으로
