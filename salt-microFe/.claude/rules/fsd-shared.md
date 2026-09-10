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

## i18n

사용자 노출 문구는 전부 `shared/i18n`에 모은다. 현재 `constants/api.ts`에 섞여 있는 `HTTP_ERROR_MESSAGE`·`TOAST_MESSAGES`가 이관 대상이다.

문구 정책(확신 표현 금지 · 목표주가 금지 · 2인칭 인격 평가 금지)은 `i18n-policy.md`를 따른다. **한 곳에 모여 있어야 그 검수가 가능하다.**
