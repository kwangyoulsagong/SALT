# FE-REQ-043 체크리스트 — 좁은 화면 안내 (2026-09-30)

- REQ: `salt-microFe/requirements/specs/done/FE-REQ-043-NARROW-SCREEN-NOTICE.md`
- 커밋: `f2ae96c`(안내) · `c09ee6c`(카드 눌림 · main) · `60136f9`(앱 기본 버튼) · `206e219`(main 을 AppShell 하나로)

| FR | 위치 | 결과 |
|---|---|---|
| FR-1 CSS 로만 가름 | `app/ui/AppShell.tsx` · `NarrowScreenNotice.css.ts` `NARROW_MAX` | 390 · 360 · 767 × `/` · `/investments` · `/investments/BTC` 9조합: 안내만 보임 · 본문 `display:none` · 안내 밖 보이는 요소 0 · 가로 넘침 0. 768 · 1440: 안내 없음 · 본문 그대로 |
| FR-2 문구 | `shared/i18n` `NARROW_SCREEN_MESSAGES` | "거래" 0 · 휴대폰 그림 없음 |
| FR-3 스크린샷 · lazy | `public/narrow-screen/{investments,detail}.webp`(67 · 40KB, 고정 데이터 1440 × 900) | 좁은 화면에서 두 장 로드. 768 · 1440 에서 **요청 0건**(6조합) |
| FR-4 링크 복사 | `app/ui/CopyPcLinkButton.tsx` | 권한 허용: "링크를 복사했어요" · 클립보드 = 현재 URL. 거부: 실패 안내 |
| FR-5 버튼 대비 | `@repo/ui` `Button` primary(#7949FF) | 흰 글자 4.99:1(AA). 사용자 결정 2026-09-30 — 앱 기본 보라 |

- 레이아웃: 첫 실측에서 부모(높이 = 뷰포트 flex column)에 갇혀 카드가 눌렸다(360×740 125/363px) → `flexShrink: 0`. 재측정 카드 높이 = 내용 높이(382 · 363 · 408) · 잘림 0
- axe(moderate 포함): 좁은 화면 3폭 **0건**(첫 실측의 `landmark-one-main` 은 안내 루트 `<main>` 으로 해소)
- `pnpm check-types` · `pnpm lint` 5/5

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 실기기(iOS Safari · Android Chrome) | 헤드리스 Chromium 만 | `QA-001` 로그인 QA(사용자) |
| 휴대폰에서도 본문이 뒤에서 렌더 · 조회된다 | CSS 로만 가르는 설계의 비용(서버는 폭을 모른다) | RN 앱(`RN-REQ-001`)이 생기면 휴대폰은 앱으로 |
| 실제 로그인 화면 스크린샷 | 고정 데이터로 찍었다 | 사용자가 캡처를 주면 교체 |

## `206e219` 뒤 재측정 (2026-09-30)

- 390×844 `/investments` 안내: 버튼 #7949FF · 흰 글자 4.99:1 · **페이지 전체 axe 0건** · 카드 · 캡처 온전
- 1440 에서 보이는 main 1개(AppShell) · 로그인 `/` 페이지 전체 axe 0건
- 같은 측정이 잡은 **이 변경의 부작용** — 종목 상세 `aside` 가 main 안이 되어 `landmark-complementary-is-top-level` → 오른쪽 열을 div 로. 그리고 기존 critical `aria-valid-attr-value`(`@repo/ui` Tabs 가 패널을 그리지 않을 때도 `aria-controls`) → 패널을 그릴 때만

## FR-6 앱 웹뷰 (`3c46f37`, 2026-09-30)

| 경우(390×844 · `/investments` · `/home`) | `data-embed` | 안내 | 본문 | 로드 중 안내가 보인 프레임 |
|---|---|---|---|---|
| 휴대폰 Safari UA | 없음 | 보임 | 숨김 | 전 프레임(기존과 같음) |
| + ` SALTApp/1.0.0` | `app` | **없음** | 보임 | **0/219 · 0/143** |
| 1440 데스크톱 | 없음 | 없음 | 보임 | 0 |
| + ` NotSALTApp/1` | 없음 | 보임(앱 아님) | 숨김 | — |

- 첫 페인트: `addInitScript` 의 MutationObserver · rAF 로 안내 노드가 들어오는 순간(29~41ms)부터 매 프레임 display 를 기록
- 콘솔: hydration · React 경고 0, pageerror 0 (503 은 막은 백엔드, 404 는 외부 폰트)
- `@repo/core` `isAppWebView` 테스트 2건

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 실제 RN 웹뷰(`react-native-webview`)에서 UA 붙이기 | 앱이 없다 | `RN-REQ-001` (계약을 적어 뒀다) |
| 앱 웹뷰로 띄울 화면의 휴대폰 폭 레이아웃 | 어느 화면을 웹뷰로 쓸지 미정 | 화면이 정해지면 그 화면 REQ |

## 2026-11-02 — MONEY-F1(`FE-REQ-053`) 투자 zone 분리 · 홈 카드

- MONEY-F1(`FE-REQ-053`) 에서 이 REQ 가 걸렸다 — shared 레이어 → `@repo/web-shared`(import 경로 치환)(`20971abf`) · 앱 프레임 · 프로바이더 · 프로필 메뉴를 zone 공용 레이아웃으로(설정 · 로그아웃 이동은 문서 이동)(`d8692621`) · 공용 레이아웃 폴더 이름 `chrome` → `layout`(`7dbb0c56`). 파일 5개(경로 이동 내용 무변경 3 · 수정 2 · 추가 0 · 삭제 0). 계약 · 동작 무변경
- 확인: 모노레포 check-types · lint · test · zone 5 빌드 · layer-check · 훅 사후 실행(바뀐 TS 전부) · 실화면 — `salt-microFe/requirements/reports/checklists/FE-REQ-053.md` §2

## 2026-11-03 — MONEY-F2(`FE-REQ-054`) 앱 내비게이션

- `AppShell` 이 본문을 앱 내비게이션으로 감싼다(`e0bce695`). 768 미만 안내 · main 랜드마크 하나 · 앱 웹뷰 안내 끔은 그대로 — 실측: 앱 웹뷰 390 에서 레일 · 하단 탭 · 머리 모두 숨김, 넘침 0
- 확인: 모노레포 check-types · lint · test · zone 5 빌드 · layer-check · 훅 사후 실행 · Storybook · 실화면(5화면 × 5폭 · 앱 웹뷰 · WebKit) — `salt-microFe/requirements/reports/checklists/FE-REQ-054.md` §2

## 2026-11-03 — MONEY-F2(`FE-REQ-054`) 커밋 대조

- 커밋 대조 — `@repo/ui` `AppNavigation` 스타일이 이 REQ 의 768 경계를 같이 쓴다(768 미만에는 레일 · 하단 탭 · 머리 없음, `5a86dafa` · `4c234835`). 안내 화면 무변경
