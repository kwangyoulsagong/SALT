# F011 슬라이스 3 체크리스트 — 국내 주식 화면 (2026-10-08)

영역 체크리스트가 본문이다: `salt-microFe/requirements/reports/checklists/FE-REQ-041.md` · `bff/requirements/reports/checklists/BFF-REQ-040.md`(슬라이스 3 추가) ·
`salt-server/requirements/reports/checklists/SRV-REQ-040.md`(슬라이스 3 추가) · `salt-server/requirements/reports/checklists/DB-REQ-033.md`(2026-10-08 추가).

| 항목 | 결과 |
|---|---|
| `FE-REQ-041` FR-1~13 | 완료 — Playwright 소유자 · 비소유자 · 비회원 실측(정규장) |
| `BFF-REQ-040` FR-11~13 | 완료 — 테스트 242/242 · 빌드 · 실서버 |
| `SRV-REQ-040` FR-29~31 · `DB-REQ-033` OHLC | 완료 — 테스트 646/646 · 빌드 · 로컬 마이그레이션 · 실서버 |
| 프론트 | check-types · lint · test(core 34 · ui 43) · test:layer-check · 레이어 훅 사후 · `web`(153 → 153 kB · 상세 135 → 136 kB) · `web-tax` 102 kB |
| 공통 수용 기준(§6) | 주문 경로 0 · 금액 계산 0(서버 값 표시) · 추천 · 전망 없음 · 확신 문구 0 · 소유자 전용(비소유자 탭 없음 · 상세 noindex) |
| 계약 | 서버 `assets` 쿼리 3 · 필드 4 · 관심 DTO `kr_stock` / BFF 같은 것 통과 / FE 소비 — 기존 필드 무변경 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| `unavailable` 화면 · 장 마감 뒤 라이브 | 장 마감 · 휴장 · 지연 · 키 없음 · 배지 · 거래정지 상세는 고정 응답으로 확인(`FE-REQ-041` 체크리스트) | 사용자 눈 확인(오늘 15:30 뒤) |
| axe 기존 요소 대비 29 · 21노드 | 필터 · 표 머리 · 등락 색 · 탭 · 상세 머리 — 사용자와 정한 기존 색. 새 장 상태 줄만 고침 | 설계 결정 — 유지 |
| 768 미만 | 웹 좁은 화면은 안내(`FE-REQ-043`) | RN(F007) |
| 체결 → 화면 < 1s 수치 | 갱신 관찰만 | 3b 실측 |
| 글자 로고 잘림 · FMP 사용 조건 | 로고는 붙었다(서버 `logoUrl`, 51/51). FMP 는 가로 글자 로고라 원형에서 잘리고 조건이 불명확 | 사용자 logo.dev 무료 키(`KR_LOGO_DEV_TOKEN`) · 소유자 밖으로 열기 전 |
| 거래 기록 · 보유 유니버스 `kr_stock` | 포트폴리오 평가가 `kr_stock_quotes` 를 안 본다 | 슬라이스 3b |
| 운영 DB 마이그레이션 · `baselineCloses` EXPLAIN | 운영 미접근 · 유니버스 작음 | 배포 시 |
