# F000 슬라이스 — 레거시 모델 drop · 중복 워커 정정 — 회고

영역 회고: `salt-server/requirements/reports/retrospects/SRV-REQ-007.md` · `DB-REQ-001.md` · `DB-REQ-003.md` · `SRV-REQ-010.md` ·
`SRV-REQ-011.md` · `DB-REQ-004.md` · `SRV-REQ-008.md` · `bff/requirements/reports/retrospects/BFF-REQ-010.md` · `BFF-REQ-009.md`

## 요약

- **"중복"이라는 말이 7개 문서로 퍼졌는데 아무도 쓰는 테이블을 확인하지 않았다.** 2026-09-09 감사가 "가격 갱신"이라는 같은 이름을 보고 중복으로 적었고,
  이후 REQ 가 그 문장을 복사했다. 2026-10-29 전수 조사도 "잡이 매분 돈다 — 기준을 잡 제거로 고친다"고 전제를 더 굳혔다. 쿼리 한 줄(`market_assets` vs 관심 목록 최신 시각)이 답이었다
- **스펙대로 지웠으면 조용히 깨졌다** — 판정이 stale 게이트로 막히고 에러는 0건이다. BFF 워커는 상시 프로세스도 아니었다
- **drop 은 30분 일이었다** — 행 0 이라 복원 테스트가 가장 긴 단계(139초)

## Action

- "중복 제거" 요구는 착수 전 **두 경로가 쓰는 테이블 · 행**을 쿼리로 보인다 — 이름이 같다고 같은 쓰기가 아니다
- 진짜 사본(`investment_watchlist.current_price`)은 S5 `market` 이전 때 정리
- **판단을 뒤집으면 머리 블록으로 끝내지 않는다** — 그 판단을 적은 본문 행(FR · 표 · 수용 기준 · 도식)을 키워드로 grep 해 그 자리에서 정정한다. 첫 보고 때 18곳이 남아 있었다(2026-10-30 보완)

