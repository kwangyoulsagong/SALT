# 마이크로프론트엔드 규칙

## 역할

- `apps/shell`: host. 전역 레이아웃, 라우팅 진입점, remote composition, 공통 provider를 담당한다.
- `apps/goals`, `apps/investments`: remotes. 독립 실행과 shell 내 실행을 모두 지원한다.
- remote는 shell 내부 구현에 의존하지 않는다. 공유 계약은 `packages/*`에 둔다.

## Federation 계약

- `NextFederationPlugin.name`, `filename`, `remotes`, `exposes` 변경은 public API 변경으로 본다.
- remote entry 경로는 server/client를 모두 고려한다.
- server path: `/_next/static/ssr/remoteEntry.js`
- client path: `/_next/static/chunks/remoteEntry.js`
- `react`, `react-dom`은 singleton 유지.
- mutable app store를 singleton으로 공유하지 않는다. URL, props, event bus로 통신한다.
- expose는 route-level 또는 안정된 public module만 연다. 내부 컴포넌트 깊은 경로 expose 금지.

## 통신

- MFE 간 이벤트는 `@repo/message-event-bus`를 사용한다.
- 이벤트 이름과 payload 타입은 명시적으로 정의한다.
- event bus 상세 규칙은 `.claude/rules/event-bus.md`를 따른다.
- `window` custom event, localStorage polling, 전역 변수로 통신하지 않는다.
- URL query/path로 표현 가능한 상태는 URL을 우선 사용한다.

## 스타일 격리

- remote 내부 스타일을 shell global selector로 덮어쓰지 않는다.
- 재사용 UI는 `@repo/ui`와 Vanilla Extract class를 통해 전달한다.
- global style은 reset, font, CSS variable, shell layout 수준으로 제한한다.

## 장애 처리

- shell은 remote 로딩 실패, dev 서버 미기동, 네트워크 실패에 대한 fallback UI를 둔다.
- remote는 shell 없이도 로컬 `next dev`에서 주요 화면을 확인할 수 있어야 한다.
- remote public API 변경 시 shell 빌드를 같이 검증한다.

## Shell에서 Remote 소비

- shell route에서 remote를 직접 `React.lazy(() => import("remote/Module"))`로만 소비하지 않는다.
- Next.js Pages Router에서는 remote entry를 `next/dynamic`으로 감싸고 SSR 여부를 명시한다.
- SSR 가능한 remote는 server remote path 검증 후 `ssr`을 유지한다.
- browser-only remote는 `dynamic(..., { ssr: false, loading })`로 작게 격리한다.
- `<Suspense>` fallback만으로 remote 장애 처리를 끝내지 않는다. load failure fallback 또는 error boundary를 둔다.

## Provider 소유권

- shell provider와 remote provider의 책임을 문서화한다.
- shell 전역 provider: layout/auth/navigation/theme처럼 host가 소유하는 상태.
- remote 내부 provider: remote가 독립 실행에 필요한 query/store/form 상태.
- exposed module이 provider를 포함하는지, 순수 feature component인지 명확히 나눈다.
- 같은 React Query cache를 공유할 계획이 없으면 remote별 QueryClientProvider 중복은 허용하되 데이터 중복 fetch를 감수한 설계로 기록한다.
- 공유 cache가 필요하면 singleton 설정만으로 해결하지 말고 query owner와 hydration 전략을 먼저 정한다.

## Shared Dependency

- `react`, `react-dom`은 모든 앱에서 singleton.
- `@repo/message-event-bus`는 singleton.
- `@tanstack/react-query`, `@reduxjs/toolkit`, `react-redux`, `zustand`는 앱별 격리 또는 singleton 중 하나를 명시적으로 선택하고 모든 앱 설정을 맞춘다.
- 존재하지 않는 workspace package를 `transpilePackages`에 넣지 않는다.
- shared 설정 변경 시 shell, goals, investments의 `next.config.js`를 같이 비교한다.

## Remote Type 선언

- shell의 `src/types/*.d.ts`는 실제 configured remote/expose만 선언한다.
- 사용하지 않는 remote 선언은 제거한다.
- expose 이름 변경 시 type declaration, shell import, remote `next.config.js`를 같은 PR/작업에서 수정한다.

## 현재 레포 점검 결과

- shell은 `React.lazy`로 `goals/*`, `investments/*`를 소비한다. Next/MFE SSR 의도가 불명확하므로 `next/dynamic` 기반 규칙으로 정리해야 한다.
- shell과 remote가 각각 `QueryClientProvider`를 가진다. cache 공유/격리 의도가 문서화되어 있지 않다.
- `@tanstack/react-query` shared 설정이 shell과 remotes에서 다르다. singleton 여부를 결정하고 맞춰야 한다.
- `transpilePackages`에 `@repo/store`가 들어가지만 현재 workspace package가 없다. 제거 또는 패키지 생성 여부를 결정해야 한다.
- shell type declaration에 실제 remotes가 아닌 `game`, `social`, `missions`, `ranking`, `notification` 선언이 남아 있다.
- event bus는 `window` singleton을 사용한다. SSR top-level crash는 막고 있으나 payload 타입과 event name registry가 필요하다.

## 변경 체크

- expose 추가/변경: remote `next.config.js`, shell remote import, 독립 실행 경로 확인.
- shared dependency 변경: 세 앱의 `shared` 설정 일관성 확인.
- 새 remote 추가: 고유 port, federation name, shell remotes, README/AGENTS 업데이트.
