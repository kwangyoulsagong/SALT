# FE-REQ-052 — zone = 도메인 (F0) — 회고

2026-11-02 · 체크리스트 `checklists/FE-REQ-052.md`

## 잘 된 것

- **레지스트리 한 곳이 진짜 한 곳이 됐다.** 전에는 `registry.ts` · 셸 `next.config.js`(`/tax` 손으로) · 앱 eslintrc 2개(`zonePaths` 복사)에 같은 경로가 네 벌 있었고, web-tax eslintrc 의 목록은 이미 레지스트리와 달랐다(`/search` · `/settings` 없음). 지금은 `registry.json` 하나를 TS · CommonJS 가 읽고 계산 대조 테스트가 둘을 묶는다
- **전환기를 레지스트리 칸으로 적었다(`hostedIn`).** 화면을 옮기지 않은 F0 에서 "투자 경로는 투자 zone" 을 그대로 강제하면 셸 안 `<Link href="/investments">` 전부가 lint 실패가 된다. 목표(경로 주인)와 지금(서비스하는 앱)을 다른 칸으로 두니 규칙을 느슨하게 하지 않고 통과한다
- **rewrites `fallback` 을 실측으로 확인했다.** `afterFiles` 였다면 동적 라우트 `/investments/[symbol]` 을 빈 zone 이 가로챈다 — `/investments/BTC` 200(셸) 로 확인

## 아쉬운 것

- FR-5 는 "JSON 생성본"이라 적었는데 생성 단계를 두지 않았다 — 생성물은 다시 손으로 고쳐지는 사본이 된다. 스펙 문장과 다르게 간 판단은 스펙 Changelog 에 적었다
- 도메인 간 import 의 ESLint 경로는 패키지가 없어 못 돌렸다(훅으로만). 판정 함수는 같지만 "lint 변이 3종"의 한 종은 훅 실행으로 대신했다
- zone 앱 `next.config.js` 머리 주석에 경로 · assetPrefix 값을 적었다 — 주석이라 레지스트리와 갈라질 수 있다

## Action

- 화면을 옮기는 REQ(`FE-REQ-053` · `056`)는 **셸 라우트 삭제 + 레지스트리 `hostedIn` 을 자기 앱으로**를 한 커밋에 — 하나만 하면 셸 링크가 lint 를 통과한 채 hard navigation 이 되거나 셸이 계속 받는다. 두 스펙 Changelog 에 적었다
- 레지스트리 값을 바꾸면 `grep -rn "<옛 값>" salt-microFe/apps/*/next.config.js salt-microFe/apps/*/README.md` 로 주석까지 고친다
- `domain-*` 패키지가 처음 생길 때 `.eslintrc`(`@repo/fsd/layers`)를 같이 넣고 `cross-domain` 변이를 ESLint 로 다시 돌린다(`FE-REQ-053` FR-1)

## 2026-11-02 — MONEY-F1(`FE-REQ-053`)

- 이 REQ 화면 · 동작에 걸린 수정이 있다 — 근거와 확인은 커밋 설명 · 루트 회고 `requirements/reports/retrospects/MONEY-F1-invest-zone-home-cards.md`

## 2026-11-03 — MONEY-F2(`FE-REQ-054`)

- 파일만 걸침 — Action 없음

## 2026-11-03 — MONEY-F2(`FE-REQ-054`) 정적 경로

- 규칙 7 의 "assetPrefix 유일"은 dev 청크 충돌을 막는 데는 맞고, 운영에서는 캐시 공유를 막았다. 규칙을 dev · 운영으로 나눴다. Action 없음
