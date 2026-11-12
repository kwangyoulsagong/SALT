-- 계정 삭제 기록(`DB-REQ-040` FR-4 · `SRV-REQ-048` FR-4, 서버 S3c 2026-11-12).
-- **사람을 가리키는 칸이 없다** — 누가 지웠는지 남기면 지운 것이 아니다. 남는 것은 언제 · 서비스별 표마다 몇 행(지운 범위를 나중에 셀 수 있게).
-- 내보내기 요청 표는 만들지 않는다(정정): 파일을 저장하지 않고 요청한 그 응답으로 바로 내려 보내 — 만료할 사본이 생기지 않는다.
CREATE TABLE account_deletion_log (
    id         uuid        PRIMARY KEY,
    deleted_at timestamptz NOT NULL,
    -- {"savings": {"goal": 1, "deposit": 3}, "identity": {"users": 1}, ...} — 키는 서비스 · 표 이름뿐, 값은 행 수
    counts     jsonb       NOT NULL CHECK (jsonb_typeof(counts) = 'object')
);
CREATE INDEX account_deletion_log_deleted_at_idx ON account_deletion_log (deleted_at);
