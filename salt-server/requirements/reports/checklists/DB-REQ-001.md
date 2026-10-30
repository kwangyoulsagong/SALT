# DB-REQ-001 checklists

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: FR-20~23 `InviteCode` 는 **구현됨**(`20260918071852_add_invite_code`) — 모양이 다르다: `issuedBy` 대신 / Q2 는 2026-10-07 닫힘(`DB-REQ-033`) — enum 은 `crypto · stock · kr_stock`, `stock` 은 미국 주식 의미로 / 서버 정리 선행은 `SRV-REQ-006` 이 아니라 `SRV-REQ-007`("M4 전 배포")

## 2026-10-30 — F000 종목 검색 · 추적 자산 상한 (파일만 걸침)

- 짝 영역 변경 없음 — FR-51(추적 상한은 DB 제약이 아니다) 대로 서비스 설정값 `TRACKED_ASSET_LIMIT` 로 구현(`SRV-REQ-008` FR-81). 스키마 무변경
- 확인: 마이그레이션 0건

미검증: 없음 — 판단 무변경

## 2026-10-30 — F000 레거시 모델 drop · 중복 워커 정정 (루트 `F000-legacy-cleanup`)

- FR-1~3 충족 — 모델 2 · enum 2 · 관계 필드 2 제거. `\dt` · `pg_type` 0 확인. 수용 기준 첫 칸 체크
