---
id: SLICE-F000-API-ERROR-NORMALIZE
title: "F000 슬라이스 — 웹 API 에러 모양 하나 · 재시도 판정 하나 · 차트 period enum"
priority: medium
labels: [F000, slice, fe, api, error]
created: 2026-10-28
---

## Summary

F000 알림 1종(`F000-notification-kind-gate`) 다음, 마스터 인덱스가 적은 Investment 쪽 다음 후보 둘 중
`AssetType` 3값은 F011 이 이미 닫았다(서버 DTO · 웹 enum 모두 `crypto` · `stock` · `kr_stock`, `us_stock` 은 미국 주식 착수 때 —
`DB-REQ-003` 2026-10-07 개정). 남은 것은 `FE-REQ-012` 의 A절 FR-2(`period` enum)와 E절(에러 정규화)이었다.

웹에는 슬라이스마다 에러 클래스가 하나씩(9개) 있었다. 모양이 제각각이라 "4xx 면 다시 부르지 않는다"를 코치 훅 10곳 · 국내 주식 쿼리에
다시 적었고, **전역 기본값은 4xx 도 두 번 더 불렀다** — 상세 차트 404 · 422 가 백오프 3초 뒤에야 실패로 보였다.
`shared/api` 에 `ApiError { status, code, retriable }` 하나를 두고 전부 옮겼다. **FE 만** — BFF · 서버 계약 변경 없음.

## 범위

| REQ | FR | 내용 |
|---|---|---|
| `FE-REQ-012` | A FR-2 | 코인 차트 `period` 를 `ChartPeriod` enum(`minute` · `day`)으로. 4종이 아니라 서버가 가진 2종 · 자리는 `entities/market/model`(도메인 값이라 `shared/config` 아님) |
| `FE-REQ-012` | E FR-41 · 42 · 43 · 44 | `ApiError` · `readApiError`(본문 `code` 만, `message` 안 읽음) · `apiFetch` 410 개발 경고 · 전 경로 서버 원문 미노출 |
| `FE-REQ-012` | F FR-51 일부 | `period` enum 완료(`alertKind` · `newsSentiment` 는 소비처가 없다) |
| 파일만 걸침 | `FE-REQ-009` · `010` · `011` · `024` · `026` · `028` · `034` · `035` · `038` · `039` · `040` · `041` · `042` | 에러 클래스 · 재시도 판정 교체. 판정(404 = 소유자 아님 · 429 = 잠시 후)은 그대로, 재시도 동작 변화는 아래 판단 3의 셋 |

## 판단 — 리뷰가 볼 곳

1. **슬라이스 클래스를 남기지(하위 클래스) 않고 지웠다** — 화면이 판단에 쓰는 것은 `status` · `code` 뿐이었다(`instanceof` 는 상태를 꺼내려는 용도). 하위 클래스를 두면 다음 슬라이스가 또 하나 만든다
2. **`retriable` = 5xx · 408. 429 는 `false`** — 전에는 전역 기본값이 429 도 1초 뒤 다시 불렀다. 다시 부를 시각은 서버가 `Retry-After` 로 정했다
3. **`TypeError` 는 다시 부르지 않는다** — 전역 기본값 그대로. 코치 훅들은 전에 한 번 더 불렀다(연결 실패도 `TypeError` 라 갈리지 않는다). 동작 변화는 이것과 2번(429) · 전역 4xx 재시도 중단 셋
4. **초대 거부 `InviteRejectedError` 는 남겼다** — `reasonCode` 는 도메인 사유다. `shared` 가 알면 안 된다
5. **FR-40(문구를 `shared/i18n` 으로) 은 이미 성립** — `HTTP_ERROR_MESSAGE` 등은 `@repo/core/http` 에 있고 `shared/i18n` 이 재수출한다. 웹 소비처 0건. 옮기면 RN(`@repo/core`)이 잃는다 → REQ 를 "재수출로 갈음"으로 정정

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 서버: 모르는 코인 **차트**가 500(`Failed to fetch minute chart data from Upbit`) | 어제 `ffc0732` 가 가격 · 감성만 404 로 고쳤다. 서버 변경은 명시 요청이 있어야 한다(루트 `CLAUDE.md`) | 사용자 지시 시 `SRV-REQ-009` 후속 |
| BFF 422(`chartPeriod` 미들웨어) · `AppError` 응답에 `code` 없음 | 계약 추가라 BFF 범위. 웹은 `code: null` 로 받는다 | `BFF-REQ-025` 후속 |
| `alertKind` · `newsSentiment` enum (FR-51) | 소비처(알림 화면 · 뉴스 감성)가 없다 | F006 `FE-REQ-030` · 뉴스 D-2절 |
| FR-50 · 53 타입 `packages/core` 공유 | `bff` workspace 밖 | `FE-REQ-024` |
| 운영 빌드에서 재시도 실측 | dev(StrictMode 이중 마운트)만 쟀다. 판정은 같은 함수다 | 배포 환경 확정 시 |
