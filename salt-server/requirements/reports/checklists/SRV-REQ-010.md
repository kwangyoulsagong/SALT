# SRV-REQ-010 checklists

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: FR-1 · 20~24 · 31 · 40~42 는 대부분 구현됨 — 컨텍스트 `src/{auth,market,news,notification,portfolio}` / 온보딩은 `auth` 안이 아니라 조합 컨텍스트 `src/onboarding`, `plan` 컨텍스트는 없다(판정은 거래 수 · goal 행) / KIS 절은 Q2 닫힘 뒤 `SRV-REQ-040`(F011) 이 대체 — `KisClient.ts` · `KisRealtimeClient.ts`
