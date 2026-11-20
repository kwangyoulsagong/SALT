# FE-REQ-071 체크리스트 — 휴대폰 PWA zone 골격

2026-11-20 `feat/fe-req-071-pwa-zone-skeleton` · zone 여섯 운영 빌드(`ZONE_STATIC=per-zone`) · 셸 `127.0.0.1:3100` · 설치 Chrome(Playwright `iPhone 14` · `Pixel 7` 기기) · 임시 계정(초대 코드 → qa071, 끝나고 `DELETE /api/app/me` · 초대 코드 지움 · 행 0 확인).

| FR | 결과 | 근거 |
|---|---|---|
| FR-1 zone · 레지스트리 · rewrites | 충족 | `/m/*` 셸 경유 200(login · home · manifest · sw.js · offline · icons) · `registry.test.ts`(6 zone · `/market` 은 `/m` 아님 · rewrites `/m/:path+` → 3006) |
| FR-2 레이어 규칙 | 충족 | `pnpm test:layer-check` 차단 19 · 통과 14(휴대폰 → `pages` · 배럴 · `src/widgets` 차단, `mobile` 진입점 통과) |
| FR-3 매니페스트 | 충족 | Chrome `Page.getInstallabilityErrors` 일반 프로필 `[]`(시크릿은 `in-incognito` 하나) · 파싱 오류 0 · `/m` 에만 `<link rel=manifest>` · `apple-touch-icon` `/m/icons/…` · `viewport-fit=cover` |
| FR-4 서비스 워커 | 충족 | 범위 `http://…/m/` · 캐시 `salt-m-<판>` = 오프라인 · 아이콘 넷 + 정적 청크만(문서 · RSC · API 0) · 오프라인 문서 이동 → "연결이 끊겼어요" · sw.js `Cache-Control: no-cache` |
| FR-5 틀 | 충족 | 탭 넷 이동 문서 요청 0 · 탭 칸 56 · 입력 17px · zoom 2 가로 넘침 0 · 글자 `appType` 만(결함 주입 `16px` → 시험 실패 확인) |
| FR-6 `/m/login` | 충족 | 휴대폰 실로그인 → `/m/home` · 로그인 상태 `/m/login` → `/m/home`(미들웨어) · 데스크톱 `/` 로그인 → `/home` 그대로 |
| FR-7 이동 | 충족 | iPhone · Android `/` → 302 `/m/login` + `Vary: User-Agent, Sec-CH-UA-Mobile` · `Cache-Control: private, no-store` · 데스크톱 · `cors` · 쿠키 `view=desktop` 은 200 · "데스크톱 화면으로 보기" → 쿠키 → `/m` 다시 오면 지움 · 경계 표 시험 32(`redirect.test.ts` — 태블릿 · RSC · prefetch · prerender · API · POST · 봇 · 정적 · `/m`) · 다섯 zone matcher 글자 같음 시험 |
| FR-8 안내 문구 | 충족 | 순서 0 문구 그대로 |
| 데스크톱 쪽 | 충족 | 데스크톱 `/goals` 매니페스트 링크 0 · SW 등록 0 |
| 명령 | 통과 | `check-types` · `lint` 28/28 · `test`(core 350 · ui 86 · web-shared · 도메인 · 셸) · zone 여섯 운영 빌드 · `brand:icons --check` |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 실기기 iOS Safari 홈 화면 추가 → standalone · Android 설치 | 이 맥에 휴대폰이 없다 — 사용자 휴대폰 | `QA-001` Q-7(사용자) |
| 탭 화면 내용 · 탭 경로 대응표 행 | 화면 옮기기는 순서 2 | `FE-REQ-072` |
| 오프라인 마지막 숫자 · 설치 안내 | 순서 3 | `FE-REQ-073` |
| 운영 공용 `/_next` 합치기(`static:merge`) 실측 | 로컬 상시는 per-zone. 해시 이름이라 규칙 7 그대로 — SW 정규식은 두 꼴 다 받는다 | 배포 `OPS-001` FR-12 |
