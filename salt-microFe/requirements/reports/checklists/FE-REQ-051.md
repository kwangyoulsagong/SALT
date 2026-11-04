# FE-REQ-051 — 체크리스트

## 2026-11-04 — 로고 · `25f182f6`

### FR
- [x] FR-1 `Logo`(`@repo/ui/logo`) — `full` · `symbol` · `xs/sm/md/lg` · `light/dark` · `depth`(기본 입체) · `ripples` · `decorative`. Storybook `Default` · `Symbol` · `Flat` · `Depth` · `Dark` · `Sizes`
- [x] FR-2 머리 첫 칸 `HeaderBrand` → `/home`(링크 이름 "SALT 홈", 그림 `aria-hidden`). 실화면(dev 3000): 1440 글자 로고 61×24 보임 · 심볼 숨김 / 900 글자 로고 숨김 · 심볼 24×24 보임. 셸 · 투자 · 저축 · 가계부 · 404 서버 HTML 에 `data-logo` 둘
- [x] FR-3 zone 5 `icon.svg` · `apple-icon.png`(180) · `favicon.ico`(16 · 32 PNG 항목) — 서버 HTML `<link rel="icon" href="/icon.svg?2ad3dc145762f316">` 가 zone 다섯 곳 같은 해시 · `apple-touch-icon` 180
- [x] FR-4 hex 는 `@repo/tokens` 한 곳 — `Logo.tsx` · `Logo.css.ts` · `generate-brand-icons.mjs` 에 색 리터럴 0. `pnpm brand:icons --check` "18개 — 토큰과 같다"
- [x] FR-5 16(단색) · 20 · 24 · 32 · 128 렌더 대조(sharp) — 16 은 블러가 뭉개져 단색, 물결은 큰 자리만(**정정 2026-11-04: 파비콘은 사용자 결정으로 16 도 입체 — 아래 절**)
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

## 2026-11-04 — 결함 수정(코드 리뷰 1회가 찾음 · 이후 리뷰는 돌리지 않는다)

- [x] 머리 로고 → 홈 링크가 홈 탭과 다른 길(`ZoneLink`)이었다 — 도메인 zone 에서 ① 누르면 링크 안에 대기 문구가 생겨 머리가 흔들리고 ② 홈 탭에 있는 prerender 표지 · ③ zone 전환 계측이 빠졌다. 탭 링크를 `AppTabLink` 한 벌로 꺼내 탭 · 로고가 같이 쓴다. 실화면: `/investments` · `/goals` · `/household` 로고 링크 `data-prerender-tab` 있음 · 누른 직후 폭 68.75 그대로 · 대기 글 없음 · `aria-busy` 만
- [x] 브라우저 탭(16 · 32)이 ICO 대신 입체 `icon.svg` 를 골라 블러가 뭉개졌다(FR-5 위반) — `icon.svg` 를 단색(`flat`)으로. 입체는 앱 아이콘 180 · ICO 32
- [x] 머리 로고 둘의 숨김이 `Logo` 의 `display: block` 과 같은 단 — CSS 청크 순서에 따라 둘 다 보일 수 있었다. 링크 안으로 한 단 좁혀 순서와 무관하게(1440 글자 로고만 · 900 심볼만 확인)
- [x] 아이콘 생성 zone 목록을 레지스트리에서(손으로 적은 5개 → `ZONE_IDS`) · 어두운 바탕 글자색을 컴포넌트와 같은 `text.white` 로
- 기록만(오동작 아님): 도메인 zone 아이콘 사본은 한 origin 에서는 셸 것이 서비스된다(직접 포트 접속 · 운영 L7 라우팅 대비로 둠) · 로고 두 벌 렌더 · 접근 이름 기본값 "SALT"(브랜드 이름) · PNG 바이트 비교는 sharp 판이 바뀌면 다시 구워야 한다
- 검증: `pnpm check-types` · `pnpm lint` · `pnpm test`(core 169 · ui 44 — 아이콘 테스트 포함) · 훅 사후 실행 4파일 · `brand:icons --check`

## 2026-11-04 — 파비콘을 로고와 같은 입체로(사용자 결정)

- [x] 바로 앞 수정에서 탭 아이콘을 단색으로 바꿨더니 로고와 다른 회색 물방울이 탭에 들어갔다 — 사용자 "파비콘도 똑같은 아이콘으로 해야지". `icon.svg` · ICO 16 · 32 전부 입체. 16 · 32 확대 렌더로 로고와 같은 접힌 면 확인 · 서버 HTML `icon.svg?2ad3dc145762f316`(입체) · `--check` · 아이콘 테스트 통과
