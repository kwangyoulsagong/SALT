# `@repo/eslint-plugin-fsd`

FSD 레이어 경계와 도메인 경계를 lint 로 강제한다 (`FE-REQ-009` FR-21 · `FE-REQ-052` FR-4).

## `@repo/fsd/layers`

| 막는 것 | FR |
|---|---|
| 상위 레이어 import | FR-2 |
| 같은 레이어의 다른 슬라이스 | FR-3 |
| 슬라이스·세그먼트 내부 경로 직접 참조 | FR-4 |
| 같은 슬라이스를 alias 로 참조 | FR-22 |
| `apps/*` 끼리 `src` 직접 import (zone 교차) | FR-23 |
| `apps/mobile` → `@repo/ui` | FR-24 |
| 루트 `app/**`·`pages/**` 에서 `@/pages`·`@/app` 외 import | FR-25 |
| 레지스트리에 없는 슬라이스 | FR-26 |

### 도메인 축 (`FE-REQ-052` FR-4, `ADR-005` §2)

도메인 목록은 zone 레지스트리(`packages/core/src/zones/registry.json`)에서 온다 — 여기 복사하지 않는다.

| 규칙 이름 | 막는 것 |
|---|---|
| `cross-domain` | `packages/domain-A` → `@repo/domain-B`(상대 경로로 넘는 것도) |
| `shell-domain` | 셸 `apps/web` → `@repo/domain-*` — 홈은 BFF 카드로만 |
| `foreign-domain` | zone 앱 `apps/web-<x>` → 자기 것이 아닌 `@repo/domain-*` |
| `thin-zone` | `apps/web-<x>/src/{entities,features,widgets}` — 화면은 `domain-*` 에 |

패키지 안 레이어(`FE-REQ-053`): `packages/domain-*/src` 는 `entities` · `features` · `widgets` · `pages`(shared 는 `@repo/web-shared`, app 은 zone 앱), `packages/web-shared/src` 는 패키지 전체가 shared — 앱 alias(`@/…`) import 금지 · 세그먼트끼리 상대 경로. `@repo/web-shared/<세그먼트>` 는 `@/shared/<세그먼트>` 와 같은 판정.

```jsonc
// apps/web/.eslintrc.json
{
  "plugins": ["@repo/fsd"],
  "rules": { "@repo/fsd/layers": "error" }
}
```

## 규칙 표는 한 곳이다

판정 로직과 레지스트리는 **`layer-rules.cjs`** 에만 있다.
`.claude/hooks/layer-check.mjs` 가 같은 파일을 읽는다 — 미러가 아니라 같은 파일이다.
훅 실행 테스트 `pnpm test:layer-check` — 차단 16(레이어 8 + 도메인 4 + 패키지 안 4) · 통과 10.

CommonJS 인 이유: 앱이 eslintrc 모드를 쓰고, eslintrc 는 ESM 플러그인을 로드하지 못한다.
`FE-REQ-009` FR-20 은 `layer-rules.mjs` 를 적었지만 그러면 표가 두 벌이 된다.

## 예외 하나 — `*.css` 토큰 모듈

`@repo/web-shared/ui/tokens.css`(전 `@/shared/ui/tokens.css`) 는 세그먼트 내부 경로지만 허용한다.
`.css.ts` 는 **빌드 타임에 node 에서 평가**되므로 barrel 로 가져오면 React 컴포넌트가
vanilla-extract 그래프에 들어와 빌드가 깨진다.
