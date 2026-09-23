# FE-REQ-013 (F000 PERF) — 회고

## 2026-09-23 — 목 제거 · SEO

- 목 게이트(`mockGate`)가 모든 BFF 호출 앞에 있었다 — 걷자 리포트 · 상세 첫 로드가 21~25 kB 줄었다
- 서버 컴포넌트의 배럴 import 비용을 규칙으로 남겼다(`performance-frontend.md` 번들 절)
- Action: `FE-REQ-013` 의 쿠키 세션이 되면 상세 본문 · 투자 표도 서버 조회로 내려 SEO 와 첫 페인트를 같이 얻는다
