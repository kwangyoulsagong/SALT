# Event Bus 규칙

`@repo/message-event-bus`는 MFE 간 느슨한 통신에만 사용한다. 일반 props, URL, API cache로 해결 가능한 상태는 event bus로 보내지 않는다.

## 사용 대상

- shell과 remote 간 일회성 알림.
- remote 간 독립적으로 반응해야 하는 사용자 액션.
- URL로 표현하기 어렵고 전역 store로 공유하면 결합이 커지는 이벤트.

## 사용 금지

- 서버 상태 동기화.
- 장기 보관해야 하는 application state.
- auth token, 개인정보, 민감 데이터 payload.
- remote 내부 컴포넌트 간 단순 props 전달 대체.
- 순서 보장이 필수인 workflow.

## Registry 필수

- 이벤트 이름과 payload 타입은 registry 파일에서만 정의한다.
- 문자열 event name을 컴포넌트에 직접 쓰지 않는다.
- registry 위치는 `packages/message-event-bus/src/events`를 권장한다.

```ts
export const EVENT_NAMES = {
  goalCreated: "goal.created",
  authLoggedOut: "auth.logged-out",
} as const;

export interface EventPayloadMap {
  [EVENT_NAMES.goalCreated]: { goalId: string };
  [EVENT_NAMES.authLoggedOut]: { reason: "manual" | "expired" };
}
```

## 네이밍

- 형식은 `{domain}.{past-tense-action}` 또는 `{domain}.{command}`.
- 예: `goal.created`, `portfolio.refreshed`, `auth.logged-out`.
- domain 없이 `update`, `change`, `click` 같은 이름 금지.
- 이벤트 이름 변경은 public API 변경으로 본다.

## 타입

- `publish`와 `subscribe`는 registry 기반 generic으로 타입 추론되어야 한다.
- `any` payload 금지.
- payload는 JSON-serializable object를 기본으로 한다.
- class instance, function, DOM node, React element를 payload로 보내지 않는다.

## 발행 규칙

- 발행자는 이벤트 발생 사실만 알린다. 구독자의 동작을 알면 안 된다.
- payload는 최소 정보만 담는다. 큰 목록/응답 전체를 보내지 않는다.
- API 성공 후 발행하는 이벤트는 mutation 성공 시점에만 발행한다.
- 같은 이벤트를 고빈도로 발행해야 하면 throttle/debounce 또는 batch를 적용한다.

## 구독 규칙

- 구독은 `useEffect`에서 등록하고 unmount 시 반드시 해제한다.
- 구독 callback은 idempotent하게 작성한다. lastEvent replay로 중복 호출될 수 있다.
- 구독자가 API refetch를 실행한다면 query key와 owner를 명확히 한다.
- 구독 callback 안에서 route 이동, toast, invalidate 같은 side effect는 최소화하고 분리한다.

## lastEvent 관리

- `lastEvents`는 replay 편의 기능이지만 메모리 보관소가 아니다.
- 큰 payload 이벤트는 lastEvent 저장 대상에서 제외하거나 발행 후 clear한다.
- 일회성 이벤트는 소비 후 `clearLastEvent`를 호출하는 정책을 둔다.
- user/session 전환 시 관련 lastEvent를 clear한다.

## SSR

- event bus는 browser 통신 채널이다.
- server render 결과가 event bus 상태에 의존하면 안 된다.
- `window` singleton 접근은 `typeof window !== "undefined"` guard를 유지한다.
- module top-level에서 browser-only side effect가 커지지 않게 한다.

## 현재 개선 기준

- `EventCallbak`, `EventMessage`, hook generic의 기본 `any`를 registry 기반 타입으로 바꾼다.
- `packages/message-event-bus` exports에 registry와 typed hook을 노출한다.
- 기존 사용처는 문자열 직접 입력 대신 `EVENT_NAMES.*`를 사용하도록 바꾼다.
- shell/remotes가 같은 이벤트 registry를 import하도록 한다.
