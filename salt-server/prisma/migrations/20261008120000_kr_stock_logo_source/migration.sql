-- F011 FR-47 국내 주식 로고 출처 판정. 전부 nullable 추가 — 기존 행 영향 없음. 롤백: 네 컬럼 DROP
ALTER TABLE "kr_stock_master" ADD COLUMN "homepage" TEXT,
ADD COLUMN "homepage_checked_at" TIMESTAMP(3),
ADD COLUMN "logo_source" TEXT,
ADD COLUMN "logo_checked_at" TIMESTAMP(3);
