# FE-REQ-007 회고 — Module Federation → Next.js Multi-Zones

작성: 2026-09-11

## 1. 확인된 것 — REQ의 판단이 코드에서 맞았다

**"우리가 MFE를 쓰던 방식이 이미 Multi-Zones와 같았다"(REQ 이유 2)가 사실이었다.**
`shell`은 remote를 **페이지 통째로** 마운트하고 있었다 — `dynamic(() => import("goals/GoalsApp"))` 4곳이 전부고,
한 페이지 안에서 컴포넌트 단위로 섞은 자리가 하나도 없었다. 그래서 이관이 "remote 페이지 → 로컬 컴포넌트" 치환으로
끝났고, **화면 동작을 바꾸지 않고 옮길 수 있었다.** 런타임 번들 조립이라는 비싼 능력을 사고 경로 분리라는 싼 기능만
쓰고 있었다는 진단이 정확했다.

**event bus는 죽어 있었다.** `@repo/message-event-bus`의 유일한 사용처가 `AddGoalsContent`의 `account.selected`
구독 한 곳이었고 **publish하는 쪽이 없었다.** payload가 항상 null이었다는 뜻이다. FEATURE-000이 계좌 연동을
제품 범위에서 뺀 결정과도 맞아떨어져, 제거에 대체 구현이 필요 없었다.

## 2. REQ와 다르게 한 것

| 항목 | REQ | 실제 | 이유 |
|---|---|---|---|
| 배포 대상 | "착수 전 확정 필요" | **FR-21 자체 호스팅** + 어댑터 | 체크리스트 §5 |
| cross-zone 링크 | `<a>`를 쓴다 | `<a>`를 감싼 `CrossZoneLink` | FR-21이 요구한 "로딩 상태"를 붙이고, FR-20 전환 지점을 파일 하나로 가두기 위해 |
| `RemoteBoundary` | 언급 없음 | `SectionBoundary`로 개명 | remote가 사라졌는데 이름이 남으면 다음 사람이 remote를 찾는다 |

## 3. 부채 — 실행 가능한 것만 적는다

### 3-1. `apps/web/src/styles/tokens.css.ts`가 `@repo/ui/tokens`와 겹친다

세 앱의 앱 로컬 토큰을 **합집합으로 합쳐서** 하나로 만들었다. `@repo/ui/tokens`로 일원화하지 않은 이유는 이름이
다르기 때문이다 — `background.third`↔`background.tertiary`, `extra.down`↔`special.down`,
`fontSizes.body`↔`fontSizes.base`, `space.large`↔`space.lg`.

- 영향 범위: **9개 파일**이 `@/styles/tokens.css`를 참조한다.
- 할 일: 화면을 디자인 시스템으로 옮기는 작업(FE-REQ-005/006의 후속)에서 이름을 매핑하고 이 파일을 지운다.
- 지금 하지 않은 이유: 토큰 이름 매핑은 시각적 회귀를 만들 수 있고, zone 재편과 섞으면 원인 분리가 안 된다.

### 3-2. ESLint 규칙의 zone 경로가 레지스트리와 두 곳에 있다

단일 소스는 `@repo/core/zones`의 `crossZonePathPrefixes()`인데, `@repo/eslint-plugin-zone`은 **CommonJS라
TS 소스를 import할 수 없어** 같은 값을 `zonePaths` 옵션으로 받는다. 두 앱의 `.eslintrc.json`에 값이 복사돼 있다.

- 지금 안전한 이유: 값이 어긋나면 lint가 **느슨해질 뿐 빌드가 깨지지 않는다** — 조용한 실패다.
- 할 일: `FE-REQ-009`(FSD)에서 앱을 flat config(ESM)로 옮길 때, 레지스트리를 직접 import하도록 바꾼다.
  그때까지는 zone을 추가할 때 **레지스트리와 두 `.eslintrc.json`을 함께 고친다.**

### 3-3. `src/component`와 `src/components`가 한 앱에 공존한다

`goals`·`investments`는 `component`, `shell`은 `components`를 썼다. **의도적으로 그대로 뒀다** — 이름을 통일하면
이관 커밋에 import 경로 100여 줄이 섞여 "무엇이 옮겨졌는지"가 diff에서 사라진다.

- 할 일: `FE-REQ-009`가 어차피 전부 `entities/`·`features/`·`widgets/`로 옮긴다. **그때 자연히 사라지므로
  중간 단계에서 별도로 이름만 바꾸지 않는다.**

### 3-4. 관측성과 기능 플래그가 비어 있다

체크리스트 §4-2, §4-3. 둘 다 **붙일 대상이 아직 없어서** 비워 뒀고, 각각 배포 환경 확정 시점과 F002 시점에
할 일을 적어 두었다.

## 4. 규칙 문서에 반영한 것

`nextjs-mf` 제거가 코드보다 **문서에서 더 넓게 퍼져 있었다.** `.claude`/`.codex` 양쪽 27개 파일에 remote·shell·
federation 서술이 남아 있었고, 그대로 두면 다음 세션이 없는 구조를 전제로 작업한다.

- 삭제: `rules/event-bus.md` (패키지가 사라졌다)
- 개정: `ssr.md`(Module Federation SSR → Multi-Zones SSR) · `state-convention.md` · `api-convention.md` ·
  `domain-architecture.md` · `constants-convention.md` · `className-convention.md` · `design-system.md` ·
  `performance.md` · `study-report.md`
- 스킬: `plan`(§4-1을 zone 정비 항목으로 교체) · `validate`(검증 명령·정적 점검 항목) · `pipeline` · `retrospect` · `study`
- 앱 문서: `CLAUDE.md` · `AGENTS.md` · `README.md`(Turborepo 스타터 그대로였던 것을 실제 구조로 교체)

**얻은 것:** "규칙 문서가 코드보다 오래 산다"는 것. 아키텍처 전환 REQ는 문서 갱신을 산출물로 명시해야 한다.
`FE-REQ-008`·`FE-REQ-009`에도 같은 크기의 문서 작업이 따라온다고 보는 것이 맞다.

## 5. 다음 사람에게

1. **`FE-REQ-008`(App Router + 스트리밍 SSR)이 다음이다.** 지금은 여전히 **Pages Router**다.
   순서를 바꾸면 라우트를 두 번 옮긴다 — REQ Dependencies가 그렇게 적혀 있고, 지금 상태가 그 전제와 일치한다.
2. **zone을 추가하려는 생각이 들면 `microfrontend.md` §2의 세 조건을 먼저 읽는다.** 셋 중 하나라도 불확실하면
   zone이 아니라 슬라이스다. 지금 조건을 모두 만족하는 경계는 **세금 하나뿐**이다.
3. **`/tax`에 인증이 필요해지는 순간 막힌다.** 토큰이 `localStorage`에 있어 zone을 넘지 못한다.
   그 전에 `FE-REQ-013`의 쿠키 이관이 끝나야 한다. 키는 `@repo/core/auth` 한 곳에 모여 있다.
