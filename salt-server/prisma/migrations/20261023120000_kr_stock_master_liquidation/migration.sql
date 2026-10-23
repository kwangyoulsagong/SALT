-- F011 · FC-REQ-020 FR-9 정리매매 플래그 — 상태 억제 거부권의 원천(KIS 마스터의 거래정지 다음 칸).
-- NOT NULL DEFAULT false 추가 — 기존 행은 다음 07:30 마스터 동기화가 채운다. 롤백: 컬럼 DROP
ALTER TABLE "kr_stock_master" ADD COLUMN "is_liquidation" BOOLEAN NOT NULL DEFAULT false;
