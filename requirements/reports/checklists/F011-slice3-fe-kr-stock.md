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
| 흐린 로고 7종목 | logo.dev 원본이 작다(선명도 0.27~0.44). 서버 판정으로 이니셜 — 도메인 조회(DART)면 일부(LG전자) 선명해지지만 사용자가 하지 않기로 | 사용자가 `DART_API_KEY` 를 넣을 때(코드는 준비됨) |
| 거래 기록 · 보유 유니버스 `kr_stock` | 포트폴리오 평가가 `kr_stock_quotes` 를 안 본다 | 슬라이스 3b |
| 운영 DB 마이그레이션 · `baselineCloses` EXPLAIN | 운영 미접근 · 유니버스 작음 | 배포 시 |

## 추가 — 로고 판정(2026-10-08, `58f0c33`)

| 확인 | 결과 |
|---|---|
| 서버 | build · lint · test 661/661(선명도 3 · PNG 디코더 3 · 판정 4 · 주소 3) · `test:layer-check` |
| 실측 | 부팅 판정 50종목 — 티커 43 · 없음 7. 눈으로 고른 흐린 7종목과 같다 |
| 전 영역 재검증 | FE check-types · lint · test(core 34 · ui 43) · layer-check · 변경 FE 파일 훅 사후 실행 0건 · BFF test 243 · build |
