---
id: RN-REQ-029
feature: F007
area: rn
kind: FUNC
title: "F007 모바일 앱 기반 — 기능 정의 (등록 · 딥링크 · 오프라인 · OTA)"
priority: high
labels: [rn, func, device, deeplink, offline, ota]
created: 2026-09-09
---

## Summary

모바일 기반 기능 넷: **기기를 등록하고**, **알림을 눌러 목적지로 가고**, **오프라인에서 마지막 상태를 보여주고**, **JS를 OTA로 갱신한다.** 각각이 실패해도 앱은 계속 동작해야 한다.

## 구성

```
apps/mobile/src/
  entities/device/
    model/    등록 상태 · 권한 상태 · 버전 게이트 상태
    api/      BFF 어댑터
  native/                     <- 플랫폼 API는 여기서만
    push.ts                   expo-notifications
    secureStore.ts            expo-secure-store
    updates.ts                expo-updates
    linking.ts                딥링크 파싱
    netInfo.ts
  app/
    providers/OfflineProvider.tsx
    providers/VersionGateProvider.tsx
    navigation/linking.config.ts
```

**`src/native/` 밖에서 플랫폼 모듈을 import하는 코드가 0건**이다.

## Requirements

### A. 기기 등록

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 등록 시점은 **권한 허용 직후 + 로그인 직후 + 토큰 변경 시**다 | Must |
| FR-2 | 앱 실행마다 등록하지 않는다. **`lastRegisteredHash`가 같고 24시간 이내면 생략** | Must |
| FR-3 | 등록 실패는 **조용히 실패**한다. 사용자 화면을 막지 않는다 | Must |
| FR-4 | 등록 실패를 최대 3회 백오프 재시도한다. 이후 다음 실행까지 미룬다 | Should |
| FR-5 | `appVersion`·`runtimeVersion`을 `expo-constants`/`expo-updates`에서 읽어 보낸다 | Must |
| FR-6 | 로그아웃 시 **등록 해제**를 호출한다. 실패해도 로그아웃은 진행한다 | Must |
| FR-7 | 푸시 토큰을 **앱 저장소에 남기지 않는다.** 매번 OS에서 받는다 | Must |

### B. 딥링크

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 알림 탭 → `deepLink`로 라우팅한다. 웜·콜드 모두 | Must |
| FR-11 | **딥링크 파라미터를 신뢰하지 않는다.** 진입 후 서버로 재검증한다 | Must |
| FR-12 | 외부 URL(`http`/`https`) 딥링크는 **거부**한다. 앱 내부 경로만 | Must |
| FR-13 | 미로그인이면 로그인 후 **원래 목적지로 복귀**한다 | Must |
| FR-14 | 대상이 없거나 만료면 상위 화면으로 폴백하고 안내한다 | Must |
| FR-15 | **딥링크 payload를 로그에 남기지 않는다** | Must |
| FR-16 | 콜드 스타트 딥링크가 네비게이션 준비 전에 오면 **큐에 넣었다가 준비 후 처리**한다 | Must |

### C. 오프라인

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 홈 응답을 캐시하고 오프라인에서 **`lastUpdatedAt`과 함께** 표시한다 | Must |
| FR-21 | 캐시는 **암호화 저장소**다. 평문 JSON 파일이 0건이다 | Must |
| FR-22 | **오프라인 큐를 만들지 않는다.** 쓰기는 disabled | Must |
| FR-23 | 코치 입력은 보존하되 **전송하지 않는다.** 복귀 시 사용자가 직접 보낸다 | Must |
| FR-24 | 네트워크 복귀를 `NetInfo`로 감지해 자동 갱신한다 | Must |
| FR-25 | 로그아웃 시 캐시를 전부 삭제한다 | Must |
| FR-26 | 캐시 TTL 7일. 초과분은 표시하지 않는다 | Should |

**왜 큐가 없는가** (FEATURE-007 FR-32): 나중에 자동 전송되면 사용자가 결과를 확인하지 않은 채 상태가 바뀐다. 적립 완료·평가는 **사실 기록**이므로 사용자가 결과를 본 상태에서만 확정한다.

### D. 버전 게이트

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 앱 시작 시 `version-gate`를 조회한다. **인증 전에도** 가능하다 | Must |
| FR-31 | 모든 요청에 `X-App-Version`·`X-Platform`을 붙인다 | Must |
| FR-32 | 어떤 응답이든 `426`이면 **즉시 차단 모달**로 전환한다 | Must |
| FR-33 | 게이트 조회 실패는 **차단하지 않는다**(fail-open). 앱이 잠기지 않는다 | Must |
| FR-34 | 런타임 버전만 낮으면 **OTA 확인 → 적용 → 재시작**을 먼저 시도한다 | Should |

### E. OTA

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | `expo-updates`로 JS를 갱신한다 | Must |
| FR-41 | **네이티브 변경을 OTA로 내보내지 않는다.** 릴리스 체크리스트가 강제한다 | Must |
| FR-42 | 업데이트 확인이 **앱 시작을 막지 않는다.** 백그라운드로 받고 다음 실행에 적용 | Must |
| FR-43 | **금액·세금 계산이 바뀌는 릴리스는 즉시 적용 + 재시작 안내**를 한다. 다음 실행까지 미루지 않는다 | Must |
| FR-44 | 롤백이 명령 하나로 가능하다 (채널 되돌리기) | Must |
| FR-45 | OTA 적용률·실패율을 수집한다 | Must |

### F. 보안·금지

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 토큰은 **Keychain/Keystore**. `AsyncStorage` 경로가 0건이다 | Must |
| FR-51 | **거래소 API 키를 앱에 저장하는 경로가 0건**이다 | Must |
| FR-52 | **앱이 로컬 알림을 스케줄하지 않는다** | Must |
| FR-53 | 오프라인 캐시·로그·크래시 리포트에 **금액이 0건**이다 | Must |
| FR-54 | `src/native/` 밖에서 플랫폼 모듈 import가 0건이다 | Must |
| FR-55 | CSV 업로드 외 파일 접근 권한을 요청하지 않는다 | Must |
| FR-56 | 주문·출금 호출과 거래소 앱 딥링크가 0건이다 | Must |

## 상태 머신 (앱 전역)

```
launch -> gateCheck ---(426)---> blocked (탈출: 로그아웃)
              |
              +--(ok/실패)--> authCheck -> ready
ready --(offline)--> cachedReadOnly --(online)--> revalidating -> ready
ready --(push tap)--> deepLinkResolve -> target | fallback
ready --(ota ready)--> applyNext | applyNow(금액 변경 릴리스)
```

## 테스트

| 종류 | 대상 |
|---|---|
| 단위 | 등록 생략 조건(24h + 동일 해시) |
| 단위 | 딥링크 파서 — 외부 URL 거부 |
| 통합 | 콜드 스타트 딥링크 큐잉 → 준비 후 처리 |
| 통합 | 미로그인 딥링크 → 로그인 후 복귀 |
| 통합 | 기내 모드 → 캐시 + 배너 + 쓰기 disabled |
| 통합 | 복귀 → 자동 갱신 |
| 통합 | `426` → 차단 모달, 로그아웃 가능 |
| 통합 | 게이트 조회 실패 → 앱 정상 동작 |
| 통합 | 로그아웃 → 캐시·토큰 삭제 확인 |
| 정적 | `src/native/` 밖 플랫폼 import 0건 |
| 정적 | `AsyncStorage` 토큰 저장 0건 |
| 정적 | 로컬 알림 스케줄 API 사용 0건 |
| 기기 | iOS·Android 실기기 푸시 도달 → 딥링크 |

## Acceptance Criteria

- [ ] 등록이 권한 허용·로그인·토큰 변경 시점에 일어난다
- [ ] **24시간 이내 동일 토큰 재등록이 생략된다**
- [ ] **등록 실패가 사용자 화면을 막지 않는다**
- [ ] 로그아웃 시 등록 해제가 호출되고 실패해도 로그아웃된다
- [ ] **푸시 토큰이 앱 저장소에 남지 않는다**
- [ ] 알림 탭이 웜·콜드 모두 라우팅된다
- [ ] **딥링크 파라미터가 서버로 재검증된다**
- [ ] **외부 URL 딥링크가 거부된다**
- [ ] 미로그인 딥링크가 로그인 후 복귀한다
- [ ] **콜드 스타트 딥링크가 큐잉 후 처리된다**
- [ ] 딥링크 payload가 로그에 없다
- [ ] 오프라인에서 캐시 + `lastUpdatedAt`이 표시된다
- [ ] **캐시가 암호화 저장소고 평문 파일이 0건이다**
- [ ] **오프라인 큐가 0건이고 쓰기가 disabled다**
- [ ] 코치 입력이 보존되되 전송되지 않는다
- [ ] 복귀 시 자동 갱신된다
- [ ] 로그아웃 시 캐시가 삭제된다
- [ ] 앱 시작 시 게이트가 인증 전에 조회된다
- [ ] 모든 요청에 버전·플랫폼 헤더가 붙는다
- [ ] **`426`에서 즉시 차단되고, 게이트 조회 실패는 차단하지 않는다**
- [ ] **네이티브 변경이 OTA로 나가지 않음이 체크리스트로 강제된다**
- [ ] OTA 확인이 앱 시작을 막지 않는다
- [ ] **금액·세금 계산 변경 릴리스가 즉시 적용된다**
- [ ] 롤백이 명령 하나로 된다
- [ ] **토큰이 Keychain/Keystore고 `AsyncStorage`가 0건이다**
- [ ] **거래소 API 키 저장이 0건이다**
- [ ] **로컬 알림 스케줄이 0건이다**
- [ ] 캐시·로그·크래시 리포트에 금액이 0건이다
- [ ] **`src/native/` 밖 플랫폼 import가 0건이다**
- [ ] 주문·출금 호출과 거래소 딥링크가 0건이다
- [ ] iOS·Android 실기기에서 푸시 → 딥링크가 동작한다

## Dependencies

- **선행:** `RN-REQ-001`(아키텍처) · `RN-REQ-003`(릴리스) · `BFF-REQ-032`
- **짝:** `RN-REQ-028`(UI) · `030`(API) · `031`(PERF)

## Open Questions

- "금액 계산이 바뀌는 릴리스는 즉시 적용"을 어떻게 앱이 아는가. OTA 매니페스트에 플래그가 필요하다 — `expo-updates`의 `extra`에 담을지.
- 캐시 암호화가 홈 전체 JSON에 대해 매번 복호화 비용을 만든다. 금액 필드만 선택 암호화할지, 전체를 할지(`RN-REQ-031`과 연결).
