-- 도메인 사용 계측(`SRV-REQ-048` FR-7 · `DB-REQ-040` FR-7, 서버 S3d 2026-11-13) — FEATURE-015 FR-6 "주간 활성 · 재개율 · 카드 클릭, 금액 제외".
-- 한 사람 · 하루(KST) · 도메인 · 종류에 한 행, 횟수만 더한다. **시각 · 금액 · 화면 내용 0.**
-- 사람 칸은 user_id 가 아니라 해시(sha256(user_id), SQL 한 곳 — 쓰기 · 지우기 · 내보내기가 같은 식)다: 계측 쿼리(`ops/usage-weekly.sql`)가 사람 id 를 다루지 않게.
-- 비밀 값은 두지 않는다 — 같은 DB 에 users 가 있어 비밀 값이 막는 것이 없다. 계정을 지우면 이 행도 지운다(`IdentityUserRows`).
-- 열은 varchar — 코드 생성(H2 흉내)이 text 열 키를 못 읽는다(`kotlin-platform.md` §4). 해시는 sha256 hex 64자 그대로
CREATE TABLE usage_day (
    user_hash    varchar(64) NOT NULL CHECK (user_hash ~ '^[0-9a-f]{64}$'),
    on_day       date        NOT NULL,
    shell_domain varchar(20) NOT NULL CHECK (shell_domain IN ('savings', 'household', 'invest', 'tips')),
    kind         varchar(20) NOT NULL CHECK (kind IN ('visit', 'card_click')),
    times        integer     NOT NULL DEFAULT 1 CHECK (times > 0),
    PRIMARY KEY (user_hash, on_day, shell_domain, kind)
);
-- 주간 집계는 날짜 범위로 읽는다
CREATE INDEX ix_usage_day_on_day ON usage_day (on_day);
COMMENT ON TABLE usage_day IS 'record: 도메인 화면을 연 날 · 홈 카드를 누른 횟수(금액 0)';
