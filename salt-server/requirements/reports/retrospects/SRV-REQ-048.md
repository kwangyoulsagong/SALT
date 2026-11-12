# SRV-REQ-048 — 회고

## 2026-11-06 — 서버 S2c notification(`MONEY-S2c-notification`) · `9cee4715` · `33e949e8` · `2fa68f61` · `f1a3c64c`

- 첫 기존 컨텍스트 이전을 은퇴 경로로. 판단 · 실수 · Action 은 루트 회고 `MONEY-S2c-notification`

## 2026-11-06 — 서버 S2c 확인 2회차

- 결함과 Action 은 루트 회고 `MONEY-S2c-notification` 확인 2회차

## 2026-11-06 — 서버 S3a identity 셸 설정(`MONEY-S3a-identity-shell`)

- 잘된 것: 사용자 표를 옮기기 전에 셸 설정만 먼저 태어나게 잘랐다 — 토큰 발급자 교체(S3b)와 화면 기능(S3a)이 한 PR 에 섞이지 않았다
- 배운 것: 온보딩 "끝"은 서버가 추측하지 않고 사용자가 첫 기록 화면으로 넘어갈 때(또는 나중에) 기록한다 — 남의 서비스 기록 존재를 묻는 프로브(옛 `set_plan`)가 서비스 간 호출을 만들고 있었다
- Action: S3b 에서 `user` 이동 시 `user_domain_pref.user_id` 는 그대로 FK 없는 열로 둔다(삭제는 `UserDeletionRequested` 구독)

## F017 v2 단계 2 점검 (2026-11-11, `feat/f017-s2-checks-plain-line`)

- 닿은 것: `coach/domain/ports.ts` 에 포트 `BaseRateReader` · `TradeCheckLedger`. 기존 포트 무변경
- 문제 · 액션: 없음 — 주인 REQ 는 `SRV-REQ-053` · BFF `BFF-REQ-052` · FE `FE-REQ-064`

## F017 v2 단계 3 해설 늘 (2026-11-11, `feat/f017-s3-explain-always`)

- 액션: 없음

## F017 v2 단계 4 등급 (2026-11-11)

- 이 REQ 의 파일에 등급 칸 · 줄을 더하기만 했다(`salt-server/src/coach/domain/ports.ts`). 주인 판단은 F017 REQ 에 있다 — 여기 적는 것은 "이 파일이 왜 바뀌었나"를 6개월 뒤 찾게 하기 위해서다
- 문제 · 액션 없음

## F017 v2 단계 5 시나리오(`feat/f017-s5-short-direction`) (2026-11-11)

- 문제 없음

## F016 단계 D 짝(2026-11-12)

- 이 REQ 의 기능 변경은 없다 — 머리 주인인 공유 파일에 F016 단계 D(`SRV-REQ-052`)가 닿았다: coach `domain/ports.ts`(머리 주인) — 포트 셋(`MoveCardReader` · `MoveSummaryStore` · `MoveSummaryWriter`) · 사용량 `purpose` 에 `move_summary` 추가. 알림 · identity 몫 변경 0
- 배운 것: 공유 파일을 바꾸면 그 파일 소비처를 grep 으로 전부 — 이번엔 소비처 변경 0

## 2026-11-12 — 서버 S3b(`MONEY-S3b-identity-accounts`)

- FR-8 · 9 — Kotlin 계정 · 토큰 · JWKS · `UserRegistered` · Express 리소스 서버 전환. 회고 본문은 루트 `requirements/reports/retrospects/MONEY-S3b-identity-accounts.md` — 플랫폼 단독 종단이 BFF 의 `Bearer undefined` 를 몰랐다 · 반쯤 옮긴 상태의 FK 틈
- Action: 경로를 옮기면 BFF 를 거친 실스택을 첫 확인으로

## 2026-11-12 — 서버 S3b 확인 2회차

- 변이 11/11 · EXPLAIN · 429 · 소유자 판정 · 국내 스트림 · 게스트 실화면 · identity 중단 중 검증 — 새 결함 0. 상세 루트 체크리스트 `requirements/reports/checklists/MONEY-S3b-identity-accounts.md`

## 2026-11-12 — 서버 S3c 내 데이터(`MONEY-S3c-identity-my-data`)

- FR-3 · 4. 회고 본문 루트 `requirements/reports/retrospects/MONEY-S3c-identity-my-data.md` — 갱신 토큰이 지운 계정에 새 토큰을 줄 뻔했다(갱신이 서명만 봤다) · 내보내기 시각이 KST 로 나왔다(README 는 UTC)
- Action: 사람 데이터를 다루는 기능은 "지운 뒤 그 토큰으로 무엇이 되나"를 첫 시험에
