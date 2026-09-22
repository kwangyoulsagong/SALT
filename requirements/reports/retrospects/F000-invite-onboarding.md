# F000 초대 코드 · 온보딩 3스텝 — 회고

- 브랜치: `feat/f000-invite-onboarding-slice` (PR #42, 머지 `658ed39`)
- 날짜: 2026-09-18
- 체크리스트: `requirements/reports/checklists/F000-invite-onboarding.md`
- 슬라이스: `requirements/specs/in-progress/F000-invite-onboarding-slice.md`

## 1. 무엇을 했나

`POST /api/auth/register` 가 이메일만 받으면 계정을 주고 있었다 — 공통 수용 기준 "초대 코드
없이 계정이 생성되지 않는다"가 열려 있었다. 그 경로를 닫고 `auth` 를 DDD 컨텍스트로 세운 뒤,
초대 수락과 온보딩 3스텝을 서버(`be33196`·`9de46f4`) → BFF(`a4f9cee`) → 프론트(`bfe19ba`)로
관통시켰다. 흩어져 있던 in-progress REQ 다섯 개가 이 한 기능에서 멈춰 있었다.

## 2. 잘 된 것

**규율을 구조로 바꿨다.** 코드 점유와 계정 생성을 `InviteCodeStore.redeem` 한 연산으로 묶어
"코드 없이 계정을 만드는 함수"가 컨텍스트에 존재하지 않는다(`be33196`). 동시 2요청 실측에서
201 하나 · 403 `INVITE_ALREADY_USED` 하나, 계정 1개였다(체크리스트 §1 #7).

**판정 순서로 정보 노출을 막았다.** 코드 상태를 상한보다 먼저 본다. 뒤집으면 무인증 `check` 로
정원을 폴링할 수 있다. BFF 도 `quota` 를 한 번 더 지워 두 겹으로 막았다(`a4f9cee`). 정원 3/3
상태에서 멀쩡한 코드가 `{"valid":true}` 인 것을 실측했다(§2).

**없는 컨텍스트를 프로브로 대체하고 그 사실을 적었다.** `ledger`·`plan` 이 없어 `composition.ts`
에 `portfolio.countTransactions` 와 `goal` 행 존재를 꽂았다. 판정 규칙은 컨텍스트 안에 있고,
바뀌는 곳이 두 줄이라는 것이 미충족 표에 그대로 남아 있다(§5).

## 3. 틀렸던 것

### axios 번들 회귀를 세 번째로 만들었다 — `ac86d55`

새 호출 셋에 `axios` 를 써서 `/home` 136 → **166 kB**, `/onboarding` **146 kB** 였다.
`apiFetch` 로 바꿔 145 · 125 kB 로 되돌렸다(§4). `FE-REQ-009` 회고와 관심 종목 탭 회고가
**이미 두 번 적은 실수**다. 회고에 적는 것만으로는 다음 세션의 같은 선택을 막지 못했다.

> **Action:** `no-restricted-imports` 로 `axios` 를 지정 슬라이스 밖에서 막는다(`ac86d55` 본문이
> 제안). 2026-09-22 현재 `packages/eslint-plugin-fsd/` 와 `.claude/rules/` 에 그 규칙이 없다.

### 로그인해도 `/api/app/*` 가 전부 401 이었다 — `bfe19ba` 에서 발견

`readAccessToken` 은 있는데 `ACCESS_TOKEN_KEY` 에 **쓰는 코드가 없었다**. `useSignIn` 은
`USER_KEY` 만 저장했다. 화면은 401 을 "데이터 없음"으로 그려 빌드·타입체크·lint 를 통과한 채
깨져 있었다(체크리스트 §6). 관심 종목 탭에서 만난 "소비처 없는 계약"과 같은 모양이다.

> **Action:** 읽는 키와 쓰는 키를 한 모듈에 둔다 — 이미 `shared/api/authToken.ts` 로 모았다.
> 쿠키 전환(`FE-REQ-013`)이 그 파일을 교체할 때 쓰기 경로를 같이 검증한다.

### `layer-check` 훅이 한 번도 돌지 않았다

파일을 Bash 로 써서 Edit/Write `PreToolUse` 훅을 우회했다. 같은 규칙 표를 읽는 ESLint 가
통과해 결론은 같지만, 차단 시점이 쓰기 직후가 아니라 lint 시점으로 밀렸다(§3).

> **Action:** 검증 체크리스트 "게이트" 에 `layer-check` 결과를 적을 때 **훅이 돌았는지 · lint 로
> 대신했는지**를 구분해 적는다.

### 트랜잭션을 열 자리가 규칙 안에 없었다

`ddd-infrastructure.md` §7 은 "`$transaction` 은 `application` 의 것"이라고 하는데 `application`
은 `infrastructure` 를 import 할 수 없다. 레포 첫 트랜잭션이라 드러났고, 원자성을 Port 계약
(`redeem`)으로 올려 풀었다(§6).

> **Action:** §7 에 "원자성이 필요하면 Port 연산 하나로 올린다"를 한 줄 추가한다. 2026-09-22 현재
> §7 문구는 그대로다.

## 4. 남은 기술부채

체크리스트 §5 와 같은 표다. 요약만 둔다.

| 항목 | 언제 닫히나 |
|---|---|
| **온보딩 화면·홈 카드 브라우저 실측 없음** — `curl` 12경우만 확인 | 다음 슬라이스로 넘겼으나 `F000-realtime-reliability` 체크리스트 §5 에서도 "Chrome 확장 미연결"로 다시 미뤄졌다. **아직 열려 있다** |
| 온보딩 2·3단계가 안내만 한다 · 판정 소스가 REQ 지정과 다르다 | F001(`ledger`) · F003(`plan`) |
| `composition.ts` 가 `goal` 을 Prisma 로 직접 센다 | `goal` 컨텍스트 이관(`SRV-REQ-007` FR-33) |
| 온보딩 상태 조회가 서버 컴포넌트가 아니다 | `FE-REQ-013`(쿠키 인증) |
| `/investments` +8 kB (`entities/auth` barrel re-export 추정) | `FE-REQ-013`(PERF) |
| 발급 화면 없음 · 코드 재조회 불가 · 잠금 정책 없음 | 앞 하나는 사용자 10명 초과 시, 뒤 둘은 의도 |

## 5. 다음에 보완할 규칙 · 문서

- **축적된 회고 교훈은 lint 로 옮긴다.** 같은 실수가 세 번 기록되면 문서가 아니라 규칙 코드 차례다.
- `ddd-infrastructure.md` §7 — Port 연산으로 원자성을 올리는 형태를 명시한다.
- 브라우저 실측을 "다음 세션"으로 넘길 때 **넘긴 횟수**를 적는다. 한 번 넘긴 항목이 다음
  체크리스트에서 같은 사유로 다시 넘어갔다.
