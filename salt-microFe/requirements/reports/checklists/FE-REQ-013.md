# FE-REQ-013 (F000 PERF) — 검증 체크리스트

- REQ: `salt-microFe/requirements/specs/in-progress/FE-REQ-013-F000-PERF.md`

## 2026-09-23 — 첫 로드 (`next build`, worktree)

| 경로 | 전 | 후 | 이유 |
|---|---|---|---|
| `/coach/report` | 134 kB | **109 kB** | MSW 게이트 · 목 제거 |
| `/investments/[symbol]` | 134 kB | **113 kB** | 목 제거(−24) + SEO 머리 서버 렌더(+3). 중간에 161 kB 회귀 → 머리를 서버 컴포넌트로 · 서버가 배럴을 안 가져오게 고쳐 닫음 |
| `/investments` | — | 140 kB | 변화 없음 |

규칙으로 남김: `performance-frontend.md` §7 — 서버 컴포넌트는 슬라이스 배럴을 값으로 import 하지 않는다.

## F011 슬라이스 6 — 국내 지수 · 투자자 순매수 (2026-10-26, 파일만 걸침)

| 항목 | 결과 |
|---|---|
| 번들 | `/investments` 153 kB · `/investments/[symbol]` 137 kB — 직전과 같음 |
| 자리 고정 | 지수 띠 청크 · 응답 전 74px — 표가 밀리지 않음(실화면 확인) |
| 갱신 주기 | 지수 1분(표와 같음) · 투자자 30분 stale(하루 한 번 모이는 값) |

미검증: 없음

## F011 슬라이스 6b (2026-10-27)

| 항목 | 결과 |
|---|---|
| 번들 | `web` 빌드 `/investments` 153 kB · `/investments/[symbol]` 137 kB — 6 과 같다 |
| 폴링 | 호가 10초는 장 중만 · 화면 숨으면 멈춤(TanStack 기본) · 4xx 면 멈춤 |

미검증: 호가 폴링이 열린 탭 여러 개일 때 서버 캐시 적중률 — 언제: 하루 쓴 뒤 서버 로그로
