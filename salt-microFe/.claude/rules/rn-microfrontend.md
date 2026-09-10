---
globs: apps/mobile/**
---

# 모바일 마이크로프론트엔드 — 단계적 도입

모바일 MFE의 값은 웹과 다르다. 웹은 "한 도메인을 여러 배포로 쪼개기"이고, 모바일은 **"스토어 심사를 우회해서 화면을 배포하기"** 다.

토스 사례가 그 값을 보여준다([toss.tech 2024](https://toss.tech/article/react-native-2024)): Shared/Service 번들 분리, Metro 대신 **ESBuild**(빌드 1분 이내, tree-shaking, 캐시 일관성), CDN 배포로 **1초 배포**, **1~100% 카나리**, 파일시스템 로딩으로 **1초 이상 로딩 감축**, Hermes 사전 컴파일.

## 1. 그런데 우리는 토스가 아니다

| | 토스 | SALT |
|---|---|---|
| RN 플랫폼 전담 | **4명** (FE 3 + iOS 1) | 없음 |
| 서비스(사일로) 수 | 다수, 독립 배포 필요 | 기능 7개, 조직 하나 |
| 사용자 | 대규모 | **≤10명 (비공개·초대제)** |
| 자체 어드민·CDN·인프라 | 보유 | 없음 |

**같은 것을 처음부터 만들면 그 자체가 제품보다 커진다.** 그래서 단계로 나눈다.

## 2. Phase 1 (지금) — Expo + OTA 업데이트

MFE의 값 중 **가장 큰 것은 "스토어 심사 없이 배포"** 다. 그건 번들을 쪼개지 않아도 OTA로 얻는다.

- `expo-updates`로 JS 번들을 OTA 배포한다. 네이티브 변경이 없으면 스토어를 거치지 않는다.
- 채널·브랜치로 내부 테스트와 프로덕션을 분리하고, **점진적 롤아웃으로 카나리를 흉내낸다.**
- **Hermes를 켠다.** 사전 컴파일로 초기 로딩을 줄인다.
- 번들 분리는 **하지 않는다.** 화면 7개짜리 앱에서 동적 로딩의 이득이 설정 비용보다 작다.

Phase 1의 한계를 알고 쓴다: 전체 번들이 교체되므로 **한 기능만 배포할 수 없고**, 번들이 커지면 초기 다운로드가 길어진다.

## 3. Phase 2 (조건 충족 시) — Re.Pack 5 + Module Federation 2

Re.Pack 5는 **Webpack/Rspack + Module Federation 2를 RN에 가져오는 Metro 대체 도구**다([Re.Pack 5 발표](https://www.callstack.com/blog/announcing-re-pack-5-with-rspack-module-federation)). MF2의 동적 타입 힌트·Manifest·Federation Runtime·Runtime Plugin System을 RN 런타임에 통합했고 **웹과 같은 API**를 쓴다. 즉 토스가 자체 구축한 것의 제품화 버전이다.

### 도입 조건 — 셋 중 하나라도 생기면 검토한다

1. **번들 크기 때문에 초기 로딩이 예산을 넘는다** (`performance-rn.md`)
2. **릴리스 주기가 다른 기능이 생긴다** — 웹의 세금 zone과 같은 경계. 법령 파라미터만 바꿔 배포하고 싶어질 때
3. **화면이 20개를 넘는다** — 그때는 필요할 때만 받는 것이 이득이다

### 도입 시 지켜야 할 것

- 번들 경계는 **웹 zone 경계와 같은 기준**으로 정한다: 릴리스 주기 + 방문 빈도 + 코드 무게 세 조건 전부.
- 첫 후보는 `tax` 하나다. 웹에서 이미 같은 판단을 했다.
- Shared 번들에는 `react` · `react-native` · `@repo/ui-native` · `@repo/tokens`만 넣는다. 기능 코드가 Shared에 들어가면 분리의 의미가 없다.

### 알려진 제약 — 착수 전 확인 필수

**Re.Pack은 Expo를 공식 지원하지 않는다** ([repack#1396](https://github.com/callstack/repack/issues/1396), [discussion #1309](https://github.com/callstack/repack/discussions/1309)). Phase 1을 Expo로 시작하면 Phase 2에서 둘 중 하나를 골라야 한다.

- **bare RN으로 내려온다** — Expo prebuild를 이미 쓰고 있으므로 이관 가능하지만 EAS 빌드·OTA를 잃는다
- **커뮤니티 조합을 쓴다** — Expo + Re.Pack 예제가 존재하나([expo-repack-federation](https://github.com/MuhammedBasith/expo-repack-federation)) 공식 지원이 아니다

Metro에 MF 지원을 넣는 이슈가 열려 있다([metro#1480](https://github.com/facebook/metro/issues/1480)). **그것이 들어오면 Phase 2의 비용이 크게 낮아진다** — 도입 판단 전에 상태를 확인한다.

## 4. 하지 않는 것

- **자체 번들 어드민·CDN·카나리 인프라를 만들지 않는다.** 토스는 전담 4명이 있었다. 우리는 `expo-updates`가 주는 것으로 시작한다.
- **Phase 1에서 번들을 쪼개지 않는다.** 조건(§3) 없이 쪼개면 설정만 늘고 배포가 느려진다.
- **네이티브 변경을 OTA로 내보내지 않는다.** 네이티브가 바뀌면 스토어 빌드다. 버전 게이트(F007)가 그것을 강제한다.

## 5. 버전 게이트

OTA를 쓰면 **JS와 네이티브의 버전이 어긋날 수 있다.**

- 서버가 최소 지원 네이티브 버전을 응답에 담고, 앱이 그보다 낮으면 **업데이트 안내 화면**을 띄운다.
- OTA 번들에 네이티브 API 사용이 늘면 게이트를 올린다. 이 판정을 사람이 잊으므로 릴리스 체크리스트에 넣는다.
- 상세는 `RN-REQ-003`(릴리스)과 F007의 `device` 슬라이스.
