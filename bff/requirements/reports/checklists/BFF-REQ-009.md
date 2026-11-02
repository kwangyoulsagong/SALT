# BFF-REQ-009 checklists

## 2026-10-29 REQ 전수 조사

- FR-20 · 21 정정(BFF 가 422) · to-do → in-progress

## 2026-10-30 — F000 종목 검색 · 추적 자산 상한 (파일만 걸침)

- 호출 맵 `searchAssets` 구현 — 400ms · 재시도 1회 · FR-4 409 전달 · FR-50 검색 1회(overview 를 거르지 않는다)
- 확인: 실측 11~27ms

미검증: 없음 — 판단 무변경

## 2026-10-30 — F000 레거시 모델 drop · 중복 워커 정정 (루트 `F000-legacy-cleanup`)

- FR-33 정정 — 같은 전제. BFF 코드 무변경

## 2026-11-02 — 시세 워커 상시화 (`OPS-002`)

- `bff/ops/run.sh worker` 25초 실행: 업비트 연결 · 299종목 구독. 10:07 launchd 등록 뒤 `ops/salt.sh status` 코인 시세 ok 0분 전
- REST 4001 · WS 4002 도 launchd(수동 tsx watch 6473 · 6474 교체) · 헬스 200

미검증: 재부팅 뒤 자동 기동.
## 2026-11-02 — 재시작 고아 정리 (`OPS-002` FR-6)

- `ops/salt.sh restart` 0~1초 · 재시작 뒤 node 1개(고아 0) · `zsh -n` 통과

미검증: 없음.

## 2026-11-02 — MONEY-F1(`FE-REQ-053`) 투자 zone 분리 · 홈 카드

- MONEY-F1(`FE-REQ-053`) 에서 이 REQ 가 걸렸다 — shared 레이어 → `@repo/web-shared`(import 경로 치환)(`20971abf`). 파일 1개(경로 이동 내용 무변경 0 · 수정 1 · 추가 0 · 삭제 0). 계약 · 동작 무변경
- 확인: 모노레포 check-types · lint · test · zone 5 빌드 · layer-check · 훅 사후 실행(바뀐 TS 전부) · 실화면 — `salt-microFe/requirements/reports/checklists/FE-REQ-053.md` §2
