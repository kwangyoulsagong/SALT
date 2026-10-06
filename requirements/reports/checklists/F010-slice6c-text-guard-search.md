# F010 슬라이스 6 (3차) 체크리스트 — LLM 가드 · 뉴스 · 검색 (2026-10-06)

| 영역 | REQ | 체크리스트 | 상태 |
|---|---|---|---|
| 서버 | `SRV-REQ-025` FR-61 | `salt-server/requirements/reports/checklists/SRV-REQ-025.md` § F010 슬라이스 6 (3차) | 완료 — `npm test` 575/0 · lint · build · Gemini 실호출 1 |
| DB | `DB-REQ-029` FR-23 | 이 문서 | 로컬 적용 · 스키마 계약 통과 |
| 예측 | `FC-REQ-016` | `salt-forecast/requirements/reports/checklists/FC-REQ-016.md` | FR-1~6 완료 · FR-7 2027-02-08 |
| 예측 | `FC-REQ-017` | `salt-forecast/requirements/reports/checklists/FC-REQ-017.md` | FR-1~5 코드 완료 · 실행은 네이버 키 대기 |
| BFF · 프론트 | — | — | diff 0 |

## 제품 공통 수용 기준 (`pr-convention.md` §6)

1. 3종 고지 — 해설 게이트 무변경(막히면 LLM 을 부르지 않는다)
2. 주문 실행 코드 0 — 추가한 외부 호출은 RSS · Hugging Face · 데이터랩 GET/POST 조회뿐
3. 금액 계산 서버 — 무관
4. 확신 · 목표가 · 명령형 0 — 해설 검증기가 영어 · 판단 극성까지 넓어졌다

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 해설 극성 패턴 오탐률 | 실호출 2회 | 라이브 `droppedSentences` 2주(2026-10-20) |
| `news-sentiment@1` 결과 | 라이브 표본 | 2027-02-08 |
| `search-interest@1` 결과 | 네이버 키 대기 | 키를 넣은 날 |
| 서버 키워드 감성(±15) 교체 · 제거 | 등록이 정하지 않는다 — 결과 뒤 새 등록 · 사용자 결정 | 2027-02-08 뒤 |
