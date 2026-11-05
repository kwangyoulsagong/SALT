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

## 4. 확인 단계 2회차 (2026-11-05 — 사용자 "파이프라인 다하고 검증 다하고 버그 검증 다하고 done 누락 없지")

첫 보고 뒤 기준표(`pipeline-completeness`)를 한 줄씩 대조해 빠진 것을 닫았다.

- [x] 낡은 문장 — "토큰이 `localStorage` 라 클라이언트" 이유 주석 13곳 정정(`95829941`) · 셸 미들웨어 "쿠키로 간 뒤" → `FE-REQ-013` FR-82. 국내 주식 둘은 "약관상 클라이언트에 남는다"
- [x] 미뤄 둔 후속을 FR 로 — `FE-REQ-013` FR-81(서버 조회 이관 목록) · FR-82(비공개 경로 보호)
- [x] FEATURE 이력 — `FEATURE-000`(슬라이스 기능) · `FEATURE-015`(머리 메뉴) · 마스터 인덱스 §8
- [x] 주석이 걸친 주인 REQ 8(053 · 055 · 008 · 010 · 026 · 028 · 041 · 056) Changelog · 체크리스트 · 회고
- [x] 실화면 1440(임시 사용자 둘 · 지움): `/home` · `/goals` · `/goals/new` · `/household` · `/household/budget` · `/people` · `/revolving` · `/challenges` · `/templates` · `/investments` · `/search` · `/coach/report` · `/coach/settings` · `/coach/signals/long_term.buy` · `/settings` · `/onboarding` · `/investments/XRP` — 문서 200 · 로그인으로 안 감 · 401 미해결 0 · 5xx 0 · 수화 · 예외 0
- [x] 쓰기 — 관심 종목 추가 201 · 목록에 있음 · 삭제 204(같은 origin POST · DELETE 쿠키)
- [x] 390 앱 웹뷰 UA(`SALTApp/`) — `/home` · `/goals` · `/household` · `/household/people` · `/coach/report` 통과. `/investments` 에서 `/api/app/ai-coach/detail` 504 1건 — BFF 서버 예산 초과(기존, 11-04 로그에도), 직접 · 프록시 다시 재면 둘 다 200 → 범위 밖 표
- [x] 정리 — 사용자 5 → 5 · 모든 스키마 `user_id` 고아 0 · 초대 코드 0 · 3001 끔
- 환경 주의: 확인 중 운영 빌드(`turbo build`)가 떠 있던 zone dev 서버의 `.next` 를 덮어 500(`__webpack_modules__`) — dev 서버 재기동 뒤 통과. 코드 결함 아님
