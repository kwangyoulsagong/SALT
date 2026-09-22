# FE-REQ-028 (F004 API) — 회고

- 날짜: 2026-09-22 · 슬라이스: `F004-fe-coach-panel` · 루트 회고: `requirements/reports/retrospects/F004-fe-coach-panel.md`

## 잘 된 것
- `mode` 를 BFF 에 한 번도 보내지 않는다 — 키에서 모드가 빠지니 전환이 캐시 읽기가 됐다
- 판단 쿼리에 `keepPreviousData` 를 **쓰지 않은** 이유를 코드에 남겼다(다른 종목 판단 노출)
- 4xx 재시도 0 · 5xx 1회 — 막힌 상태를 재시도로 늦게 보여주지 않는다

## 부채 · 다음 행동
- 인증이 `localStorage` 토큰(FR-80 쿠키는 `FE-REQ-013`)
- FR-73 enum 규칙 미충족 — BFF 원본 타입을 따르는 사본이라서. 계약 소유 쪽(BFF)에서 정할 일
- `CoachApiError` 는 슬라이스 로컬이다. `shared/api` 에 에러 정규화가 생기면(`FE-REQ-012`) 그리로

## 슬라이스 6 — 해설 · 상세 조회 (2026-09-22) · 루트 회고: `requirements/reports/retrospects/F004-fe-detail-page.md`

### 잘 된 것
- 해설을 mutation 으로 둬서 "자동 호출 0"이 구조로 보장된다 — 쿼리가 없으니 마운트 · 포커스로 불릴 길이 없다
- 429 와 나머지 실패를 나눴다 — 동시 상한은 "잠시 후", 그 외는 규칙 기반 문장. 둘 다 오류 화면이 아니다
- 상태 가드로 3연타가 3건 나가던 것을 실측으로 잡아 ref 가드로 바꿨다

### 부채 · 다음 행동
- FR-84(서버 컴포넌트 조회) — `FE-REQ-013` 쿠키 인증 후
- FR-86 해설 `renderable` union — 서버 응답에 없다. 서버가 막힌 판단에 해설을 거부하도록 바꾸면 타입도 같이
- `ExplainApiError` · `CoachApiError` 두 슬라이스 로컬 에러 — `shared/api` 정규화(`FE-REQ-012`)로
