---
id: SLICE-F011-KR-MARKET-SUMMARY
title: "F011 국내 탭 요약 띠 — 코인과 같은 대표 지수 · 작은 칸 · 오늘의 시장"
priority: high
labels: [F011, slice, db, server, bff, fe]
created: 2026-11-02
status: done (2026-11-02 — 원/달러 칸은 범위에서 뺌)
---

## Summary

국내 주식 탭 머리는 코스피 · 코스닥 큰 상자 두 개뿐이었다(사용자 "국내주식도 … 코인처럼 똑같이"). 코인 탭의 요약 띠(대표 1 + 작은 칸 9 +
오늘의 시장)를 **같은 컴포넌트, 다른 데이터**로 국내에 깐다. 마스터 인덱스 §4-1 순위 3 셋째 줄. 브랜치 `feat/kr-market-summary`.

| 영역 | REQ | 몫 |
|---|---|---|
| DB | `salt-server/requirements/specs/done/DB-REQ-035-F011-KR-INDEX-INTRADAY.md` | 지수 분 기록 · 지수 고가 · 저가 · 거래대금 열 |
| 서버 | `salt-server/requirements/specs/done/SRV-REQ-042-F011-KR-MARKET-SUMMARY.md` | `GET /api/market/kr/summary` · 분 기록 쓰기 · 정리 |
| BFF | `bff/requirements/specs/done/BFF-REQ-044-F011-KR-MARKET-SUMMARY.md` | 중계 뷰모델 |
| 프론트 | `salt-microFe/requirements/specs/done/FE-REQ-050-KR-MARKET-SUMMARY.md` | 띠 · 머리 띠 국내판 · 옛 상자 · 일정 줄 제거 |
| 주인 REQ(파일만 걸침) | `SRV-REQ-040` · `SRV-REQ-008` · `SRV-REQ-036` · `SRV-REQ-041` · `DB-REQ-033` · `DB-REQ-036` · `FC-REQ-020` · `BFF-REQ-040` · `BFF-REQ-043` · `FE-REQ-041` · `FE-REQ-046` · `FE-REQ-037` · `FE-REQ-010` · `FE-REQ-012` · `FE-REQ-026` · `FE-REQ-040` · `FE-REQ-042` · `FE-REQ-008` · `FE-REQ-029` | 같은 파일 · 표 · 화면을 넓혔다 |

## 판단 — 리뷰가 볼 곳

1. **칸 컴포넌트를 넓혔다, 새로 만들지 않았다** — 지수 칸(로고 없음 · 링크 없음 · 고가 없을 수 있음)을 선택 prop 과 null 로 받는다. 코인 화면 무변경(실화면 대조)
2. **일정 줄을 지웠다**(`FE-REQ-046` FR-5 정정) — 띠 안 오늘의 시장 상자에 같은 3건이 들어가 같은 숫자 두 번이 된다
3. **머리 띠 국내판** — 목표 비중 칸 없음(BTC · ETH 값뿐) · 위험은 보유 전체라 둔다(BTC 동조 줄만 뺌) · 성적표는 `kr_stock` 만
4. **원/달러 칸 없음** — KIS 환율 TR 이 모의 키를 거부한다(실측). 칸을 지어내지 않고 **범위에서 뺐다**(사용자 결정 — 실전 키 안 씀)
5. **요약 칸 종목 = 유니버스 앞 8개** — 5분봉 · 현재가 수집이 이미 그 순서라 워커 변경 0

## 커밋

- `a2bb76c8` feat(db) — 마이그레이션 둘(표 추가 · 열 추가). 되돌리기 = 표 · 열 삭제
- `8d210740` feat(server) — 경로 · 유스케이스 · 분 기록 쓰기 · 정리
- `2018f8c6` feat(bff) — 중계
- `8beed38a` feat(fe) — 띠 · 머리 띠 · 옛 상자 · 일정 줄 제거
