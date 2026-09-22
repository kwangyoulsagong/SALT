# `@repo/core`

플랫폼 무관한 모델·상수·정책 (FE-REQ-007 FR-32). 두 zone(`apps/web`, `apps/web-tax`)과 RN이 공유한다.

| subpath | 내용 |
|---|---|
| `@repo/core/zones` | **zone 레지스트리** — 어떤 경로가 어느 zone의 것인가. cross-zone 판정의 단일 소스 |
| `@repo/core/http` | HTTP 상태·에러 메시지·재시도 정책 |
| `@repo/core/auth` | 인증 저장 키 · 공개 경로 |
| `@repo/core/market` | 봉 시각(KST 고정) · 실시간 봉 병합 — 웹 상세 · 프리뷰 차트와 RN 이 같은 병합을 쓴다 |

## 테스트

`pnpm --filter @repo/core test`(vitest, node 환경). 순수 함수라 DOM 없이 돈다 — 시간대에 기대는 함수는
`TZ=America/New_York` 로도 돌려 본다.

## 규칙

- **React·DOM·vanilla-extract에 의존하지 않는다.** 여기에 UI가 들어오면 RN이 못 쓴다.
- 앱 하나에서만 쓰는 값은 앱 안에 둔다. 두 zone 이상이 보거나 런타임 계약이면 여기로 올린다.
