# FE-REQ-053 — 투자 zone 분리 — 체크리스트

스펙: `salt-microFe/requirements/specs/done/FE-REQ-053-ARCH-INVESTMENT-ZONE.md` · 2026-11-02
브랜치: `feat/fe-req-053-invest-zone-home-cards` (base `main` `166b6f49`) · 루트 슬라이스 `requirements/specs/done/MONEY-F1-invest-zone-home-cards-slice.md`

## 1. FR ↔ 구현

| FR | 구현 | 상태 |
|---|---|---|
| FR-1 | `20971abf` shared → `packages/web-shared` · `d8692621`(이름은 `7dbb0c56` 에서 `layout`) zone 공용 레이아웃 · `b00b0cea` 슬라이스 25개 → `packages/domain-invest`(369 R100) · `layer-rules.cjs` 패키지 안 레이어(`domain-*` entities~pages, `web-shared` = shared) · zone lint 가 `packages/domain-*` 를 그 zone 앱으로 | ✅ |
| FR-2 | `apps/web-investment/app/{investments,investments/[symbol],coach/report,coach/signals/[signalType],coach/settings,search}` · `not-found` · `investments/sitemap.ts`. 셸 라우트 삭제 + `invest.hostedIn` 한 커밋 | ✅ |
| FR-3 | 홈 투자 블록 → BFF 카드(`417076d8`) | ✅ |
| FR-4 | zone 안 이동 soft — FEATURE-006 이력 | ✅(문서) |
| FR-5 | WS 실시간 표 · 해설 SSE(투자 zone 페이지에서 스트림 직접 열어 main 과 같은 이벤트) | ✅ |
| FR-6 | 이동 실측(아래 §2) | ✅ |
| FR-7 | 주인 REQ 40곳 기록(루트 체크리스트 §3) | ✅ |

## 2. 검증 (실행한 것만)

| 확인 | 결과 |
|---|---|
| 모노레포 `check-types` · `lint` · `test` | 10/10 · 10/10 · core 62 · ui 43 |
| `pnpm --filter "./apps/web*" build` | 5/5 |
| `test:layer-check` | 차단 16(+4 패키지 안 레이어) · 통과 10 |
| 훅 사후 실행 | 바뀐 프론트 TS 502 · 서버 3 — 막힘 0 |
| 번들(main 워크트리 빌드 대조, First Load) | 셸 공용 105→103 · `/home` 178→169 · `/` 149→146 · 투자 zone `/investments` 154→159(최종 — 타일 수정 포함) · `/coach/*` 131→135 · 상세 138 같음 · 검색 156→157 |
| DOM 구조 대조(main 3100 vs 3000, 숫자 지움) | 상세 · 리포트 · 검색 · 404 차이 0 · `/investments` 는 시세 타일 수정분뿐 |
| 실화면(임시 사용자) | 홈 카드 → `/investments`(`data-zone=invest`) · `/settings` → `/coach/settings` · 잘못된 종목 404 · 7화면 × 1024~1600 가로 넘침 0 · 페이지 오류 0 |
| FR-6 이동(dev · 셸 프록시 · 5회 중앙) | Chromium 홈→투자 455 · 투자→홈 476ms / WebKit 447 · 562ms · 로드 시점 숫자 5/5 |

## 3. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 운영 빌드 · 한 origin 라우팅에서 이동 시간 | 배포 환경 없음 — 위 값은 dev 서버 | `OPS-001` · `FE-REQ-054` FR-6 |
| prerender · 문서 간 전환 | 별도 REQ | `FE-REQ-054` |
| 해설 화면 버튼으로 시작 | 모든 종목 · 관점의 코치 게이트가 닫혀 있다(표본 부족, 서버 판정) — 스트림 연결은 직접 확인 | 게이트가 열리는 날(서버 채점) |

## 2026-11-03 — MONEY-F2(`FE-REQ-054`) 앱 내비게이션

- zone 공용 레이아웃(`@repo/web-shared/layout`)이 앱 내비게이션 · prerender 규칙 · 문서 간 전환 · 이동 계측을 갖는다(`e0bce695`). 프로필 메뉴는 화면별이 아니라 머리 한 자리(`<header>` → `<div>`, 메뉴 정렬 끝). 투자 zone `next.config.js` 는 프리셋(`7b8b1110`). 이 REQ 머리 블록의 "`FE-REQ-054` 전까지 그 레이아웃이 임시로 맡는다"가 닫혔다
- 확인: 모노레포 check-types · lint · test · zone 5 빌드 · layer-check · 훅 사후 실행 · Storybook · 실화면(5화면 × 5폭 · 앱 웹뷰 · WebKit) — `salt-microFe/requirements/reports/checklists/FE-REQ-054.md` §2

## 2026-11-03 — MONEY-F2(`FE-REQ-054`) 커밋 대조

- 커밋 대조 — `ops/salt.sh` 머리 주석(이 REQ 의 zone 별 dev 서버 줄 아래 운영 빌드 주의 두 줄, `9ef6dc92`). 주인은 `OPS-002`, 동작 무변경

- 2026-11-03 MONEY-S1b `cdeb5f7c` — web-shared 패키지(이 REQ 가 만든)의 lib 에 `readAmountInput` · `useAmountInputGuard` · `labelOr` 추가. web-shared check-types · zone 5 빌드 · 모노레포 lint


## 2026-11-05 — FE-REQ-013 FR-80 2단계 확인 단계(주석 정정)

- FE-REQ-013 FR-80 2단계 확인 단계: 이 REQ 가 주인인 화면 파일의 낡은 이유 주석("토큰이 `localStorage` 라 클라이언트")에 정정 문장(`95829941`, 주석만 · 동작 0). 서버 조회 이관은 `FE-REQ-013` FR-81(국내 주식은 약관상 대상 아님). 루트 `requirements/specs/done/F000-cookie-session-slice.md`
- 확인: lint · check-types(web · domain-invest) · 훅 사후 실행 · 실화면(해당 화면 200 · 401 미해결 0 · 수화 오류 0)

## 2026-11-05 — 금융 팁 S2a(`MONEY-S2a-tips-content`)

- 몫: 공용 레이아웃에 `PublicShell`(공개 zone 껍데기 — 로고 머리 + main, 앱 내비 · 안내 · prerender 없음) export 추가
- 검증: 슬라이스 검증 그대로(`requirements/reports/checklists/MONEY-S2a-tips-content.md`) — 이 REQ 의 수용 기준은 바뀌지 않았다
- 미검증: 없음(이 몫 안)

## 2026-11-06 — 서버 S2c notification(`MONEY-S2c-notification`) · `9cee4715` · `33e949e8` · `2fa68f61` · `f1a3c64c`

- 패널 한 줄 · 머리 주석 정정
- 검증: check-types · lint · 실화면
- 미검증: 없음(이 몫 안)

## 2026-11-06 — 서버 S3a identity 셸 설정(`MONEY-S3a-identity-shell`)

- 투자 카드 href 값 그대로 `/investments`

## 2026-11-10 — 투자 머리 메뉴 · 레일 복원 · 포트폴리오(주인 `FE-REQ-069`)

- 확인은 `FE-REQ-069` 체크리스트(실화면 24칸 · 넘침 0 · axe 0 · 운영 빌드 · zone 전환 9/10)
