-- F017 v2 단계 6 (2026-11-12) — 소식 측정 태그. FC-REQ-028 FR-3 · DB-REQ-043 FR-4 · SRV-REQ-053 FR-6.
-- 추가만. 롤백 = DROP VIEW forecast.v_news_reaction · v_news_pre_move · v_news_kind_dict · public.v_kr_news_title_export ·
--   public.v_news_article_export · DROP TABLE forecast.news_reaction_stat · news_pre_move · news_kind_dict.
--
-- 정정(DB-043 FR-4 초안 "event_reaction_stats 를 종류 축으로 넓힘"): event_reaction 은 일정 표(scheduled_event)에 FK 로 묶여 있고
-- 키가 (kind, symbol) 이다 — 소식 반응은 시장 · 출처로 풀링한 통계라 키가 다르다. 새 표로 둔다(넓히면 옛 뷰 v_event_card 의 뜻이 바뀐다).

-- ① 예측이 읽는 원천 — export 뷰로만(DB-REQ-036 FR-3 직접 읽기 목록을 늘리지 않음 · msa-services.md §5)
CREATE VIEW public.v_kr_news_title_export AS
SELECT t.serial, t.kind AS origin, t.title, t.promo, t.published_at,
       array_agg(s.code ORDER BY s.code) AS codes
FROM public.kr_news_title t
JOIN public.kr_news_title_symbol s ON s.serial = t.serial
GROUP BY t.serial;

CREATE VIEW public.v_news_article_export AS
SELECT id, title, symbols, published_at
FROM public.news_articles
WHERE cardinality(symbols) > 0;

-- ② 사전 — 사전등록 [classify] · [[kind]] 를 그대로(서버는 이 뷰로만 읽는다 — 사전이 두 곳에 적히지 않는다).
--    dict = {"rules": [{id, text, markets, include, exclude}], "exclude": {"kr": [...], "crypto": [...]}, "news_max_codes": n}
--    jsonb 는 조건으로 뒤지지 않는다(통째로 읽어 메모리 대조 — performance-database.md §4 허용)
CREATE TABLE forecast.news_kind_dict (
  prereg_key   text        PRIMARY KEY,
  registered   date        NOT NULL,
  dict         jsonb       NOT NULL,
  written_at   timestamptz NOT NULL
);

CREATE VIEW forecast.v_news_kind_dict AS
SELECT prereg_key, registered, dict
FROM forecast.news_kind_dict
ORDER BY registered DESC, prereg_key DESC
LIMIT 1;

-- ③ 반응 통계 — (시장, 출처, 종류, 지평)마다 as_of 실행마다 쌓는다. below_min 이면 비율 · 분위 NULL(표본 수는 있다)
CREATE TABLE forecast.news_reaction_stat (
  prereg_key      text             NOT NULL,
  market          text             NOT NULL CHECK (market IN ('kr', 'crypto')),
  origin          text             NOT NULL CHECK (origin IN ('disclosure', 'news')),
  kind            text             NOT NULL,
  horizon         smallint         NOT NULL CHECK (horizon IN (1, 5)),
  as_of           timestamptz      NOT NULL,
  status          text             NOT NULL CHECK (status IN ('ok', 'below_min')),
  sample          integer          NOT NULL,
  sample_eff      double precision NOT NULL,
  sample_days     integer          NOT NULL,
  up_rate         double precision,
  up_low          double precision,
  up_high         double precision,
  mean            double precision,
  q10             double precision,
  q50             double precision,
  q90             double precision,
  pre_move_median double precision,
  base_up_rate    double precision,                 -- 평소 p₀
  differs         text CHECK (differs IN ('higher', 'lower')),  -- Holm 통과 + 부호. NULL = 엇갈림 또는 표본 미달
  window_from     timestamptz,
  window_to       timestamptz,
  PRIMARY KEY (prereg_key, market, origin, kind, horizon, as_of)
);

CREATE VIEW forecast.v_news_reaction AS
SELECT DISTINCT ON (s.market, s.origin, s.kind, s.horizon)
  s.prereg_key, s.market, s.origin, s.kind, s.horizon, s.as_of, s.status, s.sample, s.sample_eff, s.sample_days,
  s.up_rate, s.up_low, s.up_high, s.mean, s.q10, s.q50, s.q90, s.pre_move_median, s.base_up_rate, s.differs,
  s.window_from, s.window_to
FROM forecast.news_reaction_stat s
JOIN forecast.v_news_kind_dict d ON d.prereg_key = s.prereg_key
ORDER BY s.market, s.origin, s.kind, s.horizon, s.as_of DESC;

-- ④ 선반영 — 종목마다 봉마다 "그 봉까지 5봉 초과 수익". 서버는 제목 게시 시각 이전 마지막 봉 값을 고른다(새 제목도 바로).
--    매일 최근 봉들만 다시 쓴다(값은 봉이 닫히면 바뀌지 않는다 — 같은 값 upsert)
CREATE TABLE forecast.news_pre_move (
  market       text             NOT NULL CHECK (market IN ('kr', 'crypto')),
  symbol       text             NOT NULL,
  bar_at       timestamptz      NOT NULL,          -- 그 봉의 available_at
  pre_move_5d  double precision NOT NULL,          -- 로그 초과 수익 ln(C/C₋₅) − ln(M/M₋₅)
  written_at   timestamptz      NOT NULL,
  PRIMARY KEY (market, symbol, bar_at)
);

CREATE VIEW forecast.v_news_pre_move AS
SELECT market, symbol, bar_at, pre_move_5d FROM forecast.news_pre_move;
