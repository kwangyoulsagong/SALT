# FC-REQ-017 체크리스트 — 검색 관심 (2026-10-06)

| FR | 위치 | 결과 |
|---|---|---|
| FR-1 | `preregistration/2026-10-06-search-interest.toml` | `3c43b4c`(데이터랩 첫 요청 전 · 키도 없음) 이후 무변경 |
| FR-2 | `ingest/naver_datalab.py` | respx 테스트 4(한 묶음 · 키 헤더 · 401 재시도 없음 · 오류에 키 없음 · 0~100 밖 실패 · KST/48h 시각) |
| FR-3 | `domain/search_interest.py` | 단위 6(배율 옮기기 · 짧은/흩어진 겹침 거부 · 배율 불변 · 미래 날 무시 · 0 근처 분모 결측 · 0 채움) |
| FR-4 | `jobs/ingest_search.py` · `ops/daily.sh` | 키 없음 `--dry-run` → 건너뜀 · 성공 0행 |
| FR-5 | `scoring/search_interest.py` · `jobs/search_interest.py` | 단위 4(월요일은 토요일 KST 까지 · BY step-up · 심은 관계 검출 · 단측 방향). 데이터 없이 `--dry-run` 470주 · 판정 둘 다 ✗(검색어 0) |

## validate

- `ruff` · `pyright` 0 · `lint-imports` 3 kept · `pytest` 전체 통과

## 미검증

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 실제 API 응답 모양(빈 날 생략 · 전 기간 한 요청 허용) | 네이버 키 없음 — 문서 페이지도 리서치 때 막혔다 | 키를 넣은 첫 실행 |
| 백필 · `search-interest@1` 판정 · 리포트 | 같은 이유 | 키를 넣은 날(백필 ~250요청 → 같은 날 채점) |
