# DB-REQ-003 checklists

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: M3 실행됨(`20260918071852`) · M1 은 `kr_stock` 만(`20261007140000`) — Q2 관련 수용 기준 · Open Q 는 닫힘 / 서버 정리 선행은 `SRV-REQ-007`

## 2026-10-30 — F004 슬라이스 19 차트 1주 탭

- 파일만 걸침 — 웹 `entities/market/model/messages.ts` · `types.ts` 에 차트 기간 `1w` 이름 · `ChartPeriod.Week`. 스키마 무변경
- 미검증 · 범위 밖: 없음

## 2026-10-30 — F000 레거시 모델 drop · 중복 워커 정정 (루트 `F000-legacy-cleanup`)

- M4 실행 — FR-4 grep 0 · FR-5 스냅샷 + 복원 1회(커밋 메시지). 인덱스 이름 드리프트 2건은 넣지 않음(1 마이그레이션 = 1 목적). to-do → in-progress

## 2026-11-02 — MONEY-F1(`FE-REQ-053`) 투자 zone 분리 · 홈 카드

- MONEY-F1(`FE-REQ-053`) 에서 이 REQ 가 걸렸다 — 투자 화면 `apps/web/src` → `packages/domain-invest/src`(내용 무변경) · 투자 zone 조립(`b00b0cea`). 파일 1개(경로 이동 내용 무변경 1 · 수정 0 · 추가 0 · 삭제 0). 계약 · 동작 무변경
- 확인: 모노레포 check-types · lint · test · zone 5 빌드 · layer-check · 훅 사후 실행(바뀐 TS 전부) · 실화면 — `salt-microFe/requirements/reports/checklists/FE-REQ-053.md` §2

- 2026-11-02 MONEY-F1 후속 — `c5ec66ed` — 이 REQ 를 머리에 적은 프론트 파일(`entities/portfolio/model/messages.ts`)에서 홈 전용 머리 문구 둘을 지웠다(보유 요약을 코치 리포트 "내 보유" 패널로). DB 무변경
