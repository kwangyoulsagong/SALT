-- F010 슬라이스 6 (3차, 2026-10-06) — 뉴스 원장 · 금융 감성 점수 · 규칙 사건 태그. DB-REQ-029 FR-23 · FC-REQ-016.
-- 추가만. 롤백 = DROP TABLE forecast.news_score · DROP TABLE forecast.news_item.
-- 쓰기는 salt-forecast 만. 서버는 아직 읽지 않는다(뷰 없음) — 사전등록 news-sentiment@1 의 라이브 기록이다.
--
-- 두 개의 시각(time-and-leakage.md §1): published_at = 원천이 적은 게시 시각(observed_at),
-- fetched_at = 우리가 처음 받은 시각(available_at). RSS 첫 수집 때 며칠 묵은 기사가 같이 오므로 둘은 다르다 —
-- 채점은 fetched_at 으로만 자른다. 다시 받아도 fetched_at 은 처음 값 그대로다(DO NOTHING).
-- 본문은 저장하지 않는다 — 제목 · RSS 요약 앞 500자만(피처 전용, 화면 표시 없음).

CREATE TABLE forecast.news_item (
  item_id      text        PRIMARY KEY,          -- sha256(정규화 URL) 앞 32자
  source       text        NOT NULL,             -- rss:google:코인 · rss:coindesk …
  lang         text        NOT NULL,             -- ko · en (한글 비율로 판정)
  title        text        NOT NULL,
  summary      text,                             -- RSS 요약 앞 500자
  url          text        NOT NULL,
  title_key    text        NOT NULL,             -- 정규화 제목 해시 — 같은 기사가 여러 피드로 오면 같은 값
  published_at timestamptz NOT NULL,             -- observed_at
  fetched_at   timestamptz NOT NULL              -- available_at
);
CREATE INDEX news_item_fetched ON forecast.news_item (fetched_at DESC);
CREATE INDEX news_item_title_key ON forecast.news_item (title_key, fetched_at);
CREATE TRIGGER news_item_no_update BEFORE UPDATE ON forecast.news_item
  FOR EACH ROW EXECUTE FUNCTION judgment_ledger_immutable();

-- 모델을 바꾸면 과거 기사를 새 model_version 행으로 다시 매긴다(data-pipeline.md §5) — 덮어쓰지 않는다
CREATE TABLE forecast.news_score (
  item_id       text        NOT NULL REFERENCES forecast.news_item (item_id),
  model_version text        NOT NULL,            -- news-sentiment@1:kr-finbert-sc@f858628 …
  symbols       text[]      NOT NULL DEFAULT '{}', -- 별칭 표로 이은 종목(KRW-BTC …), 알파벳 순
  event_kinds   text[]      NOT NULL DEFAULT '{}', -- 규칙 사건 태그(hack · regulation · delisting …), 알파벳 순
  negated       boolean     NOT NULL,            -- 부정어(불발 · 무산 · rejected …)가 사건 태그 옆에 있다
  p_pos         double precision NOT NULL,
  p_neu         double precision NOT NULL,
  p_neg         double precision NOT NULL,
  score         double precision NOT NULL,       -- p_pos − p_neg ∈ [−1, 1]
  scored_at     timestamptz NOT NULL,
  PRIMARY KEY (item_id, model_version)
);
CREATE INDEX news_score_symbols ON forecast.news_score USING gin (symbols);
CREATE TRIGGER news_score_no_update BEFORE UPDATE ON forecast.news_score
  FOR EACH ROW EXECUTE FUNCTION judgment_ledger_immutable();
