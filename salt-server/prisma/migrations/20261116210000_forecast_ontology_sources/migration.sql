-- F017 v4 순서 5b-2 (2026-11-16) — 온톨로지 원천 확대(사용자 "온톨로지 이게 다야?" · "베스트 케이스로"). FC-REQ-022 FR-5 · 16 · DB-REQ-043 FR-15.
-- 추가만. 롤백 = DROP TABLE forecast.entity_alias; DROP VIEW public.v_extracted_fact_export, public.v_crypto_name_export.
-- forecast 는 public 을 export 뷰로만 읽는다(ADR-007 · DB-REQ-036 FR-3 목록 무증가). 사용자 열 0.

-- 식별자 해소(ontology.md §4) — 별칭 하나 = 한 행. 소식 → 종목 연결이 같은 표를 본다
CREATE TABLE forecast.entity_alias (
  entity       text        NOT NULL REFERENCES forecast.entity (id),
  alias        text        NOT NULL,
  alias_kind   text        NOT NULL CHECK (alias_kind IN ('code', 'ko_name', 'en_name', 'symbol', 'market_code')),
  source_kind  text        NOT NULL,
  available_at timestamptz NOT NULL,
  ingested_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entity, alias)
);
CREATE INDEX entity_alias_alias_idx ON forecast.entity_alias (alias);

-- 기사 · 공시 추출 사실(주인 서버 coach — DB-REQ-043 FR-9). 문장 칸 없음
CREATE VIEW public.v_extracted_fact_export AS
SELECT id, source_kind, source_key, symbols, who, what, amount, unit, compared_to, when_text, event_kind,
       published_at, available_at, source_url, source_name, extractor_version
FROM public.extracted_fact;

-- 코인 이름(주인 서버 market — market_assets 의 이름 열만, 시세 열 0)
CREATE VIEW public.v_crypto_name_export AS
SELECT symbol, korean_name, english_name, listed_at
FROM public.market_assets
WHERE asset_type = 'crypto';
