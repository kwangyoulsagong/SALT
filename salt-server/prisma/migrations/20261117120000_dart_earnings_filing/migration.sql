-- SRV-REQ-041 FR-8 · 9 · 10 (2026-11-17, F008 슬라이스 24 2단계) — DART 실적 공시 · 실적 일정 표와 예측 export 뷰.
-- 회사 사정 목록(dart_filing)과 따로 둔다: 10년 이력을 거기 넣으면 사전등록 event-window@2 원천(v_dart_filing_export)과
-- 회사 사정 칸이 같이 바뀐다. 원문은 저장하지 않는다 — 접수번호 · 이름 · 날짜 · 본문에서 읽은 일정만(FC-REQ-021 FR-15).
-- 사람 행 아님(user_id 없음 · 공시 공개 사실).
-- 롤백: DROP VIEW public.v_dart_earnings_export; DROP TABLE dart_earnings_sync; DROP TABLE dart_earnings_filing; (재수집 가능)

CREATE TABLE "dart_earnings_filing" (
  "rcept_no"       TEXT NOT NULL,
  "stock_code"     TEXT NOT NULL,
  "report_name"    TEXT NOT NULL,
  "pblntf_ty"      TEXT NOT NULL,
  "rcept_date"     DATE NOT NULL,
  "first_seen_at"  TIMESTAMPTZ(3) NOT NULL,
  "kind"           TEXT NOT NULL CHECK ("kind" IN ('earnings', 'ir', 'preview')),
  "period_end"     DATE,
  "scheduled_at"   TIMESTAMPTZ(3),
  "time_known"     BOOLEAN,
  "about_earnings" BOOLEAN,
  "doc_status"     TEXT CHECK ("doc_status" IN ('ok', 'unparsed', 'failed')),
  "doc_attempts"   INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "dart_earnings_filing_pkey" PRIMARY KEY ("rcept_no")
);
CREATE INDEX "dart_earnings_filing_stock_date_idx" ON "dart_earnings_filing" ("stock_code", "rcept_date" DESC);
-- 본문 대기열(IR · 예고 중 아직 안 읽은 것) — 회차마다 최신순 20
CREATE INDEX "dart_earnings_filing_doc_pending_idx" ON "dart_earnings_filing" ("rcept_date" DESC)
  WHERE "kind" IN ('ir', 'preview') AND "doc_status" IS NULL;

CREATE TABLE "dart_earnings_sync" (
  "stock_code" TEXT NOT NULL,
  "full_at"    TIMESTAMPTZ(3) NOT NULL,
  "synced_at"  TIMESTAMPTZ(3) NOT NULL,
  "filings"    INTEGER NOT NULL,
  CONSTRAINT "dart_earnings_sync_pkey" PRIMARY KEY ("stock_code")
);

-- 예측(salt-forecast)이 읽는 계약 — 본문을 읽은 IR · 예고만 일정 칸이 찬다
CREATE VIEW public.v_dart_earnings_export AS
SELECT rcept_no, stock_code, kind, report_name, rcept_date, first_seen_at,
       period_end, scheduled_at, time_known, about_earnings, doc_status
FROM public.dart_earnings_filing;
