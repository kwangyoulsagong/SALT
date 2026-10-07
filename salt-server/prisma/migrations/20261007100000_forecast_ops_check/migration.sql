-- F010 슬라이스 7 (2026-10-07) — 운영 점검 결과. DB-REQ-029 FR-24 · FC-REQ-018.
-- 추가만. 롤백 = DROP TABLE forecast.ops_check.
-- 쓰기는 salt-forecast(ops_monitor 작업)만. 서버는 아직 읽지 않는다(뷰 없음) — 화면에 올릴 때 뷰와 같은 PR 로.
--
-- 정기 작업(job_run)이 제때 성공했나 · 주간 원장 행이 마감 안에 쓰였나를 시각 단위로 남긴다.
-- as_of 는 점검 시각을 정시로 내린 값 — 같은 시간에 두 번 돌면 덮어쓴다(멱등).
-- 보존 90일(job_run 과 같다, db-contract.md §5). 지우는 것도 ops_monitor 다.

CREATE TABLE forecast.ops_check (
  as_of       timestamptz NOT NULL,              -- 점검 시각(정시 내림)
  subject     text        NOT NULL,              -- 작업 이름 · ledger:<원장>
  status      text        NOT NULL CHECK (status IN ('ok', 'overdue', 'failed', 'never', 'late', 'missing', 'due')),
  last_ok_at  timestamptz,                       -- 마지막 성공(작업) · 기록 시각(원장)
  detail      text,                              -- 오류 타입 · 경과 시간. 오류 원문 · 응답 본문은 담지 않는다
  checked_at  timestamptz NOT NULL,              -- 실제로 돈 시각
  PRIMARY KEY (as_of, subject)
);
CREATE INDEX ops_check_subject ON forecast.ops_check (subject, as_of DESC);
