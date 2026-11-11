-- F017 v2 단계 3 (2026-11-11) — 해설 스냅샷. DB-REQ-043 FR-1 · SRV-REQ-053 FR-3.
-- 추가만. 롤백 = DROP TABLE public.explanation_snapshot.
-- 주인 coach(Express Prisma — S6 이전 때 Flyway 로). 시장 층이다 — 사용자 열 0(종목 · 모드마다 한 벌, 누구에게나 같은 문장).
-- 배치가 종목 지문이 바뀐 것만 만든다. 요청 경로는 읽기만(LLM 0).
-- 불변 — 새 지문 = 새 행(UPDATE 는 트리거가 막는다). 지우기는 보존(종목 · 모드당 최근 N)만.
CREATE TABLE public.explanation_snapshot (
  id            text        PRIMARY KEY,
  symbol        text        NOT NULL,
  mode          text        NOT NULL CHECK (mode IN ('scalp', 'long_term')),
  fingerprint   text        NOT NULL,
  -- 만들 때 판단 행동 — 이전 해설을 보일지(같은 방향일 때만) 고르는 데 쓴다
  action        text        NOT NULL,
  -- 'llm' — 검사 통과 · 'llm_checked' — 일부 문장을 템플릿으로 채움. 전부 템플릿이 된 생성은 저장하지 않는다
  source        text        NOT NULL CHECK (source IN ('llm', 'llm_checked')),
  provider      text        NOT NULL,
  -- [{section, text, citations:[{id,label,at}]}] — 쿼리 조건이 아니다(performance-database.md §4 허용 목록)
  sentences     jsonb       NOT NULL,
  -- {sentences, dropped, promptVersion, verifierVersion} — 버린 문장 원문 0
  verifier      jsonb       NOT NULL,
  facts_hash    text        NOT NULL,
  generated_at  timestamptz NOT NULL,
  UNIQUE (symbol, mode, fingerprint)
);
CREATE INDEX explanation_snapshot_latest_idx ON public.explanation_snapshot (symbol, mode, generated_at DESC);
CREATE TRIGGER explanation_snapshot_no_update BEFORE UPDATE ON public.explanation_snapshot
  FOR EACH ROW EXECUTE FUNCTION judgment_ledger_immutable();
