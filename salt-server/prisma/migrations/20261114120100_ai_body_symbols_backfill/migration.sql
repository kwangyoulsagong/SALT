-- 2a 첫 날(2026-11-14) 행에는 종목 열이 없었다 — 제목의 종목으로 한 번 채운다(이후 행은 잇기 단계가 같이 쓴다). 되돌리기 불필요(값 채움)
UPDATE "news_ai_body" b SET "symbols" = s.codes
FROM (SELECT serial, array_agg(code ORDER BY code) AS codes FROM "kr_news_title_symbol" GROUP BY serial) s
WHERE b."market" = 'kr' AND b."key" = 'kr:' || s.serial AND cardinality(b."symbols") = 0;

UPDATE "news_ai_body" b SET "symbols" = (SELECT array_agg(upper(x)) FROM unnest(a."symbols") x)
FROM "news_articles" a
WHERE b."market" = 'coin' AND b."key" = 'coin:' || a."id" AND cardinality(b."symbols") = 0 AND cardinality(a."symbols") > 0;
