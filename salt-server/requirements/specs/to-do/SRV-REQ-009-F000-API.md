---
id: SRV-REQ-009
feature: F000
area: srv
kind: API
title: "F000 정리·편집 — REST 계약 정의 (인증 축소 · 410 Gone · period 정정)"
priority: high
labels: [api, rest, contract, auth, 410-gone]
created: 2026-09-09
---

## Summary

인증 표면을 줄이고, 동면 경로를 **410 Gone**으로 바꾸고, 차트 `period` 오타를 정정한다. 신규 엔드포인트는 초대 코드와 온보딩 상태 둘뿐이다.

## 신규

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/api/auth/invite/accept` | N | `{ code, email, nickname, password }` | `{ accessToken, refreshToken, user }` / `403 INVITE_*` |
| GET | `/api/auth/invite/check` | N | `?code=` | `{ valid: boolean, reasonCode? }` |
| GET | `/api/onboarding/status` | Y | — | `{ steps: [{ key, done }], nextStep }` |
| GET | `/api/portfolio/summary` | Y | — | `{ items[], totalKrw, fxRateUsed, fxBasisCode }` |
| GET | `/api/news?symbol=&limit=` | Y | — | `{ items[] }` |

## 제거

| Method | Path | 대체 |
|---|---|---|
| POST | `/api/auth/register` | `POST /api/auth/invite/accept` |
| PATCH | `/api/users/password` | 없음 (제거) |
| DELETE | `/api/users/account` | 없음 (제거) |

## 동면 → 410 Gone

| Path | 조치 |
|---|---|
| `/api/missions*` | 등록 해제 → **410 + 1회 로그**, 1주 유지 |
| `/api/users/points/*` · `/api/users/achievements` | 동일 |
| `/api/feed*` | 동일 |
| `/api/dashboard*` | 동일 |
| `/api/investment-insight/ranking*` | 동일 |

## 정정

| Method | Path | 변경 |
|---|---|---|
| GET | `/api/investment/crypto/:symbol/chart` | `period` 유효값을 `minute\|day\|week\|month`로. **`miniute` 거부(422)** |
| GET | `/api/investment/watchlist` | 응답에 현재가·변동률 포함. `AssetType` 3값 |
| GET | `/api/investment/market/overview` | **`limit=100` 유지**(변경 금지 목록) |
| GET | `/api/investment-notifications*` | `kind` 2종으로 제한. 생성 거부, 조회 허용 |

## Requirements

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `POST /api/auth/invite/accept`가 **코드 없이는 계정을 만들지 않는다** | Must |
| FR-2 | 초대 실패는 `403`이고 `reasonCode` 4종을 구분한다: `INVITE_NOT_FOUND` · `INVITE_ALREADY_USED` · `INVITE_EXPIRED` · `INVITE_QUOTA_EXCEEDED` | Must |
| FR-3 | `GET /api/auth/invite/check`는 **코드 유효성만** 답한다. 계정을 만들지 않는다. 화면이 입력 중 검증에 쓴다 | Must |
| FR-4 | `check`는 **무차별 대입에 대한 정보 노출을 최소화**한다: `valid: false`만 주고 `reasonCode`는 `not_found`/`used`/`expired`까지만(상한 초과는 노출하지 않는다) | Must |
| FR-5 | `POST /api/auth/register` 경로가 **존재하지 않는다**(404) | Must |
| FR-6 | `PATCH /api/users/password` · `DELETE /api/users/account`가 존재하지 않는다 | Must |
| FR-7 | 동면 경로는 **410 Gone + 1회 로그**다. 404가 아니다 — 프론트 잔여 호출을 탐지하기 위함 | Must |
| FR-8 | 410 응답에 `{ code: 'ENDPOINT_DORMANT', revivable: true }`를 담는다 | Should |
| FR-9 | `period=miniute`가 **422**다. 조용히 기본값으로 처리하지 않는다 | Must |
| FR-10 | watchlist 응답에 `currentPrice`·`priceChange24h`·`lastUpdated`를 포함한다 | Must |
| FR-11 | `market/overview`의 `limit=100`·정렬 5·순서 2·기간 7 필터를 **바꾸지 않는다**(변경 금지 목록) | Must |
| FR-12 | 알림 생성 API가 2종 외 `kind`를 받으면 **422**다 | Must |
| FR-13 | 알림 응답에 **금액이 없다** | Must |
| FR-14 | `portfolio/summary`가 3자산군 원화 합산 + `fxRateUsed` + `fxBasisCode`(`current_rate`)를 준다 | Must |
| FR-15 | `news`가 실데이터를 주고 없으면 빈 배열이다. **더미 0건** | Must |
| FR-16 | Swagger를 갱신한다. **제거된 경로의 Swagger 문서도 제거**한다 | Must |

## 하위 호환

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 유지 경로의 응답에 **필드 추가는 허용**, 제거·이름 변경은 프론트 동시 변경 | Must |
| FR-21 | `watchlist` 응답 필드 추가는 하위 호환이다 | Must |
| FR-22 | `period` 정정은 **프론트가 먼저** 바뀐 뒤 서버가 오타를 거부한다. 순서를 뒤집으면 차트가 깨진다 | Must |
| FR-23 | 기존 엔드포인트 응답 스냅샷 테스트를 둔다 | Must |

## Acceptance Criteria

- [ ] `POST /api/auth/invite/accept`가 등록되고 코드 없이 계정 생성이 불가하다
- [ ] 초대 실패 `reasonCode` 4종이 구분된다
- [ ] `check`가 상한 초과를 노출하지 않는다
- [ ] `POST /api/auth/register`가 404다
- [ ] `PATCH /api/users/password`·`DELETE /api/users/account`가 404다
- [ ] 동면 경로 5종이 **410 Gone**이고 1회 로그를 남긴다
- [ ] 410 응답에 `code: 'ENDPOINT_DORMANT'`가 있다
- [ ] `period=miniute`가 422다
- [ ] `period=minute`가 200이다
- [ ] watchlist 응답에 현재가·변동률이 있다
- [ ] `market/overview`의 `limit`·필터가 변경 전과 동일하다 (스냅샷 테스트)
- [ ] 알림 생성에 2종 외 `kind`를 주면 422다
- [ ] 알림 응답에 금액이 0건이다
- [ ] `portfolio/summary`가 3자산군 합산 + 환율 기준을 준다
- [ ] `news`가 실데이터를 주고 더미가 0건이다
- [ ] 제거된 경로의 Swagger 문서가 0건이다
- [ ] 유지 경로 응답 스냅샷이 하위 호환이다
- [ ] 1주 후 410 로그에 잔여 호출이 0건이다

## Dependencies

- **선행:** `SRV-REQ-008`(도메인) · `SRV-REQ-007`(정리) · `DB-REQ-001`
- **순서:** `FE-REQ-012`(F000 API)가 `period` 정정을 먼저 배포 → 서버가 오타 거부
- **소비:** `BFF-REQ-008`(F000 API)

## Open Questions

- 초대 수락 시 비밀번호를 받을지 매직링크로 할지. **비밀번호가 기본안**(기존 로그인 경로 유지).
- `check` 엔드포인트를 인증 없이 열면 코드 무차별 대입이 가능하다. **rate limit이 필요**하고, 사용자 ≤10명이면 IP 기준으로 충분하다.
- 410을 1주 후 무엇으로 바꿀지(`SRV-REQ-007` Open Question).
