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
| 상표 검색(Q2) | 사용자 확인 사항 — 같은 업종 "SALT" 표장. 2026-11-04 특허청 검색(KIPRIS) 자동 조회는 상표 탭 결과를 받지 못해 실패(특허 결과만 나옴) — 대신 판단하지 않았다 | 출시 전(사용자) |
| 실기기 홈 화면 아이콘(iOS 추가) | 파일 점검은 끝(아래) — 휴대폰에서 실제로 홈에 추가해 보지는 않았다 | `QA-001` |

## 2026-11-04 — 남은 확인 닫기(사용자 "다 확인 진행")

- [x] **번들 main 대조** — main `1944b6d2` 와 이 브랜치 `ee408925` 를 각각 별도 작업 트리에서 zone 5 운영 빌드(dev `.next` 를 건드리지 않음)
  - 공용 First Load: 다섯 zone 모두 **그대로**(103 · 104 · 102 · 102 · 82.9 kB)
  - 머리가 있는 페이지 First Load **+1 ~ +3 kB**: 셸 `/` 147→149 · `/home` 156→159 · `/settings` 133→135 · 투자 각 +1(`/investments` 141→142 · `/search` 159→160) · 저축 `/goals` 150→153 · `/goals/[id]` 152→154 · 가계부 `/household` 149→151
  - 머리 없는 페이지(`/goals/new` · `/household/budget` · `/household/new` · `/goals/addgoals`) 변화 0
  - 새 경로 `/icon.svg` · `/apple-icon.png` 는 정적 파일(JS 0 B)
- [x] **홈 화면 아이콘 파일 점검**(실기기 전 단계) — `apple-icon.png` 180×180 · **불투명**(iOS 가 투명 부분을 검게 채우지 않는다) · zone 다섯 해시 같음. iOS 모서리 마스크(반경 22.37%)를 씌운 87 · 120 · 180 미리보기에서 물방울 · 물결이 잘리지 않는다
- [ ] 상표 검색 — 자동 조회 실패(위 표). 사용자가 KIPRIS 상표 탭에서 "SALT" · "솔트"를 36류(금융) · 9류(앱) · 42류(소프트웨어 서비스)로 확인
- [ ] FR-6 `ui-native` — 패키지가 없다. `RN-REQ-001`
