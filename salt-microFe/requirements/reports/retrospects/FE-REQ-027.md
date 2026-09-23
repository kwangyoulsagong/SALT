# FE-REQ-027 (F004 FUNC) — 회고

## 슬라이스 15 — 코치 리포트 (2026-09-23) · 루트 회고: `requirements/reports/retrospects/F004-fe-coach-report.md`

### 잘 된 것
- 쿨다운 길이를 프론트가 모른다 — 남은 초의 출처가 서버 두 곳뿐이다(FR-40)
- 폴링 완료 판정을 순수 함수로 `@repo/core` 에 두어 테스트했다. 앱에는 테스트 러너가 없다
- 코드 → 문장 매핑이 전부 `satisfies` 또는 "없으면 줄 없음"이다(FR-23)

### 부채 · 다음 행동
- 이 REQ 는 슬라이스 4 · 6 이 이미 많은 FR 을 구현했는데 to-do 에 있었다 — 이번에 in-progress 로 옮기고 체크리스트를 만들었다
- 앱 테스트 러너가 없어 `describeBehaviorFact` · `passesRecommendationGate` 가 테스트 밖이다. `@repo/core` 로 옮길지 앱에 vitest 를 둘지 정한다
- FR-60(서버 컴포넌트 조회)은 `FE-REQ-013` 쿠키 세션 후에 닫는다
