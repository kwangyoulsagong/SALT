-- DB-REQ-041 FR-1 (2026-11-06, F016 단계 B) — 국내 시황/공시 제목. KIS 종합 시황/공시(제목)(FHKST01011800)를 시장 전체로 받는다.
-- **본문 · 링크 열 0**(원천에 없고 우리도 만들지 않는다 — ADR-009). 원천 일련번호 PK — 같은 제목은 다시 쓰지 않는다.
-- 관련 종목(최대 10)은 연결 표 — 화면은 한 종목의 오늘 제목을 읽는다(code, published_at desc). 연결 표에 게시 시각을 같이 둬
-- 그 인덱스 하나로 끝난다(제목 표 조인은 PK). 코드는 마스터 FK 를 걸지 않는다 — ETN · 마스터 밖 코드가 섞여 온다(VI 와 같은 이유).
-- 보관 30일(정리 워커가 5,000행씩). 광고성(promo)은 지우지 않고 표시에서만 뺀다 — 패턴을 고치면 다시 판정할 수 있게.
--
-- 롤백: DROP TABLE kr_news_title_symbol; DROP TABLE kr_news_title;
CREATE TABLE kr_news_title (
  serial         text          NOT NULL,   -- cntt_usiq_srno
  provider_code  text          NOT NULL,   -- news_ofer_entp_code
  provider_name  text          NOT NULL,   -- dorg
  kind           text          NOT NULL,   -- news | disclosure
  category_code  text,                     -- news_lrdv_code(뜻은 제공처마다 — 저장만)
  title          text          NOT NULL,
  promo          boolean       NOT NULL DEFAULT false,
  published_at   timestamp(3)  NOT NULL,
  collected_at   timestamp(3)  NOT NULL,
  CONSTRAINT kr_news_title_pkey PRIMARY KEY (serial)
);
CREATE INDEX kr_news_title_published_at_idx ON kr_news_title (published_at);

CREATE TABLE kr_news_title_symbol (
  serial        text          NOT NULL,
  code          text          NOT NULL,
  published_at  timestamp(3)  NOT NULL,
  CONSTRAINT kr_news_title_symbol_pkey PRIMARY KEY (serial, code),
  CONSTRAINT kr_news_title_symbol_serial_fkey FOREIGN KEY (serial) REFERENCES kr_news_title (serial) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX kr_news_title_symbol_code_published_at_idx ON kr_news_title_symbol (code, published_at DESC);
