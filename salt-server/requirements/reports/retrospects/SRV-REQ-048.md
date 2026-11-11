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
