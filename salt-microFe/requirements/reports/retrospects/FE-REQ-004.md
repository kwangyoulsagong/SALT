---
id: FE-REQ-004
spec: ../../specs/done/FE-REQ-004.md
checklist: ../checklists/FE-REQ-004.md
title: "@repo/message-event-bus / @repo/mocks lint 복구 회고"
date: 2026-09-08
---

# FE-REQ-004 회고

## 무엇을 했나

두 패키지의 lint가 "경고 때문에" 실패한 게 아니라 **eslint가 실행조차 못 되고 크래시**하고 있었다. 실행 환경(eslint 버전)을 고치고, 그제서야 처음 검사된 실제 경고 4건을 수정했다. 루트 `pnpm lint`가 6/6 통과한다. 변경 파일 7개 + `pnpm-lock.yaml`.

## 잘된 점

- **증상이 아니라 원인을 봤다.** `--max-warnings`를 올리거나 lint 스크립트를 빼는 대신, "왜 8.57.1이 실행되지?"를 따라가 pnpm의 bin 링크 규칙(직접 선언한 dependency만 패키지 `.bin`에 링크)에 도달했다. 선언 한 줄로 두 패키지가 동시에 해결됐다.
- **재발 지점을 같이 막았다.** `@repo/ui`는 storybook 의존성 덕분에 우연히 eslint 9가 잡혀 통과하고 있었다. 의존성 구성만 바뀌면 똑같이 깨질 자리라 명시 선언을 함께 넣었다.
- **한 번도 검사된 적 없는 코드에서 실제 문제가 나왔다.** `MessageEventBus`의 `(window as any)` 3건은 레포 event bus 규칙(`any` 금지)과도 어긋나 있었다. 지역 교차 타입으로 좁히면서 `declare global`은 피해 소비 앱 타입에 slot이 노출되지 않게 했다.
- **범위를 지켰다.** 앱 3개는 `next lint` + eslint 8 조합이라 손대지 않았고, 공유 설정과 루트 eslint 버전도 그대로다.

## 아쉬운 점 / 배운 점

- **"lint 통과"와 "lint 실행됨"은 다르다.** turbo가 실패 로그를 패키지별로 접어서 보여주는 바람에 FE-REQ-003 시점엔 `@repo/ui`만 문제인 것처럼 보였다. 실제로는 두 패키지가 오래전부터 검사 자체를 못 하고 있었다. 앞으로 lint 상태를 판단할 때 exit code뿐 아니라 "몇 개 파일을 검사했는지"까지 보는 편이 안전하다.
- **floating specifier가 있는 레포에서 `pnpm install`은 부수 변경을 만든다.** 루트 `turbo: "latest"` 때문에 lockfile에 의도하지 않은 전이 의존성 갱신이 함께 들어왔다. 설치된 turbo 바이너리는 그대로였고 검증도 전부 통과했지만, 리뷰어가 lockfile diff를 볼 때 혼란스러울 수 있어 체크리스트에 항목별로 적어뒀다.
- **한 패키지만 tsconfig override가 빠져 있었다.** `mocks`의 `check-types` 실패(`TS2835`)는 lint와 무관하지만 같은 뿌리(패키지 설정 표준화 누락)다. 형제 패키지 설정을 복사해 맞추는 것으로 끝났는데, 애초에 `@repo/typescript-config`에 번들러용 프리셋을 하나 더 두는 편이 낫다.
- **목 데이터의 파라미터가 장식이었다.** `generateAccounts(userSeqNo)`는 인자를 받기만 하고 무작위 데이터를 돌려주고 있었다. 시그니처가 실제 API를 흉내 내는 것처럼 보여 더 헷갈렸다. 지금은 파라미터를 지웠지만, 목이 사용자별로 안정적인 응답을 주는 편이 개발 경험에는 더 좋다(아래 후속 과제).

## 남은 기술부채 / Action Items

1. **`@repo/typescript-config`에 번들러용 프리셋 추가.** `react-library.json`은 `base.json`의 `NodeNext`를 그대로 물려주는데, 워크스페이스의 source-only 패키지들은 전부 `Bundler`로 개별 override하고 있다. 프리셋(`react-library-bundler.json` 등)을 만들어 각 패키지의 중복 override를 없앤다.
2. **공유 eslint 설정의 ignore 목록 정리.** 현재 `dist/**`만 있어 `storybook-static/**`은 FE-REQ-003에서 패키지 로컬로 막았다. `.next/**`, `coverage/**`까지 공유 설정으로 올린다.
3. **앱 eslint 9 마이그레이션 검토.** 앱 3개는 아직 eslint 8 + `next lint`다. Next 15 업그레이드나 flat config 전환과 묶어서 판단한다. 지금 억지로 올리면 `eslint-config-next` 호환 문제가 생긴다.
4. **목 응답을 사용자별로 결정론적으로 만들기.** `openBanking` 목은 호출할 때마다 계좌 목록이 바뀐다. 시드 기반으로 바꾸면 UI 개발 중 화면이 흔들리지 않는다. 이번엔 파라미터 제거로 끝냈고, 결정론적 목이 필요해지면 그때 시드를 도입한다.
5. **`@repo/ui`의 storybook v8 잔여 의존성 제거**(FE-REQ-003에서 이월). `@storybook/react`, `@storybook/blocks` 8.5는 이제 아무도 import하지 않는데 peer 경고를 만든다.
