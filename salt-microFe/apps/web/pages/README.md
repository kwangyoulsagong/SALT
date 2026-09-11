# 비어 있어야 하는 폴더다

Next 는 라우팅 디렉터리를 프로젝트 루트와 `src/` 양쪽에서 찾는다. **루트에 있으면 `src/` 쪽을
무시한다.** 이 앱의 `src/pages/**` 는 Next 라우팅이 아니라 **FSD `pages` 레이어**(화면 슬라이스)이므로,
Next 가 그것을 Pages Router 로 집지 않도록 루트에 빈 `pages/` 를 둔다.

근거: FSD 공식 Next.js 가이드 · `FE-REQ-008` FR-1 · FR-3.

**여기에 `.tsx` 를 만들지 않는다.** 라우팅은 `app/**` 이고, 그 파일들은 `@/pages/*` 를 re-export 만 한다.
