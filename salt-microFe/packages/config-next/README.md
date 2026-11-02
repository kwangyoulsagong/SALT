# `@repo/config-next`

zone 5개(`apps/web` · `web-investment` · `web-savings` · `web-household` · `web-tips`)의 Next 설정 프리셋 — `FE-REQ-054` FR-5.

```js
// apps/web-<domain>/next.config.js
const { zoneNextConfig } = require("@repo/config-next");
module.exports = withVanillaExtract(zoneNextConfig("invest", { transpilePackages: ["@repo/ui", "@repo/web-shared"] }));
```

- zone 몫(`assetPrefix` · `NEXT_PUBLIC_ZONE_APP` · 셸 rewrites)은 레지스트리(`@repo/core/zones`)에서 온다 — 손으로 쓰지 않는다
- 나머지(엄격 모드 · 이미지 허용 · Server Actions origin)는 한 벌이다. zone 하나만 다르게 하려면 이 프리셋을 먼저 고친다
