---
id: SLICE-F000-INVITE-ONBOARDING
title: "F000 초대 코드 · 온보딩 3스텝 — 서버·BFF·프론트 수직 슬라이스"
priority: high
labels: [F000, slice, cross-area, contract, auth, invite, onboarding]
created: 2026-09-18
---

## Summary

**초대 코드 없이 계정이 생기지 않게 한다.** 지금은 `POST /api/auth/register` 가 이메일만
받으면 누구에게나 계정을 준다 — 공통 수용 기준(마스터 인덱스 §6 "초대 코드 없이 계정이
생성되지 않는다")을 **정면으로 어기는 경로가 열려 있다**. 이 슬라이스는 그 경로를 닫고,
초대 코드 수락과 온보딩 3스텝을 서버 → BFF → 프론트로 관통시킨다.

## Background

- 앞선 슬라이스(`F000-watchlist-tab-slice.md`)가 관심 종목 탭을 관통시켰다. 그 뒤
  **in-progress 인 F000 REQ 다섯 개가 전부 같은 곳에서 멈춰 있다** — `SRV-REQ-008`
  FR-1~7·10~14 · `SRV-REQ-009` 초대 3경로 · `BFF-REQ-007` G절 · `BFF-REQ-008` 온보딩 3개 ·
  `FE-REQ-010` FR-20~26. 다섯 문서가 한 기능을 가리키고 있어서 다음 슬라이스가 이것이다.
- 영역을 넘는 이유는 **계약 신설**이다(`pr-convention.md` §7). 서버가 경로 셋을 열고,
  BFF 가 프론트 대면 계약 셋을 열고, 프론트가 그것을 소비한다. 영역별로 자르면 세 PR 중
  어느 것도 혼자 동작하지 않는다.
- `auth` 는 **레지스트리에 있으나 아직 DDD 컨텍스트가 없는** 유일한 F000 컨텍스트다
  (`src/modules/auth` 4파일 패턴). 초대 검증이 새 도메인 로직이므로 여기서 컨텍스트가 선다.

## 범위 — 각 REQ 의 어느 FR 인가

| 영역 | REQ | FR | 내용 |
|---|---|---|---|
| DB | `DB-REQ-001` (부분) | — | `InviteCode` 모델 + 마이그레이션. **`AssetType` 3값 확장은 범위 밖** |
| 서버 | `SRV-REQ-008` | FR-1~7 | `AcceptInviteCode` 검증 4개 · 도메인 예외 4종 · `UserCountProbe` · 원자적 사용 · 상한 설정값 · 실패 기록 |
| 서버 | `SRV-REQ-008` | FR-10~14 | 인증 축소(`Login`·`RefreshSession` 유지, `Register`·`ChangePassword`·`DeleteAccount` 제거) · 온보딩 3단계 판정 |
| 서버 | `SRV-REQ-009` | FR-1~6 | `POST /api/auth/invite/accept` · `GET /api/auth/invite/check` · `GET /api/onboarding/status` · 제거 3경로 404 |
| 서버 | `SRV-REQ-009` | FR-16 (부분) | 제거된 경로의 Swagger 문서 제거 |
| BFF | `BFF-REQ-007` | FR-60~64 | proxy `register` 제거 · 온보딩 3라우트 · `check` 무인증 + rate limit · `403` + `reasonCode` 전달 |
| BFF | `BFF-REQ-008` | 신규 표 | `GET /api/app/onboarding/invite/check` · `POST /api/app/onboarding/invite` · `GET /api/app/onboarding/status` |
| 프론트 | `FE-REQ-010` | FR-20~26 | 온보딩 3스텝 화면 · `ProgressStepper` · 입력 중 검증 · `reasonCode` 3문구 · 홈 온보딩 카드 1개 · 붙여넣기 |
| 프론트 | `FE-REQ-010` | FR-64 | `ProgressStepper` 에 `aria-current="step"` |

## 범위 밖 — 같은 REQ 안이지만 이 브랜치가 아니다

| 항목 | 왜 |
|---|---|
| 동면 route 410 Gone (`SRV-REQ-009` FR-7·8, `BFF-REQ-007` A절) | 별 판단이다. 되살리기 테스트와 1주 로그 수집이 따라오고, 초대와 한 커밋에 섞으면 리뷰어가 둘 중 하나를 못 본다 |
| 홈 조립 재작성 (`BFF-REQ-007` B절) | 동면 소스 제거가 선행이다. A절과 같이 움직인다 |
| 알림 2종 축소 (`SRV-REQ-008` FR-20~25 · `BFF-REQ-007` C절) | `notification` 컨텍스트가 서야 한다. 독립 슬라이스 |
| `AssetType` 3값 (`SRV-REQ-008` FR-32) | `ALTER TYPE` 락 측정이 따라온다. `DB-REQ-003` |
| 계좌 연결 **실제 동작**(업비트 CSV · KIS) | `ledger` 컨텍스트(F001)다. 온보딩 2스텝은 **판정과 안내만** 하고 연결 화면은 F001 이 만든다 |
| 월 적립액 **설정 저장소** | `plan` 컨텍스트(F003)다. 2026-09-18 현재 `goal`(목표 저축) 존재 여부로 판정한다 — 아래 "판정 대체" 참조 |
| 초대 코드 **발급 화면** | `FEATURE-000` FR-23 이 시드로 충분하다고 정했다. 시드 스크립트만 둔다 |

## 계약

### 서버 `POST /api/auth/invite/accept` (신규 · 무인증)

```jsonc
// 요청
{ "code": "SALT-XXXX-XXXX", "email": "a@b.c", "nickname": "무민", "password": "********" }
// 200
{ "success": true, "data": { "accessToken": "…", "refreshToken": "…", "user": { … } } }
// 403 — reasonCode 4종
{ "success": false, "code": "INVITE_NOT_FOUND" | "INVITE_ALREADY_USED" | "INVITE_EXPIRED" | "INVITE_QUOTA_EXCEEDED",
  "message": "…" }
```

### 서버 `GET /api/auth/invite/check?code=` (신규 · 무인증 · rate limit)

```jsonc
{ "success": true, "data": { "valid": false, "reasonCode": "not_found" | "used" | "expired" } }
```

**상한 초과(`quota`)를 노출하지 않는다**(`SRV-REQ-009` FR-4). 상한이 찼을 때 `check` 는
코드 자체가 멀쩡하면 `valid: true` 를 주고, 실제 차단은 `accept` 가 한다.

### 서버 `GET /api/onboarding/status` (신규 · 인증)

```jsonc
{ "success": true, "data": {
  "complete": false,
  "nextStep": "link_account",
  "steps": [{ "key": "invite", "done": true }, { "key": "link_account", "done": false },
            { "key": "set_plan", "done": false }]
}}
```

### BFF — 프론트 대면 (신규 3)

`GET /api/app/onboarding/invite/check?code=` → `{ valid, reasonCode? }` (무인증 · rate limit)
`POST /api/app/onboarding/invite` → `{ accessToken, refreshToken, user }` / `403 { reasonCode }`
`GET /api/app/onboarding/status` → `OnboardingStatusViewModel` (인증)

**BFF 는 `reasonCode` 를 문장으로 바꾸지 않는다.** 문구는 프론트 `shared/i18n` 이 만든다
(`BFF-REQ-008` FR-9).

## 판정 대체 — 온보딩 3스텝이 아직 없는 컨텍스트를 본다

`SRV-REQ-008` FR-14 는 `ledger`·`plan` 의 공개 API 를 쓰라고 했다. **둘 다 없다**(F001·F003).
`onboarding` 조합 컨텍스트는 그 자리를 **주입받는 프로브 두 개**로 두고, 조립 지점에서
지금 있는 것을 꽂는다.

| 스텝 | REQ 가 말한 소스 | 지금 꽂는 것 | 언제 바뀌나 |
|---|---|---|---|
| `invite` | `auth` | 인증된 요청 = 초대 수락 완료 | — |
| `link_account` | `ledger` 거래 존재 | `portfolio.countTransactions > 0` | F001 `ledger` |
| `set_plan` | `plan` 설정 존재 | `goal` 행 존재 | F003 `plan` |

**조합 컨텍스트는 `domain` 을 갖지 않는다**(`server-architecture.md` §2). 프로브는 Port 가
아니라 `application` 이 받는 함수 타입이고, 구현은 `composition.ts` 에 있다.

## Acceptance Criteria

- [ ] `POST /api/auth/register` 가 **404** 다
- [ ] `PATCH /api/users/password` · `DELETE /api/users/account` 가 404 다
- [ ] 제거된 세 경로의 Swagger 문서가 0건이다
- [ ] `AcceptInviteCode` 가 존재·미사용·미만료·상한 **넷 다** 검증한다
- [ ] 도메인 예외 4종이 각각 `code` 와 `ErrorKind` 를 갖고 403 으로 나간다
- [ ] `auth` 도메인이 `User` 테이블을 직접 세지 않는다 (`UserCountProbe` 경유)
- [ ] 같은 코드를 **동시에** 쓰면 하나만 성공한다
- [ ] 계정 상한이 설정값이다 (코드 상수 0건)
- [ ] `check` 가 **상한 초과를 노출하지 않는다**
- [ ] 온보딩 3단계가 계산되고 `nextStep` 이 첫 미완료 단계를 가리킨다
- [ ] BFF 온보딩 3라우트가 동작하고 `check` 가 무인증 + rate limit 이다
- [ ] BFF 가 초대 `403` + `reasonCode` 를 **그대로** 올린다 (문장 생성 0건)
- [ ] 프론트 온보딩 3스텝이 완주되고 `ProgressStepper` 가 `aria-current="step"` 을 준다
- [ ] 코드 입력 중 유효성이 표시되고 **상한 초과 문구가 0건**이다
- [ ] 실패 `reasonCode` 3종이 각각 다른 문구다
- [ ] 코드 입력이 붙여넣기 · 자동 대문자화 · 공백 제거를 처리한다
- [ ] 온보딩 미완료면 홈에 **카드 1개**만 나온다 (블록별 중복 안내 0건)
- [ ] 세 영역 빌드·타입체크·lint 통과, `layer-check` 위반 0건

## Notes

- 검증 결과는 `requirements/reports/checklists/F000-invite-onboarding.md` 에 남긴다.
- `auth` 컨텍스트가 이 슬라이스에서 처음 선다. `modules/auth` 는 **삭제**한다 — `news`·
  `market`·`portfolio`·`coach` 이관과 같은 방식이고, 남겨 두면 로그인 경로가 두 벌이 된다.
