-- 사용자 · 초대 코드 · 시도 기록 · 서명 키(`DB-REQ-040` FR-1 · FR-5 · `SRV-REQ-048` FR-8, 서버 S3b 2026-11-12).
-- 옛 public.users · invite_codes · invite_code_attempts(Express auth · Prisma)를 옮겨 온다 — 행은 관리자 가져오기 `db/identity-import.sql`.
-- 열 이름 · 뜻은 옛 표 그대로(가져오기가 열 하나씩 옮긴다). 바뀐 것 둘: 시각은 timestamptz(Prisma 는 UTC 를 tz 없이 담았다) ·
-- 글자 열은 길이가 있는 varchar(생성기가 text 열 유일 제약 · 인덱스를 못 읽는다 — `kotlin-platform.md` §4).
-- 다른 서비스 표의 user_id 는 이 표를 FK 로 가리키지 않는다(`DB-REQ-036` 부록 B1) — 탈퇴 연쇄는 S3c `UserDeletionRequested`.

-- 계정. 비밀번호 해시는 bcrypt($2a/$2b, cost 10 — 옛 Express 그대로라 옮긴 해시가 그대로 맞는다)
CREATE TABLE users (
    id                varchar(64)  PRIMARY KEY,
    email             varchar(320) NOT NULL UNIQUE,
    nickname          varchar(64)  NOT NULL,
    password_hash     varchar(100) NOT NULL,
    profile_image_url varchar(2048),
    -- 옛 포인트 · 레벨(동면 미션) — 응답 모양이 이 둘을 싣는다(`/auth/me` · 로그인). 새로 쓰는 곳 0
    total_points      integer      NOT NULL DEFAULT 0,
    user_level        integer      NOT NULL DEFAULT 1,
    created_at        timestamptz  NOT NULL,
    updated_at        timestamptz  NOT NULL,
    last_login_at     timestamptz
);

-- 초대 코드 — 한 코드는 한 번만(조건부 UPDATE 가 지킨다). 코드 원문은 발급 때 한 번만 보인다(`ops/issue-invite-codes.sh`)
CREATE TABLE invite_codes (
    id              varchar(64)  PRIMARY KEY,
    code            varchar(32)  NOT NULL UNIQUE,
    expires_at      timestamptz  NOT NULL,
    used_by_user_id varchar(64)  UNIQUE,
    used_at         timestamptz,
    note            varchar(200),
    created_at      timestamptz  NOT NULL
);
CREATE INDEX invite_codes_expires_at_idx ON invite_codes (expires_at);
-- 점유가 계정보다 먼저다(경합을 예외로 가르지 않으려고 — `JooqInviteCodes.redeem`). 그래서 FK 는 커밋 때 검사한다
-- [jooq ignore start] 생성기가 DEFERRABLE 을 못 읽는다 — 제약은 생성 코드에 필요 없다
ALTER TABLE invite_codes ADD CONSTRAINT invite_codes_used_by_user_id_fkey
    FOREIGN KEY (used_by_user_id) REFERENCES users (id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
-- [jooq ignore stop]

-- 실패한 코드 시도(감사). 잠금 정책 없음 · 코드는 앞 4자만
CREATE TABLE invite_code_attempts (
    id          varchar(64)  PRIMARY KEY,
    code_prefix varchar(8)   NOT NULL,
    reason_code varchar(32)  NOT NULL,
    client_key  varchar(128),
    created_at  timestamptz  NOT NULL
);
CREATE INDEX invite_code_attempts_created_at_idx ON invite_code_attempts (created_at);

-- JWKS 로 내보내는 공개키(FR-5). 개인키는 표에 없다 — 환경 변수(비밀 저장소)뿐.
-- 기동 때 지금 키를 한 행 넣는다(kid = RFC 7638 지문 · 있으면 그대로). 키를 바꾸면 새 행이 생기고, 옛 행은 retired_at 전까지 JWKS 에 남아
-- 그 키로 서명한 토큰이 만료될 때까지 검증된다. retired_at 은 관리자가 채운다(옛 키 토큰 수명 7일 뒤)
CREATE TABLE signing_key (
    kid            varchar(64)   PRIMARY KEY,
    -- JWK(공개 부분만 — kty · n · e) JSON 글자
    public_jwk     varchar(2048) NOT NULL,
    activated_at   timestamptz   NOT NULL,
    retired_at     timestamptz
);
