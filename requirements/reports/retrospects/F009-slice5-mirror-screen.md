# F009 슬라이스 5 — 내 거래 미러 화면 — 회고

영역 회고: `salt-server/requirements/reports/retrospects/SRV-REQ-038.md` · `bff/requirements/reports/retrospects/BFF-REQ-038.md` · `salt-microFe/requirements/reports/retrospects/FE-REQ-039.md` §슬라이스 5

- 착수 전 미결정 셋(서버 포함 · 알림 끄는 시점 · 추격 저장)을 먼저 물었다. 슬라이스 4 회고가 남긴 Action 이 그대로 질문이 됐다
- "알림 끄기"를 워커 한 줄로 봤다면 추천 점수의 행동 감점이 조용히 0 이 됐다. 저장 행의 소비처를 grep 으로 다 찾고 옮긴 뒤 쓰기를 지웠다
- 계약 파일을 먼저 쓰고 BFF 를 병렬로 돌린 것이 이번 속도의 대부분이다
- 화면을 띄워 보고서야 보인 것: "표본 24 · 표본 부족" 모순. 타입 · 테스트로는 안 잡힌다

## Action

- 로그인 QA 에서 size-check p95 를 잰다
- 슬라이스 6 월간 복기는 미러 응답에 요약 필드를 더해 같은 조회로 그린다
- `@repo/ui` 대비 정리(`panelDescription` · `SegmentedControl`)를 REQ 로 올린다
