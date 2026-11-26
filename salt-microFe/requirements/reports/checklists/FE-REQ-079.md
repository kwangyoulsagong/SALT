# FE-REQ-079 체크리스트 — 해설 지난 날 보기

| FR | 결과 | 근거 |
|---|---|---|
| FR-1 날짜 이동 | 충족 | `features/browse-explanation-days/ui/ExplanationDays.tsx` · Playwright: 오늘 → 11/19 → 11/17 · 다음 막힘(오늘) · 모드 바뀌면 `key={mode}` 로 오늘 |
| FR-2 지난 날 머리 · 칩 · 원문 | 충족 | 실서버 스크린샷 `scratchpad/shots/desktop1280-real-past1.png` · `mobile390-real-past1.png` — "11/19(목) 11:35에 쓴 해설이에요 · 그 뒤 소식은 담지 않았어요" · "그날 판단 장기 · 관망 / 그날 종가 +1.13% / 그 뒤 지금까지 −13.00%" |
| FR-3 지난 날 동안 스트림 0 | 충족 | Playwright `/explain/stream` 요청 수 — 지난 날 보는 동안 0 |
| FR-4 빈 · 실패 | 충족 | `route` 빈 목록 → "아직 지난 날 해설이 없어요" · 502 → "지난 해설을 불러오지 못했어요"(재시도 1회 = 요청 2) · 오늘 해설 그대로 |
| FR-5 휴대폰 · 접근성 | 충족 | 390 iPhone UA — 버튼 44×44 · 넘침 0 · `aria-live` 날짜 · `aria-label` 갈 날짜 |
| FR-6 움직임 보일 때 · 머리 그림 | 충족 | 실서버 · 1280 · 390: 상자 밖 0 → 스크롤 100ms 0.94/0/0(차례) → 1.2초 전부 1 · 지난 날 다시 재생(100ms 0.85/0/0/0 → 1.2초 1) · 오늘 복귀 1.65초 전부 1 · 화면 안 도착 깜빡임 0 · 줄인 모션 이동 `none` · 0.8초 안 전부 1 · 그림 48×38 `aria-hidden` · 오류 0 · 넘침 0. 스크린샷 `scratchpad/shots/{desktop1280,mobile390}-motion-{100ms,1200ms,past}.png` · 결과 `scratchpad/motion.json` · 서버 HTML: 패널은 클라이언트 조회라 JS 끈 화면에 상자 자체가 없다(가려진 문장 `opacity:0` 인라인 0) |
| FR-7 서버 값만 | 충족 | 등락 · 판정은 응답 값 · `formatDay.test.ts`(요일 · 부호 · 0) |
| 명령 | 통과 | `pnpm check-types`(14) · `pnpm lint`(14) · `pnpm test`(전 패키지 통과 + domain-invest 3) · `pnpm test:layer-check`(차단 22 · 통과 15) · `pnpm --filter @repo/ui build-storybook` · `web-investment` · `web-mobile` 운영 빌드(FR-6 뒤 `/investments/[symbol]` 7.29 kB · 160 kB · `/m/investments/[symbol]` 7.84 kB · 174 kB — 전과 첫 로드 같음) · `ops/salt.sh web prod web-investment web-mobile` 재기동 |
| 임시 사용자 | 지움 | 초대 코드 1장 → 실로그인 → 확인 뒤 `DELETE /api/app/me`(지운 행 0 · identity 계정 0) — 1회차(`route`) · 2회차(실서버) 둘 다 |
| 실서버 실화면(2026-11-26 2회차) | 충족 | `route` 없이 서버 `SRV-REQ-063` → BFF → 화면. 데스크톱 1280 · 휴대폰 390(iPhone UA) 둘 다 — 지난 날 응답 200 · 1회 · 첫 날 11-19(장기 · 관망 · 그날 종가 +1.13% · 그 뒤 지금까지 −13.00% · 문장 4) · 이전 → 11/19(목) → 11/17(화) · 오늘 복귀 · 다음 막힘 · 지난 날 동안 스트림 0 · 페이지 오류 0 · 넘침 0 · 휴대폰 버튼 44×44. 스크린샷 `scratchpad/shots/{desktop1280,mobile390}-real-{today,past1}.png` · 결과 `scratchpad/shots-real.json`. 1회차 `route` 픽스처의 11-17 일봉 날짜가 하루 어긋나 있었다(그날 +2.31% → 서버 실값 −3.30%) — 화면 코드와 무관, 픽스처 쪽 실수 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 패널 지연 청크 크기 | 경로 표는 첫 로드만 — `m` · `Illustration` 이 실린 패널 청크(동적 import)는 재지 않았다 | 다음 투자 zone 번들 점검(`performance-frontend.md` §7) 때 `.next` 청크 비교 |
| 실기기 손가락 누름 | Playwright 는 `:active` 를 흉내만(`mobile-motion.md` §5) | 사용자 휴대폰 확인 |
