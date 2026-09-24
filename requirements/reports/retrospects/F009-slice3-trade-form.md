# F009 슬라이스 3 — 거래 기록 폼 — 회고

영역 회고: `bff/requirements/reports/retrospects/BFF-REQ-038.md` · `salt-microFe/requirements/reports/retrospects/FE-REQ-039.md`

- 서버 슬라이스 1 이 계약을 끝까지(원 반올림 · 비율 소수 · 사유 코드) 정해 둔 덕에 BFF 는 모양 검사, 프론트는 표시만 했다. 금액 계산 0건
- 브라우저에서 처음 보고 고친 것 넷: 접힘 `hidden` 이 안 먹음 · 전역 글꼴 없음 · 옅은 면 위 대비 · 리포트가 없으면 게이지도 사라지는 격리 실수. 넷 다 빌드 · 타입으로 안 잡힌다
- dev 서버가 도는 중에 빌드해 사용자 dev 를 깨뜨렸다 — 승인 받고 재시작으로 복구

## Action

- 슬라이스 4 착수 전에 사용자 결정 둘: 전역 `body` 글꼴 · 거래 + 계획을 서버 한 트랜잭션으로 옮길지
