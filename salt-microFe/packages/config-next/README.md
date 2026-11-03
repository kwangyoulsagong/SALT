# `@repo/config-next`

zone 5개(`apps/web` · `web-investment` · `web-savings` · `web-household` · `web-tips`)의 Next 설정 프리셋 — `FE-REQ-054` FR-5.

```js
// apps/web-<domain>/next.config.js
const { zoneNextConfig } = require("@repo/config-next");
module.exports = withVanillaExtract(zoneNextConfig("invest", { transpilePackages: ["@repo/ui", "@repo/web-shared"] }));
```

- zone 몫(`assetPrefix` · `NEXT_PUBLIC_ZONE_APP` · 셸 rewrites)은 레지스트리(`@repo/core/zones`)에서 온다 — 손으로 쓰지 않는다
- 나머지(엄격 모드 · 이미지 허용 · Server Actions origin)는 한 벌이다. zone 하나만 다르게 하려면 이 프리셋을 먼저 고친다

## 정적 파일 — dev 는 zone 별, 운영 빌드는 공용 `/_next` (2026-11-03)

- 운영 빌드(`NODE_ENV=production`)는 도메인 zone 도 assetPrefix 를 두지 않는다 — 같은 해시 청크가 같은 URL 이 되어 zone 끼리 캐시를 나눈다
- 그래서 운영 빌드는 **정적 파일을 합쳐야** 뜬다: `pnpm --filter "./apps/web*" build && pnpm static:merge`(셸 `.next/static` 에 합침, 같은 이름 · 다른 내용이면 실패). 배포는 `OPS-001` FR-12
- zone 하나만 운영 빌드로 따로 띄울 때: `ZONE_STATIC=per-zone pnpm --filter web-investment build`
- dev 는 청크 이름에 해시가 없어(`main-app.js`) 레지스트리 assetPrefix 그대로
