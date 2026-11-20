# FE-REQ-071 회고

## 2026-11-20

- **배럴에 올릴 뻔했다** — 공용 로그인 폼 · 휴대폰 틀을 `@repo/web-shared/layout` 배럴에 넣으면 그 배럴을 읽는 데스크톱 zone 다섯 레이아웃에 클라이언트 모듈이 딸려 간다(팁 글 +34 kB 와 같은 원인). 입구를 따로 열고 레이어 규칙 목록(`WEB_SHARED_DIRECT_ENTRIES`)에 넣었다
- **잠금 파일의 peer 변형** — 새 zone 의 `next` 가 다른 zone 과 다른 peer 조합(`@opentelemetry/api` 없음)으로 풀려 webpack 이 두 벌 → `mini-css-extract-plugin` 직렬화기 중복으로 빌드 실패. 새 zone 앱을 더할 때 `readlink apps/<새>/node_modules/next` 가 다른 zone 과 같은지 본다
- vanilla-extract `selectors` 는 자식 선택자를 못 받는다(`& input`) — `globalStyle` 로
- 리다이렉트 기본값이 307 — 스펙(302)과 달라 실측에서 잡았다. 표 시험은 판정만 보고 상태 코드는 안 봤다
- Action: `FE-REQ-072` 에서 도메인 패키지 `src/mobile` 을 만들 때 `no-cross-zone-link` 의 `appOf` 가 그 파일을 휴대폰 zone 앱으로 보게 고친다(지금은 도메인 zone 앱으로 판정)
