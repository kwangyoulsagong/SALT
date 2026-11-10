# BFF-REQ-044 회고 (2026-11-02)

- 스펙의 "같은 타입(`packages/core`)"은 BFF 가 워크스페이스 밖이라는 사실과 어긋났다. 코인 요약 뷰모델이 이미 두 곳에 있다는 머리 주석을 먼저 읽었으면 스펙 단계에서 고칠 수 있었다.
- 국내 읽기 공용 `read` 래퍼(404 올림 · 503 → disabled · 계약 깨짐 → unavailable)가 있어 경로 하나를 더하는 데 서비스 4줄이면 됐다.

## 2026-11-06 — F016 단계 A(파일 걸침)

- 주인은 F016 REQ — 이 문서는 파일이 걸쳐 기록만. 루트 슬라이스 `requirements/specs/done/F016-A-market-status-tags-slice.md` · 체크리스트 `requirements/reports/checklists/F016-A-market-status-tags.md`

## 2026-11-10 — F018

- F018 이 이 REQ 의 파일을 걸쳤다(위 체크리스트 2026-11-10 절). 국내 소유자 전용(F011 §정책)을 전제로 쓴 주석 · 단언이 여러 곳에 흩어져 있었다 — 전제가 바뀌면 그 문장을 grep 으로 한 번에 찾는다
