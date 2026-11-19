# BFF-REQ-022 retrospects

## 2026-11-19 FR 대조 정리

- PERF REQ 를 기능 REQ 와 같은 PR 에서 닫지 않아 두 달 to-do 로 남았다. Action: 기능 슬라이스의 실측(p95 · 바이트)을 그 기능 PERF REQ 체크리스트에 바로 옮긴다
- 로고용 시세 목록 호출이 weekly BFF 지연의 대부분(서버 2.9ms → BFF 12.8ms)이다 — 예산 안이라 두었다. Action 없음 — 예산을 넘으면 로고를 시세 목록 대신 고정 자산으로
