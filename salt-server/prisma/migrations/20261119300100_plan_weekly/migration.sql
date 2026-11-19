-- DB-REQ-013 · 014 개정(2026-11-19, F003 v2 순서 2 · SRV-REQ-020) — plan 컨텍스트 사람 표 둘. 추가만.
-- 롤백: DROP TABLE weekly_plan_executions; DROP TABLE plan_settings;

CREATE TABLE "plan_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "monthly_base_krw" DECIMAL(20,0) NOT NULL,
    "previous_monthly_base_krw" DECIMAL(20,0),
    "effective_week" DATE NOT NULL,
    "started_week" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_settings_pkey" PRIMARY KEY ("id"),
    -- 월 적립액은 1,000원 단위 양수(상 · 하한은 서버 설정값 — 여기는 모양만)
    CONSTRAINT "plan_settings_monthly_unit" CHECK ("monthly_base_krw" > 0 AND "monthly_base_krw" % 1000 = 0),
    CONSTRAINT "plan_settings_previous_unit" CHECK ("previous_monthly_base_krw" IS NULL OR ("previous_monthly_base_krw" > 0 AND "previous_monthly_base_krw" % 1000 = 0)),
    -- KST 월요일(ISO 요일 1)
    CONSTRAINT "plan_settings_weeks_monday" CHECK (EXTRACT(ISODOW FROM "effective_week") = 1 AND EXTRACT(ISODOW FROM "started_week") = 1)
);

CREATE UNIQUE INDEX "plan_settings_user_id_key" ON "plan_settings"("user_id");

CREATE TABLE "weekly_plan_executions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "week_of" DATE NOT NULL,
    "asset" TEXT NOT NULL,
    "weekly_base_krw" DECIMAL(20,0) NOT NULL,
    "multiplier" DECIMAL(6,3) NOT NULL,
    "planned_krw" DECIMAL(20,0) NOT NULL,
    "band_key" TEXT,
    "gate_passed" BOOLEAN,
    "blocked_reason" TEXT,
    "prereg_key" TEXT,
    "indicator_value" DOUBLE PRECISION,
    "fallback" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "executed_krw" DECIMAL(20,0),
    "recorded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_plan_executions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "weekly_plan_executions_asset" CHECK ("asset" IN ('btc', 'kospi')),
    CONSTRAINT "weekly_plan_executions_week_monday" CHECK (EXTRACT(ISODOW FROM "week_of") = 1),
    CONSTRAINT "weekly_plan_executions_multiplier" CHECK ("multiplier" >= 0 AND "multiplier" <= 3),
    CONSTRAINT "weekly_plan_executions_amounts" CHECK ("weekly_base_krw" >= 0 AND "planned_krw" >= 0 AND ("executed_krw" IS NULL OR "executed_krw" >= 0)),
    -- 상태와 값은 한 덩어리 — executed 면 금액 · 시각이 있고, 아니면 없다
    CONSTRAINT "weekly_plan_executions_status" CHECK (
        ("status" = 'executed' AND "executed_krw" IS NOT NULL AND "recorded_at" IS NOT NULL)
        OR ("status" IN ('planned', 'skipped') AND "executed_krw" IS NULL AND "recorded_at" IS NULL)
    )
);

CREATE UNIQUE INDEX "weekly_plan_executions_user_id_week_of_asset_key" ON "weekly_plan_executions"("user_id", "week_of", "asset");
CREATE INDEX "weekly_plan_executions_user_id_week_of_idx" ON "weekly_plan_executions"("user_id", "week_of" DESC);

-- 내 데이터 등급(서버 S3d — 설명이 설정 화면에 그대로 나온다)
COMMENT ON TABLE "plan_settings" IS 'financial: 밸류에이션 밴드 적립 월 적립액';
COMMENT ON TABLE "weekly_plan_executions" IS 'financial: 주마다 적립 계획 금액 · 배수 · 직접 체크한 실행 금액';
