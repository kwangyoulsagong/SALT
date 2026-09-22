# F004 슬라이스 3 — 종목 판단 뷰모델 (BFF) — 회고

- 브랜치: `feat/f004-bff-judgment`
- 날짜: 2026-09-22
- 체크리스트: `requirements/reports/checklists/F004-bff-symbol-judgment.md`

## 1. 무엇을 했나

서버가 슬라이스 1·2 에서 낸 `modes.*` · `zone` · `gaugeTrackRecords` 를 `/api/app/ai-coach/detail`
로 화면까지 이었다. 서버의 평평한 모드 블록을 **`renderable` 판별 union** 으로 접은 것이 핵심이다.

## 2. 잘 유지된 것

- **route → controller → service 경계.** 조립은 순수 함수 `symbol-coach.viewmodel.ts`(import 0)에,
  서비스는 호출 · 병렬화만, 컨트롤러는 취소 신호 연결만. 테스트가 네트워크 없이 돈다
- **게이트는 닫는 방향만.** 계약이 깨진 모드는 `null` 이고 BFF 가 `true` 를 만드는 경로가 없다
- **`confidence` 를 스프레드가 아니라 필드 선택으로 끊었다.** 서버가 다시 보내도 새지 않는다
- 비밀값 · 토큰 로그 0건, worker · WS 무변경

## 3. 남은 기술부채

- **`proxyAuthRequest` 옵션이 호출마다 흩어진다.** 경로별 타임아웃이 서비스 상수로 있다.
  `BFF-REQ-025` 호출 맵 전체를 옮기려면 호출 맵을 한 곳(표)으로 두는 게 낫다
- **GET 재시도 1회가 BFF 어디에도 없다.** 호출 맵은 전부 "1회"를 요구한다
- **axios 4xx 가 error middleware 에서 500 으로 바뀐다.** `backend-integration.md` "원 status 보존"
  위반이 이 경로 이전부터 있다. 429 전달(`BFF-REQ-023` FR-60)을 하려면 먼저 고쳐야 한다
- 뷰모델 타입이 BFF 안에만 있다(`packages/core` 미이동)

## 4. 다음에 보완할 규칙 · 문서

- `bff-architecture.md` §5 "실패는 `null`" 을 **모드 · 블록 단위 계약 위반**에도 쓴다고 한 줄 —
  이번에 REQ 의 "unavailable" 을 `null` 로 읽은 해석을 규칙으로 올릴 가치가 있다

## 5. 추가 검증 제안

- 판단 성적표 표본이 20 을 넘는 판단 유형이 생기면 `renderable: true` 경로를 실데이터로 본다
- FE 패널에서 행을 빠르게 바꾸며 서버 로그로 upstream 취소를 확인한다
