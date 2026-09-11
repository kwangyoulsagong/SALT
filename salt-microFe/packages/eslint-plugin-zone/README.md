# `@repo/eslint-plugin-zone`

Multi-Zones 경계를 lint로 강제한다 (FE-REQ-007 FR-5).

## `@repo/zone/no-cross-zone-link`

다른 zone의 경로에 `next/link`의 `<Link>`를 쓰면 실패한다. zone을 넘는 이동은 hard navigation이라
`<Link>`의 prefetch·soft navigation이 **동작하지 않는다.**

```jsonc
// apps/web/.eslintrc.json
{
  "plugins": ["@repo/zone"],
  "rules": {
    // @repo/core/zones 의 CROSS_ZONE_PATH_PREFIXES 와 같은 값이어야 한다
    "@repo/zone/no-cross-zone-link": ["error", { "zonePaths": ["/tax", "/tax-static"] }]
  }
}
```

```tsx
<Link href="/tax">세금</Link>      // ✗ error
<Link href={`/tax/${id}`}>세금</Link> // ✗ error
<a href="/tax">세금</a>              // ✓
<CrossZoneLink href="/tax">세금</CrossZoneLink> // ✓ (로딩 상태까지 준다)
<Link href="/taxes">…</Link>         // ✓ prefix가 아니다
```

경로 목록의 단일 소스는 `@repo/core/zones`다. 이 플러그인은 CommonJS라 TS를 import할 수 없어
같은 값을 옵션으로 받는다.
