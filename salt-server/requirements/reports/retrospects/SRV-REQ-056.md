# SRV-REQ-056 회고

## 2026-11-10

- **비밀로 막는다** — 게스트 토큰을 사람 토큰과 같은 비밀로 서명하면 `authMiddleware` 가 받아 `userId` 없는 사람이 된다. 파생 비밀이면 코드 실수가 있어도 서명에서 떨어진다. 경계 표 테스트로 고정
- 국내 판정 제거는 호출처 열넷 · 테스트 47개 — 시세 유스케이스가 `viewer` 를 받던 모양 자체를 걷어 "판정 자리가 라우터 하나"가 됐다. 다시 좁힐 일이 생기면 유스케이스가 아니라 미들웨어 한 곳
- 기계 검사(`ownerGateScope`)를 둔 이유: 소유자 판정이 어디 남는지가 이번 결정의 전부다 — 문서보다 grep 테스트가 오래 간다
- 발급 상한을 "IP 당"으로 적었는데 BFF 뒤라 IP 가 하나였다 — 기획 단계에서 요청 경로(브라우저 → 셸 → BFF → 서버)를 끝까지 그렸어야 했다
- 실화면 확인 중 장중 504 를 보고 원인(조건 없는 봉 다시 쓰기 · 8시간 열린 트랜잭션)까지 고쳤다 — `DB-REQ-017` 5회차

## F017 단계 1c 수집 따라잡기 (2026-11-11, `feat/f017-s1c-collection`)

- 닿은 것: `env.ts` — `KIS_REQUESTS_PER_SECOND` 비우면 주소로(모의 1 · 실 3) · `KIS_MAX_IN_FLIGHT`(`SRV-REQ-057` FR-3). 손님 시세 변경 0
- 문제 · 액션: 없음 — 주인 REQ 는 `SRV-REQ-057` · `DB-REQ-044`

## F017 v2 단계 3 (2026-11-11, `feat/f017-s3-explain-always`)

- 액션: 없음

## F017 v2 단계 5 시나리오(`feat/f017-s5-short-direction`) (2026-11-11)

- 기계 검사가 새 소유자 판정 자리를 허용표에 적게 만들었다 — 의도대로

## F016 단계 D 짝(2026-11-12)

- 이 REQ 의 기능 변경은 없다 — 머리 주인인 공유 파일에 F016 단계 D(`SRV-REQ-052`)가 닿았다: `env.ts`(머리 주인)에 `MOVE_SUMMARY`(on/off) 하나. 한 줄 읽기 경로는 시장 경로와 같은 읽는 사람(`marketReaderMiddleware` — 게스트 포함)
- 배운 것: 공유 파일을 바꾸면 그 파일 소비처를 grep 으로 전부 — 이번엔 소비처 변경 0

## 2026-11-12 — 서버 S3b(`MONEY-S3b-identity-accounts`)

- 짝 — 게스트 토큰 RS(`aud`) · 경계 표 9행. 회고 본문은 루트 `requirements/reports/retrospects/MONEY-S3b-identity-accounts.md` — 플랫폼 단독 종단이 BFF 의 `Bearer undefined` 를 몰랐다 · 반쯤 옮긴 상태의 FK 틈
- Action: 경로를 옮기면 BFF 를 거친 실스택을 첫 확인으로
