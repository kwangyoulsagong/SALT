# 도메인 아키텍처 규칙

## 기본 원칙

- 이 레포는 앱 경계, 도메인 경계, 공유 패키지 경계를 기준으로 분리한다.
- 도메인은 사용자 기능 또는 비즈니스 개념 기준으로 나눈다. 예: `portfolio`, `market`, `goal`, `feed`, `alert`.
- 도메인 폴더는 필요할 때만 만든다. 단순 페이지 1개짜리 기능은 기존 `src/components`, `src/api`, `src/hooks` 구조를 유지한다.

## 권장 구조

```text
src/
  pages/
  components/ 또는 component/
  domains/
    portfolio/
      components/
      api/
      hooks/
      store/
      types/
      constants/
      utils/
      index.ts
  api/
  hooks/
  store/
  styles/
  constants/
  utils/
  types/
```

## 배치 기준

- `pages/`: Next 라우트, SSR 함수, 페이지 조합. 비즈니스 로직 최소화.
- `domains/{domain}/components`: 특정 도메인 화면/섹션/카드.
- `domains/{domain}/api`: 해당 도메인의 서비스 함수와 query/mutation hook.
- `domains/{domain}/hooks`: UI와 도메인 로직을 연결하는 hook.
- `domains/{domain}/store`: 해당 도메인의 클라이언트 상태.
- `domains/{domain}/types`: API DTO, UI 모델, 도메인 타입.
- `components/`: 앱 전역에서 재사용되는 앱 전용 컴포넌트.
- `packages/ui`: 여러 앱에서 재사용되는 디자인 시스템 컴포넌트.

## 의존 규칙

- 같은 앱 안에서는 `pages → domains/components/hooks/api/store/utils` 방향으로 조합한다.
- 도메인끼리 직접 깊은 import를 반복하지 않는다. 공통 계약은 앱 공통 폴더나 `packages/*`로 올린다.
- shell 전용 코드를 remote에서 import하지 않는다.
- remote 전용 코드를 shell에서 직접 파일 경로로 import하지 않는다. shell은 federation exposed module만 소비한다.
- 도메인 `index.ts`는 공개 API만 re-export한다. 내부 구현 파일 전체를 무분별하게 열지 않는다.

## 승격 기준

- 한 앱에서만 쓰면 앱 내부에 둔다.
- 두 앱 이상에서 UI로 반복되면 `packages/ui`.
- 두 앱 이상에서 메시지/이벤트 계약으로 반복되면 `packages/message-event-bus`.
- mock fixture가 여러 앱에서 필요하면 `packages/mocks`.
- 타입만 공유해야 하면 새 패키지보다 기존 패키지의 contract 파일을 우선 검토한다.

## 금지

- 기존 앱 구조와 무관한 새 레이어 폴더 생성 금지.
- `apps/*/src` 간 직접 import 금지.
- route 파일에 API 세부 구현, store mutation, 복잡한 계산을 직접 작성 금지.
- 편의를 위한 대형 `utils/index.ts` 덤프 금지.
