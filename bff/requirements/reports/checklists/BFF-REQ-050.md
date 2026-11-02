# BFF-REQ-050 — 해설 요청 클라이언트 헤더 · provider 통과 — 검증

스펙: `bff/requirements/specs/done/BFF-REQ-050-F008-EXPLAIN-CLIENT.md` · 루트 `requirements/specs/in-progress/F008-explain-llm-routing-slice.md`

| 항목 | 결과 |
|---|---|
| `npm run build` · `npm test` | 통과 · **302 / 0**(+4) |
| UA 판별 | `SALTApp/<버전>` → mobile · 데스크톱 · 휴대폰 브라우저 · 이름만 비슷한 것 · 없음 → web(`@repo/core` `isAppWebView` 와 같은 예시) |
| 위조 헤더 | BFF 는 들어온 헤더를 서버로 넘기지 않는다 — 서버 호출 헤더는 `{ X-Salt-Client: <BFF 판별값> }` 뿐, `Authorization` 은 그 뒤에 써서 덮이지 않는다 |
| 중계 | 스트림 web · mobile 헤더 테스트 · `replace` · `done` 의 `provider` 원문 그대로 |
| 실스택 | 3100 웹 → BFF 4001 → 서버: 데스크톱 UA 로 `local_claude` 스트림(SRV-REQ-050 체크리스트) |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 앱 웹뷰 실기기 UA 로 mobile 경로 | 실기기는 QA 몫 — 판별은 단위 테스트 | `QA-001` |
