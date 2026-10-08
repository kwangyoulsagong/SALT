# F011 슬라이스 3b 체크리스트 — 국내 주식 거래 기록 (2026-10-08)

영역 체크리스트가 본문이다: `salt-server/requirements/reports/checklists/SRV-REQ-040.md`(슬라이스 3b 추가) ·
`bff/requirements/reports/checklists/BFF-REQ-040.md`(슬라이스 3b 추가) · `salt-microFe/requirements/reports/checklists/FE-REQ-041.md`(슬라이스 3b 추가).

| 항목 | 결과 |
|---|---|
| `SRV-REQ-040` FR-11 · 33~36 | 완료 — 테스트 676/676 · lint · build · layer-check · 실제 유스케이스 · 로컬 DB 통합 9단계(정리 0건 확인) |
| `BFF-REQ-040` FR-15 · 16 | 완료 — 테스트 249/249 · build |
| `FE-REQ-041` FR-16~18 | 완료 — Playwright(정규장 · 소유자) · check-types · lint · test(core 34 · ui 43) · 레이어 훅 사후 · 워크트리 빌드 `web`(상세 136 → 137 kB) · `web-tax` |
| 공통 수용 기준(§6) | 주문 경로 0(이미 한 거래를 적는다) · 금액 계산 0(평가는 서버 `revalue` · 화면은 표시) · 추천 · 전망 없음 · 확신 문구 0 · 국내 주식은 소유자만(비소유자 404) |
| 계약 | 서버 거래 입력 `assetType`(선택 · 기본 crypto) · `kr/assets?codes=` / BFF 거래 `assetType` · 응답 `assetType` / `@repo/core` 타입 — 기존 호출 · 필드 무변경 |
| 닫은 것 | `SRV-REQ-006` 체크리스트 9-7(DTO 가 `assetType` 을 안 받던 것) |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 실서버 · BFF 경유 기록 1건 · 워커 회차 평가 로그 | 4100 서버 · 4101/4102 BFF 가 이 세션 전 코드로 떠 있고 재시작이 허용되지 않았다. 두 벌을 띄우면 KIS WS 세션이 겹친다 — 유스케이스 직접 호출 · Express 앱 테스트 · 고정 응답 화면으로 나눠 확인 | 다음 재시작 뒤 장중 1건 기록 → 홈 요약 · `kr-quote-poll` 뒤 평가 |
| 사이즈 계산 · 리스크 예산 · 계획 연결 · 행동 미러에 국내 주식 | 코치가 국내 주식을 모른다(FEATURE-011 시나리오 7 후반) | 슬라이스 4 |
| 시세 없는 보유의 "평가 0" 표시 | 밤 기록 직후 최대 1분(채우기 회차 전) · 시세를 못 받는 종목은 평가 0 · 손익률 0 | 화면 "평가 대기" 여부 — 슬라이스 4 와 함께 |
| 거래 목록 · 수정 · 삭제 화면 | 화면이 없다(코인도) — 서버 경로는 자산군을 이미 따른다 | F006 자산 탭 |
| 상태 고정 응답 스크립트 레포 커밋 | 슬라이스 3 Action — 이번에도 scratchpad 에만 | 다음 화면 슬라이스 |
