# `@repo/eslint-plugin-zone`

Multi-Zones 경계를 lint로 강제한다 (FE-REQ-007 FR-5 → FE-REQ-052 FR-5).

## `@repo/zone/no-cross-zone-link`

다른 zone의 경로에 `next/link`의 `<Link>`를 쓰면 실패한다. zone을 넘는 이동은 hard navigation이라
`<Link>`의 prefetch·soft navigation이 **동작하지 않는다.**

```jsonc
// apps/web/.eslintrc.json
{
  "plugins": ["@repo/zone"],
  "rules": {
    // 경로를 복사하지 않는다 — 파일이 놓인 앱(apps/<app>)을 보고 레지스트리에서 계산한다
    "@repo/zone/no-cross-zone-link": "error"
  }
}
```

```tsx
// apps/web(셸) 안에서
<Link href="/household">가계부</Link>      // ✗ error — 가계부 zone
<Link href={`/tips/${id}`}>팁</Link>      // ✗ error
<CrossZoneLink href="/tips">팁</CrossZoneLink> // ✓ (로딩 상태까지 준다)
<Link href="/investments">투자</Link>     // ✓ 옮기기 전이라 셸이 서비스한다(hostedIn)
<Link href="/tipsy">…</Link>             // ✓ prefix가 아니다
```

경로 목록의 단일 소스는 `packages/core/src/zones/registry.json`이다. 이 플러그인은 CommonJS라 TS를
import할 수 없어 같은 데이터를 읽는 `registry.cjs` 를 부른다 — TS 쪽과 계산이 같은지는 `registry.test.ts` 가 대조한다.
`zonePaths` 옵션은 테스트 · 앱 밖 파일용 덮어쓰기로만 남겼다.
