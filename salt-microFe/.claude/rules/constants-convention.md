# 상수 추출 규칙

## 기본 원칙

상수는 "관리 포인트"일 때만 추출한다. 단순 수치를 모두 상수화하지 않는다.

## 상수로 추출

- 요구사항에 "설정값", "관리 포인트", "상수로 관리"가 명시된 값.
- 비즈니스 제약: 최대 개수, timeout, threshold, 보관 기간.
- 사용자 노출 문구: placeholder, empty message, error message.
- API path prefix, query key, event name.
- 두 개 이상 파일에서 같은 의미로 반복되는 값.

## 인라인 유지

- 단일 컴포넌트의 padding, gap, width, radius 등 layout 수치.
- 구현 세부값: input rows, 내부 z-index, 임시 animation duration.
- 같은 숫자라도 의미가 다른 값.

## 배치

- 앱 공통: `src/constants`.
- 도메인 전용: `src/domains/{domain}/constants`.
- MFE event name: `packages/message-event-bus`.
- 디자인 토큰: `packages/ui/src/styles/tokens.css.ts`.

## 네이밍

- business 상수는 `SCREAMING_SNAKE_CASE`.
- query key factory는 `{domain}Keys`.
- event name은 도메인과 동작이 드러나게 작성한다.
