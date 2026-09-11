# 비어 있어야 하는 폴더다

Next 가 `src/pages/**`(FSD `pages` 레이어)를 Pages Router 로 집지 않도록 루트에 빈 `pages/` 를 둔다.
라우팅은 `app/**` 이고, 그 파일들은 `@/pages/*` 를 re-export 만 한다.

근거: FSD 공식 Next.js 가이드 · `FE-REQ-008` FR-1 · FR-3 · FR-5.

## `app/page.tsx` 를 두지 않는다

zone 루트(`/`)는 **default zone 의 경로**다. tax zone 이 `app/page.tsx` 를 가지면
`/` 가 두 zone 에 동시에 존재하게 되고, `FE-REQ-007` 의 "zone 간 경로 중복 0건"이 깨진다.
이 zone 이 소유하는 경로는 `@repo/core/zones` 레지스트리대로 `/tax` 아래뿐이다.
