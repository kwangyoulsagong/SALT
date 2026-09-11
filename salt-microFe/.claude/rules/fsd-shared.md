---
globs: apps/*/src/shared/**
---

# shared 레이어 (Layer 0 — 최하위)

## 허용 Import

- 외부 npm 패키지 · `@repo/tokens` · `@repo/ui`(웹) · `@repo/ui-native`(모바일) · `@repo/core` — 허용
- `@/entities` · `@/features` · `@/widgets` · `@/pages` · `@/app` — **절대 금지**

## 구조 — 슬라이스가 아닌 flat 세그먼트

```
shared/
├── api/       HTTP 클라이언트 · 인터셉터 · 에러 정규화 · queryClient · SSE 클라이언트
├── config/    상수 · 환경 설정값 · 라우트 경로 · zone 경로 목록
├── i18n/      사용자 노출 문구 전부. 화면 문구를 컴포넌트에 하드코딩하지 않는다
├── lib/       유틸리티 · 포맷터(금액·날짜·퍼센트) · 외부 라이브러리 래퍼
├── model/     공통 타입 · enum (자산군 · 통화 · 상태)
├── ui/        앱 전용 원자 컴포넌트 — 디자인 시스템에 없는 것만
└── index.ts
```

공개 단위는 **세그먼트**다: `@/shared/api` · `@/shared/config` · … . 그 안쪽 경로
(`@/shared/lib/formatPrice`)를 직접 찌르지 않는다. 예외는 `*.css` 토큰 모듈 하나다
(`layered-architecture.md` §3).

## 원칙

- **도메인 무관한 코드만.** 도메인 특화 로직은 `entities`로 내린다. `shared/lib/formatTaxDeadline.ts`가 생기면 그건 `entities/tax/lib/`의 것이다.
- 모든 레이어가 의존하므로 export 안정성을 유지한다. breaking change의 영향 범위가 가장 넓다.
- **`shared/ui`는 최후의 수단이다.** 컴포넌트가 필요하면 먼저 `@repo/ui`(공개 subpath 83개)를 확인하고, 없으면 **디자인 시스템에 추가하는 것을 우선 검토**한다.
- **`shared/api`가 BFF 호출의 유일한 경로다.** `fetch`를 슬라이스에서 직접 부르지 않는다. 토큰 부착·에러 정규화·타임아웃·재시도가 여기 한 곳에 있어야 한다.
- **`shared/config`에 zone 경로 목록을 둔다.** zone을 넘는 링크는 `<a>`여야 하므로(`microfrontend.md`) 어떤 경로가 다른 zone인지 한 곳에서 알아야 한다.

## 금액 포맷은 여기 있고, 계산은 여기 없다

`shared/lib/formatKrw.ts`는 허용된다 — 표시 규칙이다.
`shared/lib/calculateTaxableBase.ts`는 **금지**다 — 금액 계산은 서버가 한다(전 영역 공통 수용 기준).

프론트에서 금액을 계산하는 코드가 생기면 그것은 서버 계약이 부족하다는 신호다.

## i18n — 여기 있는 것과 슬라이스에 있는 것

`shared/i18n`에는 **도메인과 무관한 문구**만 둔다: HTTP 에러(`HTTP_ERROR_MESSAGE`·
`TOAST_MESSAGES`·`ERROR_MESSAGE`), 블록 경계의 로딩/실패 문구, 내비게이션 상태 문구.

**슬라이스 문구는 그 슬라이스의 `model/messages.ts`에 있다** — `MARKET_MESSAGES`·
`GOAL_MESSAGES`·`PORTFOLIO_MESSAGES`·`AUTH_MESSAGES`·`SIGN_IN_MESSAGES`·`ADD_GOAL_MESSAGES`.

> **왜 한 파일이 아닌가 (2026-09-11, `FE-REQ-009`).** 도메인 문구를 `shared`로 올리면
> `shared`가 도메인을 알게 되고(이 문서 첫 줄과 정면으로 충돌한다), 슬라이스를 지울 때
> 문구만 남는다. `i18n-policy.md`가 요구하는 검수는 **"한 파일"이 아니라 "컴포넌트 밖"**
> 이면 성립한다 — 확신 표현·목표주가·2인칭 평가 검사는 `**/model/messages.ts` +
> `shared/i18n` grep 하나로 끝난다.

문구 정책(확신 표현 금지 · 목표주가 금지 · 2인칭 인격 평가 금지)은 `i18n-policy.md`를 따른다.
