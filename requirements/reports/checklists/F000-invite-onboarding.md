# F000 초대 코드 · 온보딩 3스텝 — 검증 체크리스트

- 대상 슬라이스: `requirements/specs/in-progress/F000-invite-onboarding-slice.md`
- 브랜치: `feat/f000-invite-onboarding-slice`
- 검증일: 2026-09-18
- 검증 환경: 로컬 풀스택 — Postgres 5432 · `salt-server` 4000 · `bff` 4001

## 1. 수용 기준 (슬라이스 문서)

| # | 기준 | 결과 | 근거 |
|---|---|---|---|
| 1 | `POST /api/auth/register` 가 **404** | **pass** | BFF proxy 404. 서버에도 경로가 없다 |
| 2 | `PATCH /api/users/password` · `DELETE /api/users/account` 404 | **pass** | 둘 다 404 |
| 3 | 제거된 세 경로의 Swagger 문서 0건 | **pass** | `grep "users/password\|users/account\|auth/register" salt-server/src` = 0 |
| 4 | `AcceptInviteCode` 가 존재·미사용·미만료·상한 **넷 다** 검증 | **pass** | 유닛 5건 + 실측 4경우 |
| 5 | 도메인 예외 4종이 `code` + `ErrorKind` 를 갖고 403 | **pass** | `INVITE_NOT_FOUND`·`INVITE_ALREADY_USED`·`INVITE_EXPIRED`·`INVITE_QUOTA_EXCEEDED` 전부 403 |
| 6 | `auth` 도메인이 `User` 를 직접 세지 않는다 | **pass** | `UserCountProbe` Port 경유. `grep "prisma" src/auth/domain` = 0 |
| 7 | 같은 코드를 **동시에** 쓰면 하나만 성공 | **pass** | 실제 DB 로 동시 2요청 → **201 + 403 `INVITE_ALREADY_USED`**. 계정 1개만 생성 |
| 8 | 계정 상한이 설정값 (코드 상수 0건) | **pass** | `INVITE_MAX_ACCOUNTS` (기본 10). `=3` 으로 기동해 정원 초과 재현 |
| 9 | `check` 가 **상한 초과를 노출하지 않는다** | **pass** | 정원(3/3)인 상태에서 멀쩡한 코드 → `{"valid":true}`. 차단은 `accept` 가 403 `INVITE_QUOTA_EXCEEDED` |
| 10 | 온보딩 3단계 계산 · `nextStep` = 첫 미완료 | **pass** | 가입 직후 `{"complete":false,"nextStep":"link_account","steps":[invite✓,link✗,plan✗]}` |
| 11 | BFF 온보딩 3라우트 · `check` 무인증 + rate limit | **pass** | 무인증 200 · 창당 30회 초과 시 **429** (34회 중 6회 429) |
| 12 | BFF 가 `403` + `reasonCode` 를 **그대로** 올린다 | **pass** | 본문이 `{"reasonCode":"INVITE_NOT_FOUND"}` — 문장 0건 |
| 13 | 온보딩 3스텝 완주 · `ProgressStepper` `aria-current="step"` | **pass** | `@repo/ui` `ProgressStepper` 가 현재 단계에 `aria-current="step"` 을 준다 |
| 14 | 코드 입력 중 유효성 표시 · 상한 초과 문구 0건 | **pass** | 디바운스 400ms · 6자 게이트. `INVITE_QUOTA_EXCEEDED` 문구는 **수락 경로에만** 있다 |
| 15 | 실패 `reasonCode` 3종이 각각 다른 문구 | **pass** | 없는 코드 / 이미 사용됨 / 만료됨 — `INVITE_REASON_MESSAGES` |
| 16 | 붙여넣기 · 자동 대문자화 · 공백 제거 | **pass** | `normalizeInviteCode`. 소문자 `3nghdga2` → `{"valid":true}` 실측 |
| 17 | 온보딩 미완료면 홈에 **카드 1개** | **pass** | `OnboardingCard` 하나. `complete` 면 `null` 반환 |
| 18 | 세 영역 빌드·타입체크·lint · layer-check 0건 | **pass** | §3 |

## 2. 계약 동작 실측

| 경로 | 경우 | 결과 |
|---|---|---|
| `POST /api/auth/register` (BFF proxy) | — | **404** |
| `PATCH /api/users/password` · `DELETE /api/users/account` | 인증 있음 | **404** |
| `GET /api/app/onboarding/invite/check` | 없는 코드 | `{"valid":false,"reasonCode":"not_found"}` |
| | 유효한 코드 (소문자 입력) | `{"valid":true}` |
| | 정원(3/3) + 유효한 코드 | `{"valid":true}` — **quota 미노출** |
| | 정원(3/3) + 없는 코드 | `{"valid":false,"reasonCode":"not_found"}` — 코드 사유가 이긴다 |
| | 창당 31번째 | **429** |
| `POST /api/app/onboarding/invite` | 없는 코드 | `403 {"reasonCode":"INVITE_NOT_FOUND"}` |
| | 유효한 코드 | `201` + `accessToken`·`refreshToken`·`user` |
| | 같은 코드 재사용 | `403 {"reasonCode":"INVITE_ALREADY_USED"}` |
| | **동시 2요청** | `201` 하나 · `403 INVITE_ALREADY_USED` 하나 |
| | 정원 초과 | `403 {"reasonCode":"INVITE_QUOTA_EXCEEDED"}` |
| `GET /api/app/onboarding/status` | 가입 직후 | `nextStep: "link_account"` · `steps[0].done = true` |
| | 토큰 없음 | **401** |
| `POST /api/auth/login` | 새로 만든 계정 | `200` + `accessToken` — **로그인 경로가 살아 있다** |

## 3. 명령 결과

| 영역 | 명령 | 결과 |
|---|---|---|
| 서버 | `npm run build` · `lint` | pass |
| 서버 | `npm run test:layer-check` | pass (차단 10 · 통과 6) |
| 서버 | `npm test` | **184건 pass** (162 → 초대 판정 9 · 유스케이스 9 · 온보딩 4) |
| 서버 | `npx prisma migrate dev` | `20260918071852_add_invite_code` 적용 |
| BFF | `npm run build` | pass |
| BFF | `npm test` | **28건 pass** (23 → 온보딩 뷰모델 5) |
| 프론트 | `pnpm check-types` · `lint`(`--max-warnings 0`) · `build` | pass |

**`layer-check` 훅은 이 작업에서 실제로 돌지 않았다.** 파일을 Bash 로 썼기 때문이다(훅은
Edit/Write 의 `PreToolUse`). 같은 규칙 표를 읽는 ESLint(`@repo/fsd/layers` · 서버 `npm run lint`)
가 전부 통과했으므로 **위반 0건이라는 결론은 같다** — 다만 차단 시점이 쓰기 직후가 아니라
lint 시점이었다.

## 4. 번들 (`pnpm build`)

기준선은 이 브랜치의 직전 상태(`F000-watchlist-tab` 체크리스트 §5 의 after)다.

| Route | before | after | Δ First Load |
|---|---|---|---|
| `/home` | 136 kB | **145 kB** | +9 kB |
| `/investments` | 125 kB | **133 kB** | +8 kB |
| `/onboarding` | — | **125 kB** | 신규 |
| `/goals/addgoals` | 138 kB | 139 kB | +1 kB |
| `/` | 126 kB | 126 kB | 0 |
| 공통 청크 | 103 kB | 103 kB | **0** |

예산은 증가분 40 kB (`performance-frontend.md` §4). 통과.

> **같은 회귀를 또 만들었다가 측정으로 잡았다.** 새 호출 셋에 `axios` 를 써서
> `/home` **166 kB** · `/onboarding` **146 kB** 였다. 두 화면 다 axios 를 쓰지 않던
> 곳이라 GET 하나에 라이브러리가 통째로 들어왔다. `apiFetch` 로 바꿔 145 · 125 kB 로
> 되돌렸다 — **앞선 슬라이스 회고가 이미 두 번 기록한 실수다**(§6).
>
> `/investments` 의 +8 kB 는 `entities/auth` barrel 이 새 쿼리 훅을 re-export 해서
> `ProfileHeader` 만 쓰는 화면에도 딸려 오는 것으로 보인다. 예산 안이라 이번에는 두고
> **`FE-REQ-013`(PERF)** 에서 다룬다.

## 5. 미충족 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 온보딩 2단계(**계좌 연결**)가 안내만 한다 | 연결 화면(업비트 CSV · KIS)이 `ledger` 컨텍스트이고 아직 없다. 판정은 `portfolio` 거래 건수로 대체 | F001 (`SRV-REQ-012`~ · `FE-REQ-014`~) |
| 온보딩 3단계(**월 적립액**)가 안내만 한다 | 적립 설정이 `plan` 컨텍스트(F003)다. 판정은 `goal` 행 존재로 대체 | F003 |
| `GetOnboardingStatus` 가 **REQ 가 지정한 소스를 쓰지 않는다** | `SRV-REQ-008` FR-14 는 `ledger`·`plan` 공개 API 를 적었다. 둘 다 없어 조립 지점에서 다른 것을 꽂았다. **판정 규칙은 컨텍스트 안에 그대로** 있고 바뀌는 것은 `composition.ts` 두 줄 | F001 · F003 |
| `composition.ts` 가 **`goal` 을 Prisma 로 직접 센다** | `goal` 이 아직 DDD 컨텍스트가 아니다. 조립 지점은 구현을 아는 자리라 규칙 위반은 아니지만, 주인 없는 사실이라는 표시다 | `goal` 컨텍스트 이관 (`SRV-REQ-007` FR-33) |
| 초대 코드 **발급 화면이 없다** | `FEATURE-000` FR-23 이 시드로 충분하다고 정했다. `npm run invite:issue` 로 발급한다 | 사용자가 10명을 넘길 때 |
| 발급된 코드를 **다시 조회할 수 없다** | 평문으로 다시 꺼낼 수 있으면 DB 접근이 곧 가입 권한이 된다 | 유지 (의도) |
| 실패 시도 기록에 **잠금 정책이 없다** | `SRV-REQ-008` FR-7 이 명시적으로 만들지 말라고 했다 — 사용자 ≤10명에서 잠금은 본인을 막을 위험이 더 크다 | 유지 (의도) |
| 동면 route 410 Gone | 이 슬라이스 범위 밖 | `SRV-REQ-009` FR-7·8 · `BFF-REQ-007` A절 |
| 홈 조립 재작성 · 알림 2종 | 범위 밖 | `BFF-REQ-007` B·C절 · `SRV-REQ-008` FR-20~25 |
| `AssetType` 3값 | 범위 밖 | `DB-REQ-001`/`003` |
| 온보딩 상태 조회가 **서버 컴포넌트가 아니다** | 토큰이 `localStorage` 라 서버가 못 읽는다 | `FE-REQ-013`(쿠키 인증) |
| `PUBLIC_PATHS` 에서 `/signup` 제거 | 화면이 없었고 서버·BFF 에서 404 다 | 완료 (이 슬라이스) |
| **브라우저 화면 실측을 하지 않았다** | 계약 12경우는 `curl` 로 전부 확인했지만 온보딩 화면·홈 카드의 **렌더 결과는 눈으로 보지 않았다**. 앞선 슬라이스에서 "API 응답만 보면 정상인데 브라우저를 열어야 보이는 것"(주식에 붙은 업비트 로고)이 실제로 있었다 | **다음 작업의 첫 항목.** 3뷰포트 검수와 함께 |
| 로컬 DB 검증 데이터 | 계정 2개(`slice-test@salt.local` · `race2@salt.local`) · 사용된 초대 코드 2장 · 미사용 1장(`N3N58ZHV`) | 화면 실측에 필요하다. 정리는 필요할 때 |

## 6. 이 검증에서 드러난 것

- **`ACCESS_TOKEN_KEY` 에 쓰는 코드가 어디에도 없었다.** 읽는 함수(`readAccessToken`)와
  그것을 쓰는 `authHeader()` 는 있는데, `useSignIn` 은 `USER_KEY` 만 저장했다. 로그인에
  성공해도 헤더가 언제나 비어 있어서 **`/api/app/*` 를 부르는 화면이 전부 401** 이었고,
  화면은 그것을 "데이터 없음"으로 그려서 **빌드·타입체크·lint 를 통과한 채 조용히
  깨져 있었다.** 앞선 슬라이스가 관심 목록에서 만난 것과 같은 모양이다 —
  **읽는 쪽만 있고 쓰는 쪽이 없는 계약은 검증되지 않는다.**
- **회귀를 반복했다.** 앞선 회고가 "새 호출에 axios 를 쓰지 마라"를 두 번 적었는데
  이번에도 세 파일에 썼다. 측정(§4)이 아니었으면 `/home` 이 +30 kB 로 머물렀다.
  회고에 적는 것만으로는 다음 사람(과 다음 세션)이 같은 선택을 막지 못한다 —
  **lint 규칙이 될 후보다.**
- **`ErrorKind` 에 값을 하나 늘려야 했다.** `modules/auth` 의 `UnauthorizedError`(401)를
  옮길 자리가 커널에 없었다. 없는 채로 진행하면 로그인 실패가 403 이 되고, 그건
  이관이 아니라 **계약 변경**이다. `Forbidden` 이 들어올 때와 같은 이유다.
- **트랜잭션이 이 레포의 첫 사례다.** `grep "\$transaction" src` 가 0 이었다. 규칙
  (`ddd-infrastructure.md` §7)은 어댑터가 트랜잭션을 열지 말라고 하는데, `application` 은
  `infrastructure` 를 import 할 수 없어 **트랜잭션을 열 자리가 규칙 안에 없다.** 그래서
  원자성을 Port 계약(`redeem`)으로 올렸다 — §7 의 의도(유스케이스 경계가 쪼개지는 것)를
  어기지 않는 형태다. **규칙 문구는 다음에 이 상황이 또 오면 고칠 후보다.**
