# FE-REQ-055 — 셸 홈 요약 카드 — 회고

2026-11-02 · 체크리스트 `checklists/FE-REQ-055.md`

## 잘 된 것

- 셸 홈이 도메인 코드를 모르게 됐다 — 투자 블록(보유 요약 + 매입가 숨김 잎)을 BFF 카드 한 장으로. 셸 번들 `/home` 178 → 169 kB
- 카드 링크를 `ZoneLink`(레지스트리 판정)로 둬, 저축이 zone 으로 옮겨 가도(`hostedIn`) 홈 코드는 그대로다

## 아쉬운 것

- 목표 목록을 홈에 남겼다 — 규칙("홈은 카드만")과 다르지만 지우면 목표를 볼 곳이 없다. 저축 zone 까지의 빚
- 순서 · 숨김 편집은 저장할 곳이 없어 못 했다 — 스펙 FR-2 의 절반

## Action

- `FE-REQ-056`(저축 zone)에서 `/goals` 목록을 만들면 홈 `GoalsBlock` 을 같은 커밋에 지운다(파일 머리 주석에 적어 둠)

- 2026-11-02 MONEY-F1 후속 — 화면을 지우는 변경은 그 화면이 보여 주던 설정 · 소비처를 grep(루트 회고 Action)

## 2026-11-03 — MONEY-F2(`FE-REQ-054`)

- 파일만 걸침 — Action 없음

## 2026-11-03 — MONEY-S1a 저축 서비스 첫 판 · 저축 zone 첫 화면

- 걸린 몫은 위 체크리스트 한 줄. 근거 · 판단은 루트 회고 `requirements/reports/retrospects/MONEY-S1a-savings-calculator.md`. Action 없음

## 2026-11-04 — 가계부 S1a(`MONEY-S1-household-entry`)

- 계약을 도메인 넷으로 미리 잡아 둔 덕에 프론트 변경 0.


## 2026-11-05 — 주석 정정

- 이유를 적은 주석은 이유가 사라지면 낡는다 — Action: 전제(저장 위치 등)를 바꾸면 그 전제를 이유로 적은 주석을 grep 해 정정한다

## 2026-11-06 — 서버 S2c notification(`MONEY-S2c-notification`) · `9cee4715` · `33e949e8` · `2fa68f61` · `f1a3c64c`

- 실화면 결함 셋(토글 열 · 빈 패널 · 자리 칸 높이). 루트 회고 `MONEY-S2c-notification`

## 2026-11-06 — 서버 S2c 확인 2회차

- 결함과 Action 은 루트 회고 `MONEY-S2c-notification` 확인 2회차

## 2026-11-06 — 서버 S3a identity 셸 설정(`MONEY-S3a-identity-shell`)

- 결함 하나 — 저장 중 클릭 버림. S2c 알림 패널에서 만든 가드(`if (!isPending)`)를 새 패널이 그대로 본떠 같은 결함이 둘이 됐다. 규칙으로 고침: 같은 묶음 쓰기는 `scope` 로 차례로
- Action: 새 설정 패널은 `useArrangeHome` · `useToggleAlert` 꼴(`mutationKey` + `scope` + 마지막 저장만 반영)을 본뜬다

## 2026-11-06 — 서버 S3a 확인 2회차

- 첫 보고 전에 실패 · 만료 세션 경로를 안 돌렸다 — 다시 쓴 화면(온보딩)이 옛 조회의 일반 `Error` 를 그대로 물려받아 만료 세션에서 멈췄다
- Action: 공개 경로 화면의 개인 조회는 세 세션(없음 · 살아 있음 · 만료)을 첫 실화면 스크립트에 넣는다 · 조회 함수는 `readApiError` 만

## 2026-11-12 — 서버 S3c 내 데이터

- 지운 뒤 바로 로그인 화면으로 넘기지 않고 결과 한 줄을 남겼다 — 무엇이 지워졌는지 보이게. 쿠키는 결과를 보이기 전에 지운다
- 실화면 시험의 갱신 쿠키는 경로 `/api/session` 으로 넣는다 — `url` 로 넣으면 경로가 `/api/` 가 돼 "쿠키가 안 지워짐"처럼 보인다
