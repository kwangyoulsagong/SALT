-- 웹 푸시(`SRV-REQ-062` · `DB-REQ-046`, F019 순서 4 2026-11-21). 되돌리기: DROP TABLE push_subscription; ALTER TABLE notification DROP COLUMN pushed_at;

-- 기기 하나의 구독 — 주소(endpoint)가 기기 · 브라우저 하나. 같은 기기에 다른 사람이 로그인하면 주인이 바뀐다(주소 유일)
CREATE TABLE push_subscription (
    endpoint     varchar(1024) PRIMARY KEY,
    user_id      varchar(128)  NOT NULL,
    p256dh       varchar(128)  NOT NULL,
    auth         varchar(64)   NOT NULL,
    created_at   timestamptz   NOT NULL,
    -- 앱이 열릴 때마다 대조하며 갱신(`FE-REQ-078` FR-4)
    last_seen_at timestamptz   NOT NULL
);
-- [jooq ignore start]
CREATE INDEX push_subscription_user_idx ON push_subscription (user_id);
-- [jooq ignore stop]
COMMENT ON TABLE push_subscription IS 'record: 알림 받을 기기';

-- 푸시를 보낸(보내려고 표시한) 시각. 이 판 전 행은 이미 보낸 것으로 친다 — 배포하자마자 지난 알림이 울리지 않게
ALTER TABLE notification ADD COLUMN pushed_at timestamptz;
UPDATE notification SET pushed_at = created_at;
-- [jooq ignore start]
CREATE INDEX notification_unpushed_idx ON notification (created_at) WHERE pushed_at IS NULL;
-- [jooq ignore stop]
