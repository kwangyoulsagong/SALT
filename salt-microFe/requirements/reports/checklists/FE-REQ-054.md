# FE-REQ-054 — F2 앱 내비게이션(AppNavigation) · zone 이동 완화 — 체크리스트

스펙: `salt-microFe/requirements/specs/done/FE-REQ-054-F015-APP-NAVIGATION.md` · 2026-11-03
브랜치: `feat/fe-req-054-app-navigation` (base `main` `b822df43`) · 루트 슬라이스 `requirements/specs/done/MONEY-F2-app-navigation-slice.md`
커밋: `1c4c3ee9` · `5a86dafa` · `e0bce695` · `7b8b1110` · `4c234835` · `f6587a53`(기존 결함) · `423e3e9e`(저축 아이콘 동전) · `168b0c65`(계측 결함)

## 1. FR ↔ 구현

| FR | 구현 | 상태 |
|---|---|---|
| FR-1 탭 4 · 레일 | `@repo/ui/app-navigation` `AppNavigation`(레일 72 · 1024+ / 하단 탭 56 · 768~1023 / 머리 52) · `AppNavigationIcon`(면 채운 단색 글리프 4) · 탭 한 벌 `@repo/core/navigation` `APP_TABS`(순서 · 이름 · 아이콘 이름 · zone · 첫 화면 · `readyBy`). 저축 · 가계부 비활성(`FE-REQ-056` · `057`) | ✅ |
| FR-2 링크 · 판정 | `ZoneNavigation` — `activeAppTab`(레지스트리 zone) · `isCrossZonePath(href, ZONE_APP)` → `<a>` / `next/link` | ✅ |
| FR-3 prerender | `prerenderRules.ts` 문서 규칙(`[data-prerender-tab]:not([aria-current])`, `moderate`) · `SpeculationRules` 마운트 뒤 · 표지 쿠키 있을 때만 · 미지원이면 아무것도 안 함 | ✅ 적중 10/10 |
| FR-4 문서 간 전환 | `VIEW_TRANSITION_CSS`(`@view-transition` + 줄인 모션 끔) — 셸 · 투자 zone `<head>`. 레일 · 하단 탭 · 머리 `view-transition-name` | ✅ |
| FR-5 공용 프리셋 · 같은 URL | `packages/config-next` `zoneNextConfig` — zone 5 `next.config.js` · 운영 빌드 공용 `/_next` · `scripts/merge-zone-static.mjs`(`pnpm static:merge`) | ✅ 캐시 공유 |
| FR-6 계측 | `@repo/core/navigation` `buildZoneNavigationMetric`(테스트) · `zoneNavigationMetrics.ts` `performance.mark("salt:zone-nav")` — prerender 도착은 활성화 뒤 읽기(`168b0c65`) | ✅ (수집처 없음) |
| FR-7 도메인 색 | `tokens.colors.domain` 5 — 추가 11 · 삭제 0. 탭에는 쓰지 않는다(정정) | ✅ |

## 2. 검증 (실행한 것만, 최종 HEAD `f6587a53`)

| 확인 | 결과 |
|---|---|
| `pnpm check-types` · `pnpm lint` | 10/10 · 10/10 |
| `pnpm test` | `@repo/core` 81(새 `navigation.test.ts` 19) · `@repo/ui` 43 |
| `pnpm test:layer-check` | 차단 16 · 통과 10 |
| 훅 사후 실행 | `git diff main` 코드 파일 37 전부 exit 0 |
| zone 5 빌드 | 5/5. 빈 zone 86 kB 그대로 |
| `build-storybook` | 성공(`AppNavigation` 5 스토리 — 경고는 기존 `"use client"` 지시어) |
| 번들 — Next 표(main 워크트리 대조) | 셸 공용 103 · 투자 공용 104 그대로 · `/home` 169 → 158 · `/investments` 159 → 139 · 나머지 같음 |
| 번들 — **HTML 이 싣는 JS gzip**(main 대조) | `/home` +9.2 · `/settings` +2.6 · `/onboarding` +2.5 · `/investments` +3.4 · `/coach/report` +2.5 · `/search` +3.5 KB — 예산 40 안. Next 표가 준 것은 레이아웃 몫을 화면 표에서 빼고 세서다 |
| 공용 청크 | 셸 · 투자가 같은 해시 청크 9개(gzip 196 KB). URL 은 `/_next/…` · `/investment-static/_next/…` 로 다르다 |
| 실화면 배치(Chromium, 5화면 × 800 · 1024 · 1280 · 1440 · 1600) | 넘침 0/25 · 레일 72 / 하단 탭 / 머리 52 전환 · 지금 탭(홈 · 투자 · 설정 = 없음) · 프로필 머리 한 자리 |
| 앱 웹뷰(390, UA `SALTApp/`) | 레일 · 하단 탭 · 머리 모두 숨김 · 넘침 0 |
| 문서 간 전환 | `pagereveal.viewTransition` 있음 3/3 · 줄인 모션 0/3 |
| prerender 원인 가르기 | Playwright · CDP 세션이 붙은 채 시작된 prerender 는 `PrerenderingDisabledByDevTools`. 대조 정적 페이지: 붙기 전 시작한 즉시 규칙은 적중 · 붙은 뒤 moderate 는 0 → **우리 코드 문제 아님**. 재는 법: 순수 CDP 로 포인터 올림 → 세션 끊기 → 3초 → 다시 붙어 누름 |
| prerender 적중(운영 빌드 `next start` 두 zone) | 셸 → 투자 5/5 · 투자 → 셸 5/5. 누름 → 보임 중앙 0 · 1 ms. 미적중(바로 누름) 0/10 · 중앙 101 · 145 ms. 계측 10/10 `prerendered: true` |
| **결함(이번 변경)** | 수정 전 적중 4/4 인데 계측 0/4 — prerender 문서가 누르기 전에 마운트돼 표지가 없었다. `168b0c65` 뒤 10/10 |
| 전환 녹화(screencast, 1440) | prerender · 일반 · 되돌아가기 3경로 354프레임 — 레일 진한 픽셀 359~443(빈 프레임 0) · 머리 1079 이상 · 화면 밝기 245~250.6(흰 번쩍임 0) |
| 공용 청크 재다운로드(캐시 비운 뒤 셸 → 투자) | 전: 같은 이름 청크 5개 · 117 KB 를 `/investment-static/…` 에서 다시 받음 → **후(`5c7218e9`): 같은 5개가 `/_next/static/…` 캐시 · 네트워크 0 · 0 B** |
| 공용 정적 경로 회귀(운영 빌드 · 합친 뒤) | 투자 화면 청크 13개 200 · Chromium · WebKit 페이지 오류 0 · `/_next` 404 0 · 탭 눌러 바뀜(수화) · prerender 6/6 · 합치기 5 zone 324 파일 · 같은 내용 159 · 충돌 0 · dev 는 `/investment-static` 그대로 |
| WebKit(Safari 엔진, 800 · 1280 왕복 4) | 일반 이동 · 페이지 오류 0 · 넘침 0 · 규칙 안 붙음 · 계측 `browser: "safari"` |
| 이동 계측(dev, 임시 사용자) | Chromium 185~945 ms · WebKit 111~385 ms(dev 서버 · 한 번씩 — 판정용 아님) |
| 기준 레일 실측(1440, 계산 스타일) | 칸 42×58 · 판 32 · 모서리 8 · 아이콘 16 · 미선택 `#B0B8C1` · 선택 판 `rgba(7,25,76,.04)` + 0.75px 안쪽 선 · 라벨 12/500 `rgba(18,31,51,.47)` → 레일에 반영(`4c234835`) |
| 기존 결함(로그인 화면 비침) | 재현 · 수정 · 재확인 — `FE-REQ-011` 체크리스트 |
| 임시 사용자 | 2회 생성 · 삭제 — 계정 5 → 6 → 5, 초대 코드 · 시도 기록 남은 행 0 |

## 3. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 배포 정적 저장소 | 로컬은 합치기로 닫았다. 배포 저장소 · CI `--check` 는 배포 환경이 없다 | `OPS-001` FR-12 |
| 계측 수집처 | 관측성 배포가 없다 | 배포 환경 확정 시(`OPS-001`) |
| 빈 zone 3 의 내비 · 전환 | 화면이 없다(탭 비활성) | `FE-REQ-056` · `057` · `058` |

## 4. done 판정 (2026-11-03)

- FR-1~7 ✅ · 수용 기준 5/5 · 최종 HEAD 전 영역 재검증(타입 10 · lint 10 · 테스트 124 · 훅 16/10 · 훅 사후 39 · zone 5 빌드 · `static:merge` 충돌 0 · Storybook)
- 넘긴 것: 계측 수집처(`OPS-001` FR-9) · 배포 정적 저장소(`OPS-001` FR-12)

## 2026-11-03 — MONEY-F2(`FE-REQ-054`) 퇴행 수정

- **퇴행 수정** `6ddcb284` — 내비 틀이 768 미만에서도 화면 높이를 잡아 일반 브라우저 390 에서 좁은 화면 안내가 844px 아래(빈 한 화면 뒤)에서 시작했다 → 0. 앱 웹뷰 태블릿(820)의 숨은 하단 탭 여백 56px → 0(일반 820 은 56 유지)
- 확인: 일반 390 · 웹뷰 820 · 일반 820 계산 스타일(안내 top · 여백 · 하단 탭 표시)

## 2026-11-03 — 코드 리뷰 · 퇴행

- 퇴행 `6ddcb284` — 일반 390 안내 top 844 → 0 · 웹뷰 820 하단 여백 56 → 0
- 독립 코드 리뷰(high) 10건 — 9건 수정 `378d8a1c`: ① 로그인 직후(같은 탭 soft 이동) 규칙 미삽입 → 경로마다 다시 확인 ② 탭이 `CrossZoneLink` 를 다시 씀(대기 문구만 끔) ③ 수정키 · 가운데 클릭은 계측 안 함 ④ 계측 단위 = 서비스하는 앱(`fromApp` · `toApp`) ⑤ 공개 화면 `bare` — 틀 유지 · 본문 트리 다시 만들지 않음 ⑥ `@repo/ui` 한글 기본값 제거(`label` 필수) ⑦ 합치기 `--out` 상대 경로 · 빈 값 · dev 산출물 감지 ⑧ 토큰 주석 위치 ⑨ 운영 기동 순서(빌드 → 합치기 → 기동) · `ZONE_STATIC` 빌드 · 기동 같은 값 문서화. **해당 없음 1건**: 숨은 prerender 페이지의 토큰 갱신 경쟁 → 로그아웃 — 리프레시 토큰이 회전하지 않아(`refreshSession.ts`) 동시 갱신이 둘 다 성공한다. 숨은 페이지가 데이터 연결을 미리 여는 것은 prerender 의 목적
- 확인: 배치 25 넘침 0 · 일반/웹뷰 390 · 820 · 로그인 직후 규칙 0 → 1 · Cmd 클릭 표지 0 · 탭 안 대기 문구 0 · 운영 빌드 오류 0 · 404 0 · 수화 · 같은 청크 5 캐시 · prerender 4/4(`fromApp` · `toApp`)
- 번들 최종(`378d8a1c`, main 대조): `/home` 215.0 → 224.3(+9.3) · `/settings` 218.2 → 221.0(+2.8) · `/onboarding` 221.2 → 223.9(+2.7) · `/investments` 193.1 → 196.7(+3.6) · `/coach/report` 189.5 → 192.2(+2.7) · `/search` 205.9 → 209.6(+3.7) KB — 탭이 `CrossZoneLink` 를 쓰며 0.1~0.2 KB

## 2026-11-03 — 브라우저 · 접근성

- 브라우저 · 접근성 마감 `d80a7ac8` — 운영 빌드 Chromium · WebKit · Firefox: 로그인 → 탭 왕복 · 지금 탭 · 넘침 0 · 오류 0. 키보드: 홈 → 투자 → 계정 메뉴 → 본문, 포커스 테두리 2px, '준비 중' 탭 포커스 안 됨. **axe**: 레일 미선택 라벨 2.92:1(실측값 그대로 옮긴 것 — AA 미달) → 회색 700 6.45:1 로 고침. 남은 1건은 기존 `ProfileSection` 이메일 글자 2.18:1(main 에서도 같은 색 — 기존 색 일괄 변경 금지 규칙으로 이번엔 두고 `FE-REQ-047` 머리 재설계 몫). Firefox 는 macOS 기본 설정에서 Tab 이 링크로 가지 않는다(`accessibility.tabfocus=7` 로 확인) · dev 에서는 Next 개발 도구가 포커스를 잡아 운영 빌드로 쟀다

## 2026-11-03 — MONEY-S1a 저축 서비스 첫 판 · 저축 zone 첫 화면

- 이 REQ 에 걸린 몫(`c60f5bfb`): 넘겨받은 몫 셋 닫음 — `APP_TABS` 저축 `readyBy: null` · 저축 zone 레이아웃 `AppShell` + `VIEW_TRANSITION_CSS` · `next.config.js` vanilla-extract. 탭 테스트 갱신
- 확인: Kotlin `./gradlew check` 56(저축 종단 10 · 경계 8 · 플랫폼 14 · 도메인 15 · 커널 9) · bootJar 로컬 운영 DB 기동 · 서버 build · lint · test 936 · test:layer-check · BFF build · test 351 · 모노레포 check-types · lint · test(core 83 · ui 43) · zone 5 운영 빌드 · 훅 사후 실행 · 실스택(BFF 4001 → Kotlin 4010 → 로컬 DB) · 실화면 3화면 × 4폭(1024 · 1280 · 1440 · 1600) 넘침 0 · 콘솔 오류 0 — 루트 `requirements/reports/checklists/MONEY-S1a-savings-calculator.md`

## 2026-11-03 — MONEY-S1a 대조 빈칸(파일에 함께 적힌 REQ)

- `11224e9a` — `APP_TABS` 저축 줄 주석을 "화면이 아직 없다" → "저축 zone 첫 화면 `/goals`"로(동작 무변경)
- 확인: 해당 영역 전체 테스트 · 빌드(루트 `requirements/reports/checklists/MONEY-S1a-savings-calculator.md`)
