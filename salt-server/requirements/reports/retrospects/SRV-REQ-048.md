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

## 2026-11-13 — 서버 S3d(`MONEY-S3d-identity-classify-usage`)

- FR-6 · 7. 회고 본문 루트 `requirements/reports/retrospects/MONEY-S3d-identity-classify-usage.md`
- 계획의 "분류 표"를 표 주석으로 정정 — 원천이 둘이면 갈라진다(S3c "목록에 없는 표" 와 같은 장치로 막음)
- Action: 사람 표를 만들면 주석 한 줄까지 같은 마이그레이션에(규칙 `kotlin-platform.md` §4 · `prisma-database.md`)

## F017 v4 순서 1b 짝 (2026-11-13)

- `composition.ts` 등락 의존(`move`)에 원인 근거 리더(`PrismaMoveEvidenceReader`) 조립 한 줄
- 회고 본문은 루트 `requirements/reports/retrospects/F017-v4-stage1-panel.md`

## F017 v4 1d 짝 (2026-11-13)

- 배운 것 없음 — 짝 변경(주인 `SRV-REQ-053`)

## 2026-11-14 — F017 v4 2a 걸침

- 머리 주석이 이 REQ 를 가리키는 파일을 `SRV-REQ-058` 이 걸쳤다 — 동작 변경은 위 체크리스트 한 줄뿐

## 2026-11-16 — 새 맥 이전 걸침

- 회고 본문은 루트 `requirements/reports/retrospects/OPS-002-new-mac-setup.md`

## 2026-11-16 — F017 v4 순서 3a 짝

- 배운 것 없음 — 짝 변경

## 2026-11-16 — `SRV-REQ-057` FR-8 짝

- 배운 것 없음 — 짝 변경

## 2026-11-16 — F017 v4 순서 5 짝

- 이 REQ 의 기능 변경 없음 — 공유 파일에 한 자리. 회고 본문은 루트 `requirements/reports/retrospects/F017-v4-stage5-ontology.md`


## 2026-11-17 — F008 슬라이스 24 2단계(`feat/f008-slice24-s2-earnings-window`, 루트 `requirements/specs/in-progress/F008-slice24-kr-market-events-slice.md`)

- **잘 된 것** — 실제 원문 · 전 종목을 눈으로 살펴 첫 판 결함 여섯을 done 전에 잡았다(디코딩 · 월간 공시 · 건수 규칙 · IR 내용 칸 · 스키마 CHECK 둘).
- **아쉬운 것** — 스키마 불변식(`scheduled_event` `announced_at <= event_at`)을 설계 전에 읽지 않아 실행에서야 걸렸다. 선언을 믿는 디코더가 3일 동안 한글을 깨뜨렸는데 숫자 대조가 통과해 아무도 몰랐다.
- **다음에** — 새 원천은 저장된 본문을 한 건 눈으로 본다(글자가 사람이 읽을 수 있나) · 표에 행을 쓰는 설계는 그 표의 CHECK · FK 부터 읽는다. 기계 검사는 `dartDecode.test.ts`(실제 원문 픽스처)로 둔다(done 체크리스트 §1).

## 2026-11-18 — F008 O3 해설 에이전트 도구(`feat/fc-req-023-agent-tools`)

- 변경 없음(짝)

## 2026-11-18 F006 코치 대화 1단계 — 같은 파일

- 이 REQ 몫 변경 없음 — 기록만

## 2026-11-18 — F006 대화 2단계 짝

- 머리 주석 주인이라 걸렸다 — 이 REQ 의 계약은 그대로. Action 없음
