# FE-REQ-035 회고 — axios 제거 · 봉 병합 이관

## 1. 무엇을 했나

axios 직접 호출 둘을 `apiFetch` 로 옮기고 import 를 lint 로 막았다. 봉 시각 · 병합을 `@repo/core/market` 으로
옮기고 vitest 11건을 붙였다. `FE-REQ-034` 회고의 규칙 후보 둘과, 코드와 어긋난 규칙 문구 넷을 고쳤다.

## 2. 잘 된 것

- **예외 없는 금지로 끝냈다.** 사용처를 먼저 0으로 만들고 막았다 — "지정 슬라이스만 허용" 같은 예외 목록이 없어
  규칙이 한 줄이다
- **테스트가 실제로 잡는지 확인했다.** KST 고정을 빼고 뉴욕 시간대로 돌려 4건 실패를 본 뒤 복원했다
- 실측으로 POST 본문 · `Content-Type` 까지 봤다 — axios 가 몰래 해 주던 일을 빠뜨렸는지는 타입 검사로 안 보인다

## 3. 틀렸던 것 · 헷갈렸던 것

- **First Load 가 줄 거라 예상했는데 그대로였다.** axios 는 지연 청크에만 있었다. "번들 회귀"의 측정 대상이
  First Load 만이면 이런 이득 · 손실이 안 보인다 — 청크 합계도 같이 본다
- 첫 스모크 테스트가 별 버튼 대신 다른 `aria-pressed` 버튼을 눌러 "요청 0건"이 나왔다. 셀렉터를 라벨로 좁혀 다시 쟀다
- `salt-microFe` 안에서 `git rm` 이 중첩 `.git` 에 걸렸다 — git 은 루트에서

## 4. 남은 기술부채

- 슬라이스마다 `*ApiError` 가 하나씩(`CoachApiError` · `MarketApiError` · `ExplainApiError`) — 모양이 같다.
  넷째가 생기면 `shared/api` 로 올린다
- `@repo/core` README 에 `@repo/core/coach` 행이 없다(이번 범위 밖)

## 5. 다음에 보완할 규칙 · 문서

- `performance-frontend.md` 번들 게이트에 "First Load 와 함께 **클라이언트 정적 JS 합계**" 한 줄 후보

## 2026-10-28 — F000 웹 API 에러 정규화 (파일만 걸침)

- 파일만 걸침 — 이 REQ 판단 없음. Action 없음

## 2026-10-30 — F000 종목 검색 · 추적 자산 상한

- 파일만 걸침 — 판단 무변경. Action: 없음

## 2026-11-02 — zone = 도메인 F0 (`FE-REQ-052`)

- 파일만 걸침 — 판단 무변경. Action: 없음

## 2026-11-02 — MONEY-F1(`FE-REQ-053`)

- 파일만 걸침(경로 · import) — Action 없음

## 2026-11-03 — MONEY-S1a 저축 서비스 첫 판 · 저축 zone 첫 화면

- 걸린 몫은 위 체크리스트 한 줄. 근거 · 판단은 루트 회고 `requirements/reports/retrospects/MONEY-S1a-savings-calculator.md`. Action 없음

## 2026-11-04 — 가계부 S1a(`MONEY-S1-household-entry`)

- 없음.


## 2026-11-05 — FE-REQ-013 FR-80 2단계

- 파일만 걸침(토큰 운반이 쿠키로) — Action 없음

## 2026-11-05 — 금융 팁 S2a(`MONEY-S2a-tips-content`)

- 몫: zone · 도메인 `.eslintrc.json` 10곳(머리 주인 — `no-restricted-imports`)에 규칙 한 줄 `@repo/fsd/no-client-enum-export`. axios · motion 금지 무변경
- **Action**: 없음

## 2026-11-12 — 로그아웃 빨강

- 빨강이 이유 없이 붙어 두 달 남았다 — 색의 뜻(되돌릴 수 없음)을 lint 로 셈. 이유는 그 줄 위 주석에
