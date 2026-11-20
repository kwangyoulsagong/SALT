# 휴대폰 PWA 전용 zone(`/m/*`) 리서치 — 2026-11-20

근거 결정 `ADR-012`. 두 갈래(플랫폼 제약 · 아키텍처)를 공식 문서 위주로 조사했다. 출처를 찾지 못한 것은 **미확인**.

## 1. 플랫폼 제약

| 항목 | 사실 | 출처 |
|---|---|---|
| iOS 웹 푸시 | 16.4+ · **홈 화면에 설치한 웹앱에서만** · 권한 요청은 사용자 누름 안에서만 | webkit.org/blog/13878 (2023-02-16) |
| 조용한 푸시 | 없음 — 푸시마다 알림을 바로 띄우지 않으면 Safari 가 권한을 거둔다 | developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers |
| Declarative Web Push | iOS 18.4+ 홈 화면 웹앱 — JSON `web_push: 8030` · `notification.navigate` 필수 · 서비스 워커 없이 표시, 있으면 고칠 수 있음 · 같은 JSON 을 SW 가 처리하면 하위 호환 | webkit.org/blog/16535 (2025-03-27) |
| 설치 | `beforeinstallprompt` 없음(공유 → 홈 화면에 추가). iOS 26 부터 홈 화면에 추가한 사이트는 기본 웹앱으로 열림 | webkit.org/blog/17333 (2025-09-15) |
| 저장소 | 홈 화면 웹앱은 7일 삭제 예외(따로 센다) · **Safari 와 설치 앱은 저장소를 나눈다 → 설치 앱 안에서 다시 로그인** · `persist()` 보장 없음 | webkit.org/blog/10218 · 14403 · firt.dev/notes/pwa-ios (2026-10-13) |
| iOS display | `standalone` · `browser` 만 · `display_override` · `orientation` · `shortcuts` · `background_color` 무시 · 범위 밖 링크는 앱 안 브라우저 | firt.dev |
| 상태바 · 스플래시 | `theme-color` · `apple-touch-icon`(매니페스트 아이콘보다 우선) · 스플래시는 `apple-touch-startup-image` + `apple-mobile-web-app-capable` | firt.dev |
| Android 설치 | 이름 · 192/512 아이콘 · `start_url` · standalone · 자동 프롬프트에는 SW fetch 핸들러 | web.dev/articles/install-criteria |
| 배지 | iOS 설치 앱만 · Android 는 OS 가 점 | developer.chrome.com/docs/capabilities/web-apis/badging-api |
| 매니페스트 범위 | **`scope: "/m/"` 끝 슬래시** — 접두 일치라 `/m` 이면 `/mx…` 도 범위 · `id` 고정(바꾸면 다른 앱) | MDN manifest scope · web.dev |
| SW 범위 | `/m/sw.js` + `scope: '/m/'` 이면 `Service-Worker-Allowed` 불필요 · 루트 범위 SW 금지(데스크톱 장악) · sw.js 는 `no-cache` + `updateViaCache: 'none'` | MDN register · nextjs.org/docs/app/guides/progressive-web-apps (2026-07-30) |
| 캐시 | Cache API 는 `Cache-Control` 을 따르지 않고 만료 없음 — 지우는 것은 코드 몫 · `Clear-Site-Data: "storage"` 는 출처 전체(데스크톱까지) | MDN Cache · Clear-Site-Data |
| 웹 푸시 서버 | VAPID · `aes128gcm` · `TTL` 필수 · 4KB · 404/410 이면 구독 삭제 · `pushsubscriptionchange` 에 기대지 않고 앱이 열릴 때 대조 | Apple 문서 · web.dev/articles/sending-messages-with-web-push-libraries · github.com/web-push-libs/web-push |

미확인: EU DMA 2025~2026 · WebAPK 갱신 규칙 · JVM 웹 푸시 라이브러리 버전 · iOS 26 `openWindow` 딥링크(WebKit 263687 — 2025-12 재현 안 됨 코멘트).

## 2. 아키텍처

| 주제 | 사실 | 출처 |
|---|---|---|
| 분리 URL | Google 은 반응형 권장 · 분리 URL 은 데스크톱 canonical + `rel=alternate media` 쌍 · Wikimedia 가 2025-10 `m.` 도메인을 접음(리다이렉트 지연 · 링크 그래프 충돌 · 공유 링크에 갇힘) | developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing · mediawiki.org RFC Mobile domain sunsetting 2025 |
| → SALT | 로그인 화면은 `noindex` 라 분리 URL 의 SEO 비용 ≈ 0 · **공개 `/tips` 는 `/m` 에 두지 않는다**(반응형 한 URL) | — |
| 판별 | `Sec-CH-UA-Mobile`(Chromium) → 없으면 UA `Mobile`/`iPhone` · 태블릿은 데스크톱 · 문서 이동(`Sec-Fetch-Mode: navigate` GET)만 · `Vary` + `private` · 한 방향(데스크톱 → `/m`) · `view=desktop` 쿠키로 사용자 선택 존중(Wikimedia `useformat`) | MDN Sec-CH-UA-Mobile · nextjs.org userAgent |
| 구조 | 안 A(도메인 패키지가 `mobile` 진입점 · zone 은 조립) 추천 — 같은 zone 안 이동은 soft nav · 도메인 소유 유지. 도메인별 모바일 zone(안 C)은 탭마다 문서 이동 · SW 주인 애매 | nextjs.org/docs/app/guides/multi-zones (2026-11-18) · samnewman.io/patterns/architectural/bff |
| basePath | `basePath: '/m'` → L7 규칙 `/m/*` 하나 · `next/image` src 는 수동 · `/m/_next` 와 운영 공용 `/_next`(ADR-005 규칙 7) 관계는 **실측 필요** | nextjs.org basePath · vercel.com/docs/microfrontends/path-routing |
| SW 도구 | `@serwist/next`(webpack — 레포는 vanilla-extract webpack 플러그인) 또는 손으로 쓴 SW | serwist.pages.dev |
| RSC 캐시 함정 | 앱 라우트 `Vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch` · `ignoreVary` 쓰면 HTML/flight 뒤바뀜 → HTML · RSC · API 는 NetworkOnly | Next 커밋(검색 경유) |
| UX | `100dvh` · `env(safe-area-inset-bottom)` + `viewport-fit=cover` · 입력 16px 이상(확대 금지 메타 쓰지 않음) · `overscroll-behavior-y: none`(iOS PTR 은 남을 수 있음 — WebKit 275947) · 전환은 Next 15 에서 실험 플래그 없이 | web.dev/blog/viewport-units · developer.chrome.com/blog/overscroll-behavior |
