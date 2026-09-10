---
globs: apps/mobile/**
---

# React Native 앱 구조 — `apps/mobile`

iOS와 Android를 하나의 코드로 지원한다. 내부 구조는 **FSD**이고 웹과 슬라이스 이름을 공유한다(`layered-architecture.md` §4).

## 1. 웹 코드를 재사용하려 하지 않는다 — 무엇이 왜 안 되는가

| 자산 | RN 재사용 | 이유 |
|---|---|---|
| `packages/ui` (83 subpath) | **불가** | `@vanilla-extract/css`는 CSS를 만든다. RN에는 CSS가 없다 |
| `packages/ui/src/styles/tokens.css.ts` | **불가** | `createGlobalTheme(':root', …)` 호출이다. `:root`가 없다 |
| `@repo/tokens` (신규) | **가능** | 순수 TS 객체. 웹은 이것으로 `createGlobalTheme`을, RN은 `StyleSheet`를 만든다 |
| `@repo/core` (신규) | **가능** | 플랫폼 무관 `model`·`api`·`lib` |
| `entities/*/ui`, `features/*/ui` | **불가** | DOM 태그를 쓴다 |
| `entities/*/model`, `lib` | **가능** | `@repo/core`로 승격해 공유 |

**훅이 `apps/mobile` → `packages/ui` import를 차단한다.** 우회하지 말고 `packages/ui-native`에 만든다.

## 2. 구조

```
apps/mobile/
├── app.config.ts          Expo 설정 (번들 ID · 권한 · 스플래시)
├── ios/ android/          prebuild 산출물 — 손으로 고친 것은 config plugin 으로 옮긴다
└── src/
    ├── app/               초기화 — 프로바이더 · 내비게이터 등록 · 딥링크
    ├── pages/             화면 셸 (웹의 pages 와 같은 자리)
    ├── widgets/ features/ entities/ shared/
    └── native/            네이티브 모듈 래퍼 — 여기서만 플랫폼 API 를 만진다
```

`src/native/`가 추가된 이유: RN은 웹에 없는 능력(푸시·생체인증·파일 선택·클립보드)을 갖는다. 그 접근을 한 곳으로 모으면 슬라이스가 플랫폼을 모른다.

## 3. 플랫폼 분기는 `src/native`와 `shared/platform`에서만

```ts
// ✅ shared/platform/index.ts
export const platform = { isIOS: Platform.OS === 'ios', … };

// ❌ features/ask-coach/ui/Composer.tsx
if (Platform.OS === 'ios') { … }
```

- `Platform.OS` 직접 참조는 `shared/platform`과 `src/native` 밖에서 **금지**한다.
- 파일 확장자 분기(`Foo.ios.tsx` / `Foo.android.tsx`)는 `packages/ui-native`와 `src/native`에서만 쓴다.

## 4. 내비게이션 — 3탭 + 스택

웹과 같은 3탭 IA(`홈` / `코치` / `자산`)를 하단 탭바로 구현한다.

- 탭 3개를 **4개로 늘리지 않는다.** 새 기능은 탭 내부 스택으로 push한다.
- 세금은 웹에서 별도 zone이지만 **모바일에서는 자산 탭 내부 스택**이다. RN에는 zone 개념이 없다.
- 딥링크 스킴을 정의하고 푸시 알림이 그 경로로 들어온다(F007). 알림 2종: 세금 D-Day · 지표/추천 갱신.

## 5. `@repo/ui-native` — RN 디자인 시스템

`@repo/tokens`를 소비해서 만든다. 웹 `@repo/ui`와 **컴포넌트 이름을 같게** 맞춘다(`Button` · `Card` · `Badge` · `ChatBubble` · `ListRow` · `NumberText` …).

- 이름을 맞추는 이유는 코드 공유가 아니라 **사람이 두 앱을 넘나들 때 검색이 되게** 하기 위함이다.
- **접근성**: 터치 타깃 최소 44×44. `accessibilityRole`·`accessibilityLabel` 필수. 손익 색에 부호 문자(`+`/`−`) 병기.
- **폰트 크기 확대**(iOS Dynamic Type / Android font scale)에서 깨지지 않아야 한다. 금액은 잘리지 않고 줄바꿈한다.

## 6. 오프라인과 상태

모바일은 네트워크가 끊긴다. 웹에 없는 요구다.

| 대상 | 정책 |
|---|---|
| 홈 5블록 | 마지막 성공 응답을 캐시하고 `마지막 갱신 시각`을 표시한다 |
| 금액 화면(청구서·세금) | **캐시를 보여주되 "오프라인 · 시각 기준" 배너를 붙인다.** 낙관적 갱신 금지 |
| 코치 대화 | 전송 실패 시 입력을 보존하고 재시도 버튼을 준다. 대화 히스토리는 캐시 |
| mutation | 오프라인 큐를 만들지 않는다. 실패를 사용자에게 알리고 다시 누르게 한다 |

**오프라인 큐를 만들지 않는 이유:** 금액·세금 계산이 서버 상태에 의존하므로, 나중에 자동 전송되면 사용자가 결과를 확인하지 않은 채 상태가 바뀐다.

## 7. 보안

- **토큰을 `AsyncStorage`에 두지 않는다.** iOS Keychain / Android Keystore(`expo-secure-store`)를 쓴다.
- 거래소 API 키를 **앱에 저장하지 않는다.** 등록은 서버가 하고 앱은 마스킹된 상태만 본다.
- 스크린샷 방지·루팅 탐지를 하지 않는다 — 비공개 초대제 앱이고 지키는 것보다 복잡도가 크다.
- 딥링크 파라미터를 신뢰하지 않는다. 화면 진입 후 서버로 재검증한다.

## 8. 빌드

- **Expo prebuild**를 쓴다. `ios/`·`android/`는 생성물이며 직접 수정한 것은 **config plugin으로 옮긴다.**
- turbo 태스크에 RN 빌드 outputs를 등록한다. `.next/**`만 있는 현재 설정으로는 캐시가 안 잡힌다.
- 릴리스 절차와 스토어 정책은 `RN-REQ-003`.
