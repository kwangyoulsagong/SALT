# @repo/domain-invest

투자 도메인 화면(시세 · 상세 · 코치 · 검색 · 코치 설정). `apps/web-investment` 만 소비한다(2026-11-02 `FE-REQ-053`, `ADR-005`).

- 안은 FSD — `src/{entities,features,widgets,pages}`(shared 는 `@repo/web-shared`, app 은 zone 앱). 레지스트리 `.claude/rules/layered-architecture.md` §4
- 레이어 alias(`@/entities` …)는 이 패키지 `tsconfig` 와 `apps/web-investment/tsconfig.json` `paths` 가 `src` 로 푼다
- 공개 입구 `@repo/domain-invest/pages/<slice>` — zone 앱 라우트가 re-export 한다
- 다른 `domain-*` · 셸 `apps/web` 을 import 하지 않는다. 셸 경로로 갈 때는 `ZoneLink` · `useZoneNavigate`(문서 이동)
- 투자는 동결 — 기획된 것까지만
