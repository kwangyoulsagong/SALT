-- 종목마다 1년 공시 목록을 한 번 받았는지(F017 v4 2b+). 다시 받을 땐 행을 지운다. 되돌리기 = 표 지우기
CREATE TABLE "dart_backfill" (
  "stock_code" TEXT PRIMARY KEY,
  "done_at" TIMESTAMPTZ(3) NOT NULL,
  "filings" INTEGER NOT NULL
);
