-- F011 슬라이스 3 — 국내 주식 시세에 당일 시가 · 고가 · 저가(코인 표의 최고가 · 최저가 열과 같은 자리).
-- nullable 추가라 기존 행은 다음 폴링 · 체결이 채운다. 되돌리기: 아래 세 컬럼 DROP.
ALTER TABLE "kr_stock_quotes" ADD COLUMN "open_price" DECIMAL(38,10),
ADD COLUMN "high_price" DECIMAL(38,10),
ADD COLUMN "low_price" DECIMAL(38,10);
