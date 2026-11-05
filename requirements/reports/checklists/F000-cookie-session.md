# 체크리스트 — F000 쿠키 세션 2단계 (`FE-REQ-013` FR-80 · `BFF-REQ-009` FR-54)

브랜치 `feat/fe-req-013-fr80-cookie-session` · 커밋 `fb9c85b3` · `721063fc` · `99efcd15`

## 1. 기계

- [x] check-types 12/12 · lint 12/12 · test(core 171 · ui 44) · BFF test 383 · tsc · build
- [x] zone 빌드 4(web · investment · savings · household) · `@repo/ui` build-storybook · 앱 경로 표에 `/api/session` · `/api/session/refresh`
- [x] 레이어 훅 사후 실행(바뀐 TS 전부) · `check-done.mjs`
- [x] 경계 표 테스트 — `withSessionRefresh` 9 · 쿠키 읽기 8 · 같은 origin 7 · 소켓 origin 3 · 미들웨어 4 · 국내 401 행 둘 · `viewTransitionName` 쌓임(변이 확인)
- [x] 번들 main 워크트리 대조 — 증가 0(`/home` · `/goals` −1 kB)

## 2. 실스택(셸 3001 — 3000 은 사용자 회사 작업, 임시 사용자 셋 · 지움)

- [x] 초대 수락 → 쿠키 셋(액세스 httpOnly · 리프레시 httpOnly 경로 `/api/session` · 표지 읽힘) · 저장소 토큰 0 · 온보딩 상태 200
- [x] `/household` · `/goals` · `/home` — 브라우저 BFF 호출 같은 origin · `Authorization` 0 · 4xx 0 · 가계부 서버 HTML 첫 숫자
- [x] 액세스 만료 → 401 → 갱신 204 1회 → 재시도 200 · 화면 유지
- [x] BFF 다른 사이트 쿠키 401 · 갱신 Route Handler 다른 사이트 403
- [x] 로그아웃 → 쿠키 셋 지움 · 로그인 화면 / 로그인 → 홈 · 쿠키 셋
- [x] 옛 `localStorage` 토큰 → 쿠키 이관 · 저장소 비움
- [x] 리프레시 죽음 → 401 · 쿠키 지움 · 로그인 화면
- [x] 웹소켓 BFF 4경우 · 브라우저 인증 거부 → 갱신 1회 → 새 연결 다시 구독(토큰 0) · 계속 거부 → 연결 2번에서 멈춤
- [x] SSE 해설 스트림 쿠키만으로 rewrites 통과 200
- [x] 브라우저 예외 0 · 임시 사용자 삭제(5 → 8 → 5, 모든 스키마 `user_id` 0건) · 초대 코드 삭제 · 3001 서버 끔 · `WEB_ORIGINS` 원복

## 3. 확인 중 결함

- 앱 머리 계정 메뉴가 홈 카드에 깔려 로그아웃 불가(기존, `5a86dafa` 부터) → `99efcd15` + 테스트 + done-checklist 1절 행

## 미검증

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 긴 SSE 가 rewrites 를 지나며 쪼개져 오는 간격 | 확인한 종목이 "표본 부족"으로 바로 막혀 이벤트 5개 | 표본 있는 종목 해설을 여는 다음 투자 화면 실화면 |
| 운영 경로 라우팅 · `WEB_ORIGINS` 값 | 배포 환경 없음 | `OPS-001` FR-13 |
