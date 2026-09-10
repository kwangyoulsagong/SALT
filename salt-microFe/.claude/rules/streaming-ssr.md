# 스트리밍 SSR — 블록 단위로 흘려보낸다

App Router + RSC + Suspense로 **지연이 제각각인 블록을 각자 속도로** 보여준다. 근거와 측정 게이트는 `FE-REQ-008`에 있다.

## 1. 왜 쓰는가 — 우리 화면에서 값이 나오는 자리

| 화면 | 소스 | 가장 느린 것 | 스트리밍이 하는 일 |
|---|---|---|---|
| 홈 5블록 | 5개 | 청구서 스냅샷 미스 시 **~1.5s** | 총자산(~100ms)을 먼저 보여준다 |
| 세금 콕핏 | D-Day + 자산군 3 + 솔버 | 솔버 **~500ms** | D-Day 칩을 먼저 보여준다 |
| 청구서 | 스냅샷 + 현재가 보정 | 현재가 보정 | 스냅샷을 먼저 그린다 |

**값이 없는 자리:** 코치 대화의 토큰 스트림. 그건 첫 페인트 이후 계속 흐르므로 **SSE**가 맞다(`bff/.claude/rules/streaming-sse.md`). 스트리밍 SSR은 대화 화면의 첫 페인트만 담당한다.

## 2. 서버·클라이언트 경계

- **기본은 서버 컴포넌트다.** `"use client"`는 상호작용·브라우저 API·`useState`가 필요한 **잎**에만 붙인다.
- 데이터 조회는 서버 컴포넌트에서. **인증 토큰을 클라이언트로 내리지 않는다** — 쿠키에서 읽어 서버에서 BFF를 부른다.
- `"use client"` 경계를 넘는 props는 **직렬화 가능**해야 한다. 함수·클래스 인스턴스·`Decimal` 객체를 넘기지 않는다.
- 서버 컴포넌트에서 `Date.now()`·`Math.random()`으로 렌더 결과를 만들지 않는다. 시각은 서버가 준 ISO 문자열을 클라이언트가 포맷한다.
- 서버 컴포넌트에서 `window`·`localStorage`·`navigator` 접근 **0건**(`ssr.md`).
- vanilla-extract는 빌드 타임 CSS이므로 서버 컴포넌트에서 안전하다. `@repo/ui`의 상호작용 컴포넌트는 자기 파일에 `"use client"`를 갖는다.

### 클라이언트 전용

`lightweight-charts` · `TradingViewChart` · `MovableGrid` — `next/dynamic` + `ssr: false`.

## 3. Suspense 경계 설계

```tsx
// shared/ui/BlockBoundary.tsx
export function BlockBoundary({ name, skeleton, children }: Props) {
  return (
    <ErrorBoundary fallback={<BlockUnavailable name={name} />}>
      <Suspense fallback={skeleton}>{children}</Suspense>
    </ErrorBoundary>
  );
}
```

| 규칙 | 이유 |
|---|---|
| 블록마다 `Suspense` + error boundary | 부분 지연과 부분 실패를 함께 격리한다 |
| **경계는 화면당 5개 이하** | 많으면 레이아웃 시프트가 늘고 TTFB 이득이 사라진다 |
| **스켈레톤은 실제 블록과 같은 높이** | 스트리밍이 레이아웃 시프트를 만들면 이득이 상쇄된다 |
| 늦게 오는 블록에 `aria-busy`, 도착 시 해제 | 스크린리더가 "로딩 중"을 알아야 한다 |
| **`loading.tsx`를 블록 지연에 쓰지 않는다** | 라우트 전체가 스켈레톤이 된다. 그건 라우트 전환용이다 |

## 4. BFF 계약 — 웹은 블록별, 모바일은 1콜

`FEATURE-005 FR-4`의 "홈은 1콜"은 **클라이언트 워터폴 방지**가 근거였다. RSC에서는 서버가 병렬로 부르므로 그 근거가 사라진다.

그런데 **집계 엔드포인트를 없애지 않는다** — **RN에는 RSC가 없다.**

| 소비자 | 방식 |
|---|---|
| `apps/web` 홈 | 서버 컴포넌트가 **블록별 BFF 엔드포인트**를 각각 호출, 각각 `Suspense` |
| `apps/mobile` 홈 | **`GET /api/app/home` 집계 1콜** |
| BFF | 두 형태를 **같은 서비스 함수**에서 만든다. 집계는 블록 함수를 `allSettled`로 묶은 얇은 껍데기다 |

뷰모델 정의는 BFF 한 곳에 남는다. 계약을 두 번 만들지 않는다.

## 5. React Query와의 역할 분담

서버 컴포넌트가 첫 데이터를 준다. React Query는 **mutation과 실시간 갱신**만 담당한다(`fsd-app.md`). 서버에서 온 데이터를 클라이언트에서 이어 쓰려면 `HydrationBoundary`를 쓴다.

## 6. 측정 게이트 — 스트리밍을 쓸지 화면 단위로 판정한다

이관 전/후로 **첫 블록 페인트 시각**과 **마지막 블록 완료 시각**을 측정한다.

- 기준: **첫 블록 300ms 이내 + 총 완료 시간 악화 없음**
- 만족하지 못하는 화면은 스트리밍을 쓰지 않고 **1콜 집계로 되돌린다**
- 측정값을 `requirements/reports/checklists/`에 남긴다. 없으면 다음 사람이 되돌린다

## 7. 번들 감시

`"use client"` 경계를 잘못 두면 클라이언트 번들이 커진다. 이관 전/후 클라이언트 JS gzip 크기를 기록하고 **증가분 40KB 이하**를 유지한다.

경계가 의심되면 확인한다: 그 컴포넌트가 정말 상호작용을 갖는가, 아니면 **상호작용하는 잎만 떼어낼 수 있는가.**
