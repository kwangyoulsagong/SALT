# F011 슬라이스 4 체크리스트 — 국내 주식 코치 (2026-10-08)

영역 체크리스트가 본문이다: `salt-server/requirements/reports/checklists/SRV-REQ-040.md`(슬라이스 4 추가) ·
`bff/requirements/reports/checklists/BFF-REQ-040.md`(슬라이스 4 추가) · `salt-microFe/requirements/reports/checklists/FE-REQ-041.md`(슬라이스 4 추가).

| 항목 | 결과 |
|---|---|
| `SRV-REQ-040` FR-60~66 · 37 · 38 | 완료 — 테스트 706/706 · tsc · lint · build · layer-check · Swagger 생성 96 경로 · 로컬 DB 실측(지표 49 · 49 · 50종목 · 삼성전자 판단 · 비소유자 404 · 토요일 만기 → 금요일 종가 · 코인 성적표 무변경) |
| `BFF-REQ-040` FR-17~19 | 완료 — 테스트 251/251 · tsc · build |
| `FE-REQ-041` FR-19~22 | 완료 — Playwright(실제 빌드 · 소유자 토큰 · 판단 · 성적표 · 리포트 가로챔) · check-types 5/5 · test(core 34 · ui 43) · lint 5/5 · web 빌드 |
| 공통 수용 기준(§6) | 주문 경로 0 · 금액 계산 0(사이즈 · 예산은 서버, 화면은 표시) · 3종 세트 게이트 그대로(국내 주식 표본만으로) · 확신 문구 0(새 문구 7줄 — 상태 · 이유 서술) · 국내 주식 판단은 소유자만 |
| 계약 | **BREAKING(응답)** 코치 상세 `excluded[].reasonCode` `no_realtime_data` 삭제 → `insufficient_history` · `symbol_judgment_only` + `progress`. 추가: 판단 사유 2 · `assetClass` · `history` · 성적표 `assetClass` · env 1. 소비처(BFF · FE) 같은 브랜치에서 짝 |
| 같이 기록한 기존 REQ | `SRV-REQ-025`(상세 `excluded`) · `SRV-REQ-038`(리스크) · `BFF-REQ-038`(계획 400) · `BFF-REQ-039`(성적표) · `FE-REQ-026`(BlockedNotice · 리포트) · `FE-REQ-039`(폼) · `FE-REQ-040`(성적표 · 띠) — 각 Changelog |

## 재시작 뒤 실측 — 닫힘(2026-10-08, 사용자 승인)

4100 · 4101/4102 · 3100 을 새 코드로 재시작: 첫 스냅샷 국내 주식 50건(관망 48 · 피하기 2) · BFF 경유 판단(소유자 장기 · 단타 `mode_not_open` · 비소유자 404) · 리포트 진행 0 / 20 · 크기 계산 국내 주식 수수료 0.115% · 3100 실데이터 상세 1440 · 800(넘침 0 · 오류 0). 세부는 영역 체크리스트 "재시작 뒤 실측"

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 첫 국내 주식 채점 · 표본 20 · 렌더되는 판단 | 장기 30일 · 유니버스 ~51종목을 세 유형이 나눈다 | 재시작 + 30일(첫 채점) · 2~3개월(게이트) |
| 점수 규칙의 국내 주식 타당성 | `mode-decision@2` 는 코인으로 사전등록 · 검증됐다 — 국내 주식은 게이트 뒤에서 채점이 말한다 | 표본 20 뒤 성적표 |
| 국내 주식 변동성(σ) · 해설 렌더 · 전망 | 전망 슬라이스 전 — 사이즈 목표 변동성 비중은 `insufficient_data` · 익절은 고정 비율. 해설은 같은 게이트라 지금은 막혀 있다 | 슬라이스 5 |
| 미래 평일 휴장 채점 | 달력이 미래 휴장을 모른다 — 사흘 대기 | 휴장일 TR 권한(실전 키) |
| 투자 패널(hover 미리보기) 국내 주식 판단 화면 | 상세만 찍었다(같은 `JudgmentSummary`) | 다음 화면 확인 |
| 리밸런스 인사이트 upsert 유니크 위반(범위 밖) | 옛 모듈 · 이번 변경 무관, 원인 미확정 — 사용자에게 보고 | 별 작업 |
