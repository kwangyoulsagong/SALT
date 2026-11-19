# DB-REQ-024 retrospects

## 2026-11-19 — FR 대조 · done (루트 `requirements/specs/done/WEB-perf-req-close-slice.md`)

- 작은 표에서 플래너는 인덱스 대신 Seq Scan 을 고른다 — "인덱스를 안 탄다"로 읽으면 틀린다. Action: 행이 적을 때는 `enable_seqscan = off` 로 탈 수 있는지만 확인한다
