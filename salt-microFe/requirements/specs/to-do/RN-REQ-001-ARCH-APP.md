---
id: RN-REQ-001
area: rn
kind: ARCH
title: "React Native 앱 신설 — iOS + Android, FSD, packages/tokens 추출"
priority: high
labels: [architecture, react-native, ios, android, expo, fsd, design-system]
created: 2026-09-09
---

## Summary

`salt-microFe/apps/mobile`에 React Native 앱을 만든다. **iOS와 Android를 하나의 코드로** 지원한다. 내부 구조는 **FSD**이고 슬라이스 이름을 웹·서버와 공유한다. 웹 디자인 시스템은 재사용할 수 없으므로 **`packages/tokens`(플랫폼 중립)를 추출하고 `packages/ui-native`를 새로 만든다.**

## 왜 모바일이 필요한가

이 제품이 답하는 결정 네 개는 전부 **시점이 있는 결정**이다.

| 결정 | 시점 | 모바일이 필요한 이유 |
|---|---|---|
| 이번 주 얼마 넣을까 | 월요일 아침 | 데스크톱 앞이 아니다 |
| 지금 뭘 할까 | 시장이 움직일 때 | 알림을 받고 즉시 본다 |
| 언제까지 팔아야 하나 | D-Day 임박 | **푸시 알림이 없으면 마감을 놓친다** |
| 내가 뭘 잘못했나 | 매매 직후 | 거래소 앱에서 나온 직후다 |

특히 세금 마감(F002)은 **D-30/14/7/3/1 알림**이 기능의 일부다. 웹만 있으면 그 알림이 도달하지 않는다.

## 웹 코드를 재사용할 수 없다 — 무엇이 왜 안 되는가

| 자산 | RN 재사용 | 근거 |
|---|---|---|
| `packages/ui` (공개 subpath 83) | **불가** | `@vanilla-extract/css`가 CSS를 만든다. RN에 CSS가 없다 |
| `packages/ui/src/styles/tokens.css.ts` | **불가** | `createGlobalTheme(':root', {...})` 호출이다. `:root`가 없다 |
| `entities/*/ui`, `features/*/ui` | **불가** | DOM 태그를 쓴다 |
| `entities/*/model`, `lib` | **가능** | 플랫폼 무관 |
| BFF 뷰모델 타입 | **가능** | 순수 타입 |

→ **`packages/tokens` 추출이 이 REQ의 선행이고 `FE-REQ-007` FR-30과 공동 항목이다.** 값을 순수 TS 객체로 빼고, 웹은 그것으로 `createGlobalTheme`을, RN은 `StyleSheet`를 만든다.

---

## 플랫폼 후보 4개를 비교했다

| | A. Expo (prebuild) | B. bare RN | C. Flutter | D. 웹 PWA |
|---|---|---|---|---|
| iOS+Android 하나의 코드 | ✓ | ✓ | ✓ | ✓ |
| 기존 React/TS 지식 재사용 | **✓** | ✓ | ✗ Dart | ✓ |
| `entities`/`model` 코드 공유 | **✓** | ✓ | ✗ | ✓ (그대로) |
| 초기 설정 비용 | **낮다** | 높다 | 중간 | 가장 낮다 |
| 네이티브 빌드·서명 | **EAS가 처리** | 직접 | 직접 | 없음 |
| OTA 업데이트 | **✓ expo-updates** | 직접 구현 | 제한적 | 해당 없음 |
| **푸시 알림** | ✓ | ✓ | ✓ | **iOS 제약** |
| Re.Pack MF (Phase 2) | **✗ 공식 미지원** | ✓ | 해당 없음 | 해당 없음 |
| 조직 역량 | React/TS | React/TS | **없음** | React/TS |

### D를 버린 이유 — 가장 싼 후보

웹 PWA면 앱을 안 만들어도 된다. 화면을 두 번 구현하지 않는다.

**안 되는 것:** **iOS의 웹 푸시 제약**이 이 제품의 핵심 기능을 막는다. 세금 D-Day 알림(F002 FR-6)과 지표/추천 갱신 알림이 도달하지 않으면 "마감일을 놓치지 않게 해준다"는 약속을 못 지킨다. 홈 화면 추가를 사용자에게 요구하는 것도 초대제 10명에게조차 마찰이다.

### C를 버린 이유
Dart를 새로 배워야 하고 `entities/model`을 공유할 수 없다. **화면 로직을 두 번 구현하는 것에 더해 도메인 타입까지 두 번 정의**하게 된다. 조직에 Flutter 역량이 없다.

### B를 버린 이유 (Phase 1에서는)
bare RN은 Re.Pack + Module Federation 2를 쓸 수 있어 **Phase 2의 길이 열려 있다.** 그게 유일한 장점이고 실제로 크다.

**안 되는 것:** 네이티브 빌드·서명·프로비저닝을 직접 관리해야 한다. **조직에 iOS/Android 전담이 없다.** 토스는 RN 플랫폼 팀이 4명(FE 3 + iOS 1)이었다. 우리는 0명이다.

### A가 우리에게 맞은 이유 3개

1. **네이티브 빌드·서명을 EAS가 처리한다.** 전담 없이 iOS·Android를 낼 수 있는 유일한 선택이다.
2. **`expo-updates`가 MFE의 가장 큰 값을 대체한다.** MFE로 얻고 싶은 것은 "스토어 심사 없이 배포"이고, OTA가 그걸 준다(`RN-REQ-002` Phase 1).
3. **`prebuild`를 쓰면 bare로 내려올 길이 남는다.** managed workflow에 갇히지 않는다. Phase 2에서 Re.Pack이 필요해지면 `ios/`·`android/`가 이미 있다.

> **알려진 대가:** Re.Pack은 Expo를 공식 지원하지 않는다([repack#1396](https://github.com/callstack/repack/issues/1396)). Phase 2로 갈 때 bare RN으로 내려오거나 커뮤니티 조합을 써야 한다. `RN-REQ-002` §3에 그 판단 조건을 적었다. **Metro에 MF 지원이 들어오면**([metro#1480](https://github.com/facebook/metro/issues/1480)) 이 대가가 사라진다.

---

## Requirements

### A. 앱 신설

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `apps/mobile`을 pnpm workspace(`apps/*`)에 추가한다. Expo + **prebuild**(managed 아님) | Must |
| FR-2 | iOS와 Android 둘 다 실기기에서 기동한다. 번들 ID·패키지명·권한·스플래시를 `app.config.ts`에 둔다 | Must |
| FR-3 | `ios/`·`android/`는 **생성물**이다. 직접 수정한 것은 **config plugin으로 옮긴다** | Must |
| FR-4 | turbo에 RN 태스크와 outputs를 등록한다. 현재 `turbo.json`의 outputs가 `.next/**`뿐이라 캐시가 안 잡힌다 | Must |
| FR-5 | Node 22 / pnpm 8.15.4 환경에서 동작한다 | Must |

### B. `packages/tokens` 추출 (FE-REQ-007 FR-30과 공동)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | `packages/tokens`를 신설한다. **순수 TS 객체**. `@vanilla-extract/css`를 import하지 않는다 | Must |
| FR-11 | 현재 `tokens.css.ts`의 값(radius 8 · colors · typography · spacing …)을 그대로 옮긴다. **값을 바꾸지 않는다** — 색 토큰은 변경 금지 목록이다 | Must |
| FR-12 | 웹은 `packages/tokens`의 값으로 `createGlobalTheme`을 만든다. `@repo/ui`의 기존 `vars` export를 유지해 **소비처가 깨지지 않게** 한다 | Must |
| FR-13 | RN은 `packages/tokens`의 값으로 `StyleSheet`를 만든다 | Must |
| FR-14 | 웹 폰트 로딩(`globalFontFace`)은 웹 어댑터에 남긴다. RN은 번들 폰트를 쓴다 | Must |

### C. `packages/ui-native`

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `packages/ui-native`를 신설하고 `@repo/tokens`를 소비한다 | Must |
| FR-21 | **컴포넌트 이름을 웹 `@repo/ui`와 같게** 맞춘다. 코드 공유가 아니라 **사람이 두 앱을 넘나들 때 검색이 되게** 하기 위함이다 | Must |
| FR-22 | 1차 컴포넌트: `Button` · `Card` · `Badge` · `Chip` · `ListRow` · `ListGroup` · `NumberText` · `Skeleton` · `EmptyState` · `Banner` · `Divider` · `Spinner` · `TextField` · `TextArea` · `Stepper` · `BottomSheet` · `Dialog` · `Toast` · **`ChatBubble`** · `BottomTabBar` · `SegmentedControl` · `ProgressBar` | Must |
| FR-23 | 접근성: 터치 타깃 **최소 44×44**, `accessibilityRole`·`accessibilityLabel` 필수, 손익은 색 + **부호 문자(`+`/`−`)** 병기 | Must |
| FR-24 | **폰트 크기 확대**(iOS Dynamic Type / Android font scale)에서 깨지지 않는다. 금액은 잘리지 않고 줄바꿈한다 | Must |
| FR-25 | `MovableGrid`를 만들지 않는다. **PC 전용**이다 | Must |

### D. FSD 구조

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | `src/`를 6레이어로 만든다(`FE-REQ-009` FR-1과 동일) + **`src/native/`** 추가 | Must |
| FR-31 | `src/native/`는 네이티브 모듈 래퍼 전용이다. **여기서만 플랫폼 API를 만진다** | Must |
| FR-32 | `Platform.OS` 직접 참조는 `shared/platform`과 `src/native` **밖에서 금지**한다. 훅이 차단 | Must |
| FR-33 | 슬라이스 이름은 레지스트리를 따른다. 모바일 전용 슬라이스는 **`device`** 하나다 | Must |
| FR-34 | `apps/mobile`이 `packages/ui`를 import하면 **훅이 차단**한다(`FE-REQ-009` FR-24) | Must |

### E. `packages/core` 공유 범위

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | `packages/core`를 신설하고 **BFF 뷰모델 타입**을 먼저 넣는다. 두 앱이 같은 계약을 본다 | Must |
| FR-41 | 플랫폼 무관 `lib`(금액·날짜·퍼센트 포맷터, D-Day 계산)을 넣는다 | Must |
| FR-42 | **`api` 공유 여부를 결정한다.** RN이 React Query를 쓰면 조회 훅을 공유할 수 있다. 안 쓰면 `shared/api`(fetch 래퍼)만 공유한다 → Open Question | Should |
| FR-43 | `packages/core`는 React·React Native·DOM에 의존하지 않는다. **순수 TS만** | Must |

### F. 내비게이션과 화면

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 하단 탭 **3개**(`홈` / `코치` / `자산`). 웹과 같은 IA. **4개로 늘리지 않는다** | Must |
| FR-51 | 세금은 **자산 탭 내부 스택**이다. RN에는 zone 개념이 없다 | Must |
| FR-52 | 딥링크 스킴을 정의한다. 푸시 알림이 그 경로로 들어온다(F007) | Must |
| FR-53 | 딥링크 파라미터를 신뢰하지 않는다. 화면 진입 후 서버로 재검증한다 | Must |

### G. 보안과 오프라인

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | **토큰을 `AsyncStorage`에 두지 않는다.** iOS Keychain / Android Keystore(`expo-secure-store`) | Must |
| FR-61 | 거래소 API 키를 **앱에 저장하지 않는다.** 등록은 서버가 하고 앱은 마스킹 상태만 본다 | Must |
| FR-62 | 오프라인: 마지막 성공 응답을 캐시하고 **`마지막 갱신 시각`을 표시**한다. 금액 화면은 "오프라인 · 시각 기준" 배너를 붙인다 | Must |
| FR-63 | **오프라인 큐를 만들지 않는다.** 나중에 자동 전송되면 사용자가 결과를 확인하지 않은 채 상태가 바뀐다 | Must |

## Non-Functional

| 구분 | 요구사항 |
|---|---|
| 성능 | `performance-rn.md` 예산. **콜드 스타트 2s(저가 Android 실기기)** · 리스트 60fps · JS 번들 4MB 이하 |
| 접근성 | FR-23·24. VoiceOver·TalkBack으로 총자산·추천 카드 낭독 확인 |
| 시각 일관성 | 웹과 **같은 토큰**을 쓴다. 색·라운드·타이포가 갈라지지 않는다 |
| 빌드 | `pnpm build`가 웹 zone 2개 + `packages/*`를 깨뜨리지 않는다. RN 빌드는 별도 태스크 |

## Acceptance Criteria

- [ ] `apps/mobile`이 iOS 실기기와 Android 실기기에서 기동한다
- [ ] `packages/tokens`가 존재하고 `@vanilla-extract/css`를 import하지 않는다
- [ ] 웹의 색·라운드·타이포가 토큰 추출 전후 **시각적으로 동일**하다 (스크린샷 비교)
- [ ] `packages/ui-native`에 FR-22의 컴포넌트 22종이 있다
- [ ] `apps/mobile`이 `packages/ui`를 import하면 훅이 차단한다
- [ ] `grep -rn "Platform.OS" apps/mobile/src` 결과가 `shared/platform`·`native`에만 있다
- [ ] 하단 탭이 정확히 3개다
- [ ] 토큰이 Keychain/Keystore에 저장되고 `AsyncStorage`에 0건이다
- [ ] 오프라인에서 홈이 캐시로 렌더되고 `마지막 갱신 시각`이 보인다
- [ ] 금액 화면 오프라인 배너가 있다
- [ ] 폰트 크기 최대 확대에서 금액이 잘리지 않는다
- [ ] 터치 타깃이 전부 44×44 이상이다
- [ ] VoiceOver·TalkBack으로 총자산이 낭독된다
- [ ] 콜드 스타트가 저가 Android 실기기에서 2s 이내다 (측정값 기록)
- [ ] `ios/`·`android/`에 손으로 수정한 흔적이 없다 (config plugin으로 대체)
- [ ] `pnpm build` 통과

## Trace

| FR | 산출물 | 검증 |
|---|---|---|
| FR-1~5 | `apps/mobile`, `app.config.ts`, `turbo.json` | 실기기 기동 |
| FR-10~14 | `packages/tokens` + 웹/RN 어댑터 | 스크린샷 비교 |
| FR-20~25 | `packages/ui-native` | 컴포넌트 목록 + a11y 검사 |
| FR-30~34 | FSD 6레이어 + `native/` | 구조 검사 + 훅 |
| FR-40~43 | `packages/core` | import 그래프 (React 의존 0) |
| FR-50~53 | 내비게이터 + 딥링크 | 탭 3개 + 딥링크 진입 |
| FR-60~63 | secure-store · 캐시 | 저장소 검사 + 오프라인 테스트 |

## Dependencies

- **선행:** `FE-REQ-007` FR-30(`packages/tokens` 추출) — **공동 항목이므로 함께 한다**
- **선행:** `feature/repo-ui-component` 브랜치 병합 — 토큰 추출의 원본이 그 브랜치에 있다
- **연동:** `BFF-REQ-006` — 집계 1콜 계약을 모바일이 소비한다
- **후속:** `RN-REQ-002`(MFE) · `RN-REQ-003`(릴리스) · F000~F007의 모든 RN REQ

## Open Questions

- **RN이 React Query를 쓰는가.** FR-42의 `api` 공유 범위가 여기서 갈린다. 웹은 서버 컴포넌트가 조회하므로 React Query 역할이 좁다. **RN은 조회도 클라이언트에서 하므로 React Query가 필요할 가능성이 높다** → 그러면 `entities/*/api`를 `packages/core`로 올려 공유할 수 있다.
- Expo SDK 버전과 RN 버전 고정. `packages/ui-native`가 그 버전에 묶인다.
- 푸시 알림 구현 방식 — Expo Notifications vs FCM/APNs 직접. **F007에서 결정**하되, Expo를 쓰기로 한 이상 Expo Notifications가 기본안이다.
- 기준 저가 Android 기기를 무엇으로 정할지. 성능 예산의 측정 기준이 된다.
