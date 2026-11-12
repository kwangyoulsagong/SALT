-- F016 단계 D (2026-11-12) — 오늘 등락 한 줄(③) 스냅샷. DB-REQ-041 FR-8 · SRV-REQ-052 FR-5.
-- 추가만. 롤백 = DROP VIEW public.v_move_explanation_export; DROP TABLE public.move_explanation.
-- 주인 coach(Express Prisma — S6 이전 때 Flyway 로). 시장 층 — 사용자 열 0(종목 · 거래일마다 누구에게나 같은 문장).
-- 시도 하나 = 한 행. 실패(인용 없음 · 검사 걸림)도 남긴다 — 같은 지문은 LLM 1회 · 하루 시도 상한을 센다 · 품질 감사(FC-REQ-027).
-- 불변 — 새 지문 = 새 행(UPDATE 는 트리거가 막는다). 프롬프트 · 응답 원문 · 버린 문장 0.
CREATE TABLE public.move_explanation (
  id                text        PRIMARY KEY,
  asset_class       text        NOT NULL CHECK (asset_class IN ('kr', 'crypto')),
  symbol            text        NOT NULL,
  trade_date        date        NOT NULL,
  fingerprint       text        NOT NULL,
  -- 'ok' — 통과 문장 · 'no_citation' · 'guard_blocked' — 문장 0
  gate              text        NOT NULL CHECK (gate IN ('ok', 'no_citation', 'guard_blocked')),
  text              text,
  -- 문장 속 [k] → citations[k-1](market 사실 id). 쿼리 조건이 아니다
  citations         text[]      NOT NULL DEFAULT '{}',
  -- 프롬프트에 넣은 사실 수 · 걸린 사유 코드(원문 0)
  fact_count        integer     NOT NULL,
  rejections        text[]      NOT NULL DEFAULT '{}',
  provider          text        NOT NULL,
  model             text,
  prompt_version    text        NOT NULL,
  verifier_version  text        NOT NULL,
  generated_at      timestamptz NOT NULL,
  CHECK ((gate = 'ok') = (text IS NOT NULL AND cardinality(citations) > 0)),
  UNIQUE (asset_class, symbol, trade_date, fingerprint)
);
CREATE INDEX move_explanation_day_idx ON public.move_explanation (asset_class, symbol, trade_date, generated_at DESC);
CREATE TRIGGER move_explanation_no_update BEFORE UPDATE ON public.move_explanation
  FOR EACH ROW EXECUTE FUNCTION judgment_ledger_immutable();

-- 예측 주간 리포트 재료(FC-REQ-027 FR-5) — 문장 · 인용 수 · 게이트만. forecast 는 이 뷰만 읽는다(ADR-007)
CREATE VIEW public.v_move_explanation_export AS
SELECT asset_class, symbol, trade_date, gate, text, cardinality(citations) AS citation_count, citations,
       fact_count, rejections, provider, prompt_version, verifier_version, generated_at
FROM public.move_explanation;
