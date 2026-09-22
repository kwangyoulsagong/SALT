# BFF-REQ-036 (F000 CLEANUP) — 검증 체크리스트

- REQ: `requirements/specs/in-progress/BFF-REQ-036-F000-CLEANUP.md`
- 브랜치: `chore/bff-cleanup` (base `main` `5373189`) · 검증일: 2026-09-22
- 상태: **완료** — FR-1~5 pass. 동면 1주 로그(`BFF-REQ-007` FR-6)만 2026-09-29
- **전 영역 통합 기록**: 루트 `requirements/reports/checklists/F000-bff-cleanup.md`

## 1. FR

| FR | 결과 | 근거 |
|---|---|---|
| FR-1 | **pass** | 테스트 `errors 를 옮긴다` 추가. 실측 `POST /api/auth/login {}` → 400 + `errors[2]`(proxy 경유) · `overview?period=2w` → 422 + `code` |
| FR-2 | **pass** | `status(500)` 직접 응답이 컨트롤러에서 0건(동면 `feed` 제외). 실측 가짜 토큰 `/api/app/alerts` · `/api/app/home` **before 500 → after 401**, `/portfolio` 401 |
| FR-3 | **pass** | 뉴스 · 초대 호출처 확인(LLM 없음) |
| FR-4 | **pass** | 테스트 3(하위 경로 · 메서드 무관 410, 목록 밖 404, 유지 경로 비겹침). 실측 6경로 410 + `ENDPOINT_DORMANT` · `revivable:true`, `/api/users/profile` 401 유지 |
| FR-5 | **pass** | 4파일. 규칙 줄 수 200 이하 |

## 2. 명령

| Check | 결과 |
|---|---|
| `npx tsc --noEmit` | pass |
| `npm run build` | pass |
| `npm test` | **80 pass**(77 → +1 errors · +3 동면, market 컨트롤러 422 테스트를 next 위임 검증으로 교체) |
| 실측(4001, tsx watch) | 위 표. 정상 경로 `overview?period=7d` · `symbols` · `/api/app/market` · `/:symbol` · `/summary` 200 |

## 3. 판단이 REQ와 다른 것

- **처음에 feed 파일을 지우고 `ROUTE_GONE` 을 썼다** — `BFF-REQ-007` FR-1("파일은 남긴다") · FR-4(`ENDPOINT_DORMANT`)
  와 달라 push 전에 되돌렸다. 동면은 삭제가 아니다
- **`/api/users/dashboard` 를 목록에 더했다**(스펙 목록 밖). 서버 `getDashboardSummary` 8값 중 미션 · 포인트가 3이고 목표는
  `/api/goals` 가 따로 준다. 프론트 호출 0건 · 동면이라 되살리기 한 줄. 스펙의 `/api/dashboard*` 가 이것을 뜻했을 가능성이 높다

## 4. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 동면 1주 로그 잔여 0건(`BFF-REQ-007` FR-6) | 기간이 필요하다 | 2026-09-29 |
| 401 이 된 5경로의 프론트 동작(재로그인 이동) | 이전엔 500 이라 그 분기가 실행된 적 없다. 소비처 화면 확인 안 함 | 다음 FE 작업에서 만료 토큰으로 확인 |
| 5xx → 502/504 | 보류 항목 | 별도 판단 |
| `upbit-ws.service` import 시 연결 | 동작 변경(관심 종목 보정) | BFF 실시간 REQ |
| WS 가격 throttle | 미구현 | WS 성능 REQ |
