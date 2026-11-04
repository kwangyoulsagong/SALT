# FE-REQ-051 — 체크리스트

## 2026-11-04 — 로고 · `25f182f6`

### FR
- [x] FR-1 `Logo`(`@repo/ui/logo`) — `full` · `symbol` · `xs/sm/md/lg` · `light/dark` · `depth`(기본 입체) · `ripples` · `decorative`. Storybook `Default` · `Symbol` · `Flat` · `Depth` · `Dark` · `Sizes`
- [x] FR-2 머리 첫 칸 `HeaderBrand` → `/home`(링크 이름 "SALT 홈", 그림 `aria-hidden`). 실화면(dev 3000): 1440 글자 로고 61×24 보임 · 심볼 숨김 / 900 글자 로고 숨김 · 심볼 24×24 보임. 셸 · 투자 · 저축 · 가계부 · 404 서버 HTML 에 `data-logo` 둘
- [x] FR-3 zone 5 `icon.svg` · `apple-icon.png`(180) · `favicon.ico`(16 · 32 PNG 항목) — 서버 HTML `<link rel="icon" href="/icon.svg?2ad3dc145762f316">` 가 zone 다섯 곳 같은 해시 · `apple-touch-icon` 180
- [x] FR-4 hex 는 `@repo/tokens` 한 곳 — `Logo.tsx` · `Logo.css.ts` · `generate-brand-icons.mjs` 에 색 리터럴 0. `pnpm brand:icons --check` "18개 — 토큰과 같다"
- [x] FR-5 16(단색) · 20 · 24 · 32 · 128 렌더 대조(sharp) — 16 은 블러가 뭉개져 단색, 물결은 큰 자리만
- [ ] FR-6 `ui-native` 컴포넌트 — 범위 밖(아래 표)

### 검증
- `pnpm check-types` 12/12 · `pnpm lint` 12/12 · `pnpm test`(core 169 · ui 43) · `test:layer-check` 차단 16 · 통과 10 · 훅 사후 실행(바꾼 ts/tsx 10개) 차단 0
- `@repo/ui build-storybook` 성공 · zone 5 운영 빌드 성공(공용 First Load: web 103 · 투자 104 · 저축 102 · 가계부 102 · 팁 82.9 kB) → dev zone 4 재기동 · `/home` · `/investments` · `/goals` · `/household` 200
- 대비: 단색 `flat #83868F` 흰 바탕 3.64:1(비글자 3:1 이상) · 은회색 면 `mid` 1.56:1 은 입체 안에서만

| 미검증 · 범위 밖 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-6 `@repo/ui-native` 로고 | 패키지가 아직 없다(앱 미착수) — 경로 데이터는 `@repo/tokens` `BRAND_MARK` 한 곳으로 이미 나눠 둠 | `RN-REQ-001` |
| 번들 증가분 수치(main 대비) | 공용 First Load 만 적었다 — main 같은 빌드를 따로 돌리지 않았다. 로고는 `HeaderBrand` 가 부르는 클라이언트 잎 하나(경로 데이터 약 6 KB 원문) | 다음 FE 슬라이스의 번들 표(`FE-REQ-029` 줄)에서 main 대조 |
| 상표 검색(Q2) | 사용자 확인 사항 — 같은 업종 "SALT" 표장 | 출시 전(사용자) |
| 실기기 홈 화면 아이콘(iOS 추가) | 로컬 dev 라 휴대폰에서 열지 않았다 | `QA-001` |
