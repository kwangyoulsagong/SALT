-- F011 슬라이스 6 · SRV-REQ-040 FR-49 · 50 — 국내 지수 요약 · 종목별 투자자 순매수.
-- 새 표 2개만(기존 표 무변경). 롤백: DROP TABLE "kr_stock_investor_flows"; DROP TABLE "kr_index_quotes";

-- CreateTable
CREATE TABLE "kr_index_quotes" (
    "code" TEXT NOT NULL,
    "value" DECIMAL(18,4) NOT NULL,
    "change" DECIMAL(18,4) NOT NULL,
    "change_rate" DECIMAL(18,8) NOT NULL,
    "advancers" INTEGER,
    "unchanged" INTEGER,
    "decliners" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kr_index_quotes_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "kr_stock_investor_flows" (
    "code" TEXT NOT NULL,
    "trade_date" DATE NOT NULL,
    "individual_quantity" BIGINT NOT NULL,
    "individual_value" DECIMAL(38,10) NOT NULL,
    "foreign_quantity" BIGINT NOT NULL,
    "foreign_value" DECIMAL(38,10) NOT NULL,
    "institution_quantity" BIGINT NOT NULL,
    "institution_value" DECIMAL(38,10) NOT NULL,
    "collected_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kr_stock_investor_flows_pkey" PRIMARY KEY ("code","trade_date")
);

-- AddForeignKey
ALTER TABLE "kr_stock_investor_flows" ADD CONSTRAINT "kr_stock_investor_flows_code_fkey" FOREIGN KEY ("code") REFERENCES "kr_stock_master"("code") ON DELETE CASCADE ON UPDATE CASCADE;
