# FE-REQ-008 회고 — App Router 이관 + 스트리밍 SSR

작성: 2026-09-11
체크리스트: `requirements/reports/checklists/FE-REQ-008.md`

## 1. 이 REQ가 실제로 판정한 것

REQ 본문이 스스로 게이트를 걸어 뒀다: **"첫 블록 300ms 이내 + 총 완료 시간 악화 없음"을
만족하지 못하면 스트리밍을 쓰지 않고 1콜 집계로 되돌린다"**(FR-31).

측정값은 **31.9ms vs 1572.8ms**(p95)였고 총 완료는 오히려 27ms 빨라졌다. 판정은 통과다.

**이 수치가 합성이라는 점이 이 REQ의 가장 큰 한계다.** 판정 대상 화면이 셋 다 아직 없다.
그래서 값을 재는 대신 **재는 방법을 고정**했다 — 프로브 라우트와 `scripts/measure-streaming.mjs`.
F006에서 홈 5블록이 생기면 같은 명령을 홈 URL로 돌리면 된다.

프로브를 만들지 않는 선택지도 있었다. 그러면 "스트리밍이 우리 환경에서 실제로 chunk를
나눠 보내긴 하는가"를 다음 사람이 처음부터 확인해야 한다. **판정 불가를 판정 생략으로
남기지 않기 위해** 프로브를 만들었고, 그 수치가 합성이라는 것을 체크리스트 §3-1·§6-2에
세 번 적었다.

## 2. 예상과 달랐던 것

### 2-1. `"use client"`보다 **번들러 조건**이 더 자주 발목을 잡았다

경계 설계(어디에 `"use client"`를 붙일까)는 예상대로 기계적이었다. 실제로 시간을 먹은 것은
**"클라이언트 컴포넌트도 SSR을 위해 서버로 한 번 컴파일된다"** 는 사실에서 파생된 문제였다.

`msw/browser`는 `exports`에 `"node": null`을 갖는다. 서버 컴파일에 들어가면 빌드가 깨진다.
`next/dynamic({ssr:false})`로 막힐 줄 알았는데 **dev 서버는 그래도 서버 그래프에 넣는다.**
프로덕션에서만 통과한 것은 `NODE_ENV`가 인라인돼 삼항이 죽었기 때문이고, 그건 해결이 아니라
**우연**이었다. 프로덕션 빌드만 돌려보고 넘어갔으면 dev를 깨진 채로 커밋했을 것이다.

→ 규칙에 반영했다: `ssr.md` "App Router에서 달라지는 것".

### 2-2. lint 캐시가 수정을 지웠다

`web-tax`에 `app/page.tsx`를 만들었더니 `/`가 두 zone에 생겨 cross-zone `<a href="/">`가
lint에서 막혔다. 파일을 지웠는데 **같은 에러가 계속 나왔다.** `.next/cache/eslint`를 지우니
사라졌다. 그 사이에 플러그인 소스를 읽고 `node_modules`를 패치해 가며 원인을 찾았다 —
**전부 헛수고였다.** (패치는 전부 되돌렸고 원본과 diff 0을 확인했다.)

→ action: 규칙 위반이 "고쳤는데 그대로"일 때 **캐시를 먼저 지운다.** `.next/cache/eslint`,
`.eslintcache`, `.turbo`.

### 2-3. zone 경로 유일성이 App Router에서 다시 걸렸다

`FE-REQ-007`의 "zone 간 경로 중복 0건"은 라우팅 충돌 방지 규칙이었는데, App Router로 옮기면서
`app/page.tsx`라는 **새로운 방식으로 같은 규칙을 어길 수 있게 됐다.** Pages Router의 `src/pages/`에
`index.tsx`가 없었으니 이전 구조에서는 이 실수가 불가능했다.

→ `apps/web-tax/pages/README.md`에 "`app/page.tsx`를 두지 않는다"를 근거와 함께 적었다.

## 3. 판단한 것과 그 대가

| 판단 | 대가 | 왜 받아들였나 |
|---|---|---|
| `next.config.js`에 `webpack` 훅 추가 | **Turbopack을 못 쓴다** | 지금 안 쓴다. MSW를 걷어내는 `FE-REQ-012` 때 훅도 같이 사라진다 |
| 프로브 라우트를 앱 안에 둠 | 프로덕션 코드에 측정용 라우트가 1개 | 기본값 404. `STREAMING_PROBE=1`일 때만 열린다. 별도 앱을 만드는 비용이 더 크다 |
| `BlockBoundary`를 `src/components/Block`에 둠 | `streaming-ssr.md`의 예시 경로(`shared/ui`)와 다르다 | **아직 FSD가 아니다.** `src/shared`를 지금 만들면 FSD 전환을 반쯤 해 놓는 셈이 된다. `FE-REQ-009`에서 옮긴다 |
| 홈 블록을 서버 컴포넌트로 바꾸지 않음 | 홈이 아직 스트리밍되지 않는다 | 블록별 BFF 엔드포인트가 없다(`BFF-REQ-028`). 영역을 넘는 변경이고 계약이 확정되지 않았다 |
| 로그인 화면을 `index.tsx`(서버) + `LoginForm.tsx`(클라이언트)로 분리 | 파일 1개 증가 | 화면 전체가 폼이어도 **서버 껍데기를 남기는 것이 기본**임을 코드로 남긴다. AC의 "잎으로 한정"도 이걸 요구한다 |

## 4. Action Items

| # | 할 일 | 언제 |
|---|---|---|
| 1 | `.codex/rules/`에 빠진 9개 미러 (`fsd-*` 6 · `layered-architecture` · `performance-frontend` · `performance-rn` · `rn-*` 2) | **별도 커밋, 이 PR 직후** |
| 2 | 홈 5블록을 서버 컴포넌트 + `await fetch`로 바꾸고 `measure-streaming.mjs`를 홈 URL로 재측정 | `FE-REQ-030`~`033` (F006) |
| 3 | `BlockBoundary`·`BlockSkeleton`을 `src/shared/ui`로 이동 | `FE-REQ-009` |
| 4 | 토큰을 httpOnly 쿠키로 옮기고 서버 컴포넌트가 BFF를 부르게 | `FE-REQ-013` |
| 5 | `/investments` → `/assets` 리다이렉트 | `FE-REQ-030` |
| 6 | MSW 제거 후 `next.config.js`의 `webpack` 훅 삭제 → Turbopack 재검토 | `FE-REQ-012` |
| 7 | 부분 실패 시 다른 블록 스켈레톤이 잠깐 다시 보이는 현상을 홈 5블록에서 재확인 | `FE-REQ-031` |

## 5. 남은 리스크

- **`BlockBoundary`가 지금은 error boundary로만 일한다.** 홈이 서버 조회로 바뀌기 전까지
  "Suspense가 걸려 있으니 스트리밍된다"고 오해하기 쉽다. 홈 페이지 주석에 그렇지 않다고 적어 뒀지만,
  **주석은 lint가 아니다.** F006 착수 시 이 파일을 먼저 읽어야 한다.
- **HTML이 5배 커졌다**(`/home` 3.3KB → 16.7KB). RSC flight payload 때문이고 TTFB는 그대로지만,
  블록 데이터가 실제로 들어가기 시작하면 이 값이 다시 오른다. F006에서 다시 잰다.
- **프로브의 판정과 실제 화면의 판정이 다를 수 있다.** 프로브의 지연은 `setTimeout`이고
  실제는 네트워크 + BFF다. 특히 서버 컴포넌트에서 `await`를 연달아 쓰면 **서버 워터폴**이 되어
  스트리밍 이득이 사라진다 — `performance-frontend.md` §4가 이미 경고하는 자리다.
