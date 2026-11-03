# ADR-005 — 프론트 zone 을 도메인으로 자른다 (셸 + 투자 · 저축 · 가계부 · 금융 팁)

- 상태: **채택 (사용자 결정)**
- 날짜: 2026-10-30
- 대체: `ADR-001` §3-4 의 zone 판정(세 조건 · "탭으로 자르지 않는다") · `ADR-002` §5 에 열어 둔 `web-tax` 처리
- 관련: `FEATURE-012`~`015` · 설계 `salt-microFe/docs/architecture/2026-10-30-domain-zones.html` · `FE-REQ-052`~`058` · `RN-REQ-032`

> 사용자 결정(2026-10-30): *"투자도 zone으로 빼야한다니까"*, *"web-investment이렇게 빠져야하지않냐"*,
> *"도메인으로 zone을 분리해야하고 rules해야돼 그게 마이크로프론트엔드지"*

## 1. 결정

SALT 는 투자 앱이 아니라 **돈 관리 앱**이다(`FEATURE-015`). 마이크로프론트엔드 경계를 **도메인**으로 긋는다.

| zone 앱 | 도메인 | 경로 | 화면 코드 | 포트 · assetPrefix |
|---|---|---|---|---|
| `apps/web` | 셸 (default) | `/` `/home` `/login` `/onboarding` · 설정 | 셸 전용 | 3000 · — |
| `apps/web-investment` | 투자 (`invest`) | `/investments` `/coach` `/search` | `packages/domain-invest` | 3002 · `/investment-static` |
| `apps/web-savings` | 저축 (`savings`) | `/goals` | `packages/domain-savings` | 3003 · `/savings-static` |
| `apps/web-household` | 가계부 (`household`) | `/household` | `packages/domain-household` | 3004 · `/household-static` |
| `apps/web-tips` | 금융 팁 (`tips`) | `/tips` (공개 · ISR) | `packages/domain-tips` | 3005 · `/tips-static` |

- `apps/web-tax` 는 **삭제**한다(ADR-002 로 기능이 없다, 90줄 자리표시자).
- 가계부 도메인 이름은 `household` — ADR-002 가 지운 `ledger`(개입 청구서 원장)와 섞이지 않게.
- 도메인 이름은 프론트 패키지 · BFF 경로 · 서버 서비스(`ADR-006`) · RN 서비스 번들(`RN-REQ-032`)이 같다.

## 2. 규칙 (microfrontend.md 개정 — `FE-REQ-052`)

1. zone 하나 = 도메인 하나. 목록은 `@repo/core/zones` 레지스트리 한 곳
2. 셸은 인증 · 온보딩 · 홈 · 공용 크롬만. `domain-*` import 금지. 홈은 `HomeSummaryCard[]` 로만 받는다
3. `domain-*` 끼리 import 금지. 도메인 사이는 URL 링크와 BFF 응답(서버 계산 값)으로만
4. zone 앱은 얇다 — `app/` 라우트 · 레이아웃 · `next.config.js` 만
5. zone 간 링크는 `CrossZoneLink`. `next/link` 는 같은 zone 안에서만(lint)
6. 하단 탭 · 헤더는 `@repo/ui` ~~`AppChrome`~~ **`AppNavigation`**(이름 정정 2026-11-03 — 사용자 결정, "chrome" 은 브라우저 이름과 겹친다) 하나. 공용 패키지 변경은 영향 zone 동시 배포
7. 경로 prefix · assetPrefix 는 zone 간 유일. 셸 rewrites 는 레지스트리에서 생성

강제는 문서가 아니라 코드다: `layer-rules.cjs`(도메인 축) · `eslint-plugin-zone`(레지스트리 전체) · `registry.ts`.

## 3. 대가와 완화

zone 을 넘는 이동은 문서 이동(hard navigation)이다. 하단 탭이 가장 잦은 zone 간 이동이 된다.
같은 origin 이므로 자체 호스팅에서도 완화 장치가 있다(`FE-REQ-054`).

| 장치 | 효과 | 한계 |
|---|---|---|
| Speculation Rules prerender(`eagerness: moderate`) | 탭을 누르기 전에 다음 zone 첫 화면을 미리 렌더 | Chromium 계열만. Safari 는 일반 이동 |
| 문서 간 View Transitions(`@view-transition { navigation: auto; }`) | 크롬은 제자리, 본문만 전환 | 같은 origin 만 |
| 첫 화면 숫자 서버 렌더 | 캐시가 비어도 숫자가 HTML 에 있다 — 가격 깜빡임 금지 유지 | — |
| 공용 청크 같은 해시 | React · 디자인 시스템 캐시 공유 | zone 별 번들러 설정이 같아야 |

## 4. 선택하지 않은 것

| 안 | 왜 아닌가 |
|---|---|
| 투자만 셸 안에 두고 zone 은 준비형(패키지만 분리) | 사용자 결정으로 기각. 셸이 투자 코드를 품으면 "돈 관리 앱" 구조가 코드에서 보이지 않고, 셸 배포가 투자 변경에 묶인다 |
| 탭(화면 축)으로 자르기 | 도메인 안의 잦은 이동(목록 → 상세 → 리포트)이 hard navigation 이 된다. 도메인 경계는 이동 빈도가 낮은 곳이다 |
| `@module-federation/nextjs-mf` | `ADR-001` 그대로(App Router 미지원 · 지원 종료) |

## 5. 결과

- 투자 기능은 **동결**한다 — 지금 기획된 것까지만 `apps/web-investment` 안에서 마친다(`FEATURE-015` 배경, 기능 기획서 "투자 동결").
- 배포 단위가 5개가 된다. 맥 한 대 launchd 로는 운영이 어렵다 → 배포 환경은 `ADR-008`(한 origin 경로 라우팅 · 관리형 컨테이너).
- 웹뷰로 쓰이는 zone 과 `web-tips` 는 768 미만 안내(`FE-REQ-043`)에서 빠진다.

## 6. 되돌리기

zone 은 설정 수준이다 — 화면 코드가 `domain-*` 패키지에 있으므로 zone 을 합치려면 레지스트리 · rewrites 만 바꾼다.
되돌리기 지점은 `FE-REQ-052` 단일 커밋(PR 규칙 §4).

## 7. 실행 기록

- 2026-11-02 `FE-REQ-052` — §2 규칙 1 · 4 · 5 · 7 이 코드가 됐다(레지스트리 `registry.json` · rewrites 생성 · lint/훅 도메인 축 · 빈 zone 4 · `web-tax` 삭제). 화면 이전 전 상태는 레지스트리 `hostedIn`. 규칙 2(홈 카드) · 6(`AppChrome`)은 `FE-REQ-055` · `054`
- 2026-11-02 `FE-REQ-053` · `055` · `BFF-REQ-046`(F1) — 투자 화면이 `packages/domain-invest` + `apps/web-investment` 에서 서비스된다(`invest.hostedIn`). 규칙 2 가 코드가 됐다 — 셸 홈은 `HomeSummaryCard[]` 만 그린다. 규칙 3 · 4 를 패키지 안까지(도메인 패키지 FSD 레이어 · zone lint 판정). 공용 코드는 `@repo/web-shared`(shared + zone 공용 레이아웃). 규칙 6 은 `FE-REQ-054` 전까지 그 레이아웃이 임시로 맡는다
- 2026-11-03 `FE-REQ-054`(F2) — 규칙 6 이 코드가 됐다: `@repo/ui` `AppNavigation`(왼쪽 레일 1024+ · 하단 탭 768~1023 · 머리 52) + zone 공용 레이아웃이 레지스트리 판정 · prerender 규칙 · 문서 간 전환 · 이동 계측을 입힌다. §3 표의 장치 넷 중 셋이 코드 — ~~prerender 적중은 사람 확인 남음~~ **같은 날 확인: 운영 빌드 적중 10/10, 누름 → 보임 중앙 0~1ms(미적중 101 · 145ms), 전환 녹화 깜빡임 0**. "공용 청크 같은 해시"는 해시는 같지만 URL prefix 가 달라 캐시 공유는 아직 없다(실측: 셸 → 투자에서 같은 이름 청크 5개 · 117 KB 를 다시 받음) — 규칙 7(assetPrefix zone 간 유일)과 한 origin 라우팅(`ADR-008` · `OPS-001`)을 함께 바꿔야 닫힌다
