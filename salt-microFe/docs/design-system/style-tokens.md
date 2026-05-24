# 스타일 토큰

`@repo/ui`의 공통 토큰은 `packages/ui/src/styles/tokens.css.ts`의 `vars`를 기준으로 한다. 앱 또는 컴포넌트 스타일에서 색상, 간격, 타이포그래피, radius, shadow, z-index가 필요하면 먼저 이 문서를 확인한다.

> 현재 `packages/ui/package.json` exports에는 토큰 전용 subpath가 없다. 앱에서 토큰을 직접 import해야 하면 `@repo/ui`의 exports에 토큰 subpath를 먼저 추가하고 그 공개 경로만 사용한다.

## 기준 파일

- 토큰 파일: `packages/ui/src/styles/tokens.css.ts`
- 테마 범위: `:root`
- 폰트: `Inter`, `Noto Sans KR`

## 둥근 모서리

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `vars.radius.none` | `0` | radius 제거 |
| `vars.radius.xs` | `2px` | 작은 컨트롤 |
| `vars.radius.small` | `4px` | 밀도 높은 UI |
| `vars.radius.base` | `8px` | 기본 카드/컨테이너 |
| `vars.radius.medium` | `12px` | 강조 패널 |
| `vars.radius.large` | `16px` | 큰 패널 |
| `vars.radius.xl` | `20px` | 큰 표면 |
| `vars.radius.full` | `9999px` | pill/원형 |

## 색상

### 배경

| 토큰 | 값 |
| --- | --- |
| `vars.colors.background.primary` | `#F2F4F6` |
| `vars.colors.background.secondary` | `#F8F9FA` |
| `vars.colors.background.tertiary` | `#F0F1F3` |
| `vars.colors.background.white` | `#FFFFFF` |
| `vars.colors.background.dark` | `#191F28` |
| `vars.colors.background.gray` | `#F2F4F5` |

### 브랜드와 액션

| 토큰 | 값 |
| --- | --- |
| `vars.colors.brand.primary` | `#7949FF` |
| `vars.colors.brand.hover` | `#6339E6` |
| `vars.colors.brand.active` | `#5329CC` |
| `vars.colors.brand.light` | `#9B7FFF` |
| `vars.colors.brand.lighter` | `#E5DBFF` |
| `vars.colors.action.primary` | `#687AD7` |
| `vars.colors.action.hover` | `#5A6BC4` |
| `vars.colors.action.active` | `#4C5CB1` |

### 중립

| 토큰 | 값 |
| --- | --- |
| `vars.colors.neutral.50` | `#F8F9FA` |
| `vars.colors.neutral.100` | `#F0F1F3` |
| `vars.colors.neutral.200` | `#E1E3E6` |
| `vars.colors.neutral.300` | `#C8CCD1` |
| `vars.colors.neutral.400` | `#A8A6AC` |
| `vars.colors.neutral.500` | `#868E96` |
| `vars.colors.neutral.600` | `#495057` |
| `vars.colors.neutral.700` | `#343A40` |
| `vars.colors.neutral.800` | `#212529` |
| `vars.colors.neutral.900` | `#191F28` |

### 텍스트

| 토큰 | 값 | 비고 |
| --- | --- | --- |
| `vars.colors.text.primary` | `#191F28` | 기본 본문 |
| `vars.colors.text.secondary` | `#2A282F` | 보조 본문 |
| `vars.colors.text.tertiary` | `#868E96` | 부가 정보 |
| `vars.colors.text.disabled` | `#A8A6AC` | 비활성 |
| `vars.colors.text.white` | `#FFFFFF` | 흰색 텍스트 |
| `vars.colors.text.inverse` | `#FFFFFF` | 어두운 배경 위 텍스트 |
| `vars.colors.text.lightGray` | `#66727C` | 약한 본문 |
| `vars.colors.text.base` | `#FFFFFF` | 사용 중단 |
| `vars.colors.text.nickname` | `#2A282F` | 사용 중단 |
| `vars.colors.text.email` | `#A8A6AC` | 사용 중단 |
| `vars.colors.text.H2` | `#191F28` | 사용 중단 |

### 상태와 특수 색상

| 토큰 그룹 | 토큰 |
| --- | --- |
| `vars.colors.status` | `success`, `successHover`, `successLight`, `error`, `errorHover`, `errorLight`, `warning`, `warningHover`, `warningLight`, `info`, `infoHover`, `infoLight` |
| `vars.colors.special` | `orange`, `orangeHover`, `orangeLight`, `purple`, `purpleHover`, `purpleLight`, `pink`, `pinkHover`, `pinkLight`, `teal`, `tealHover`, `tealLight`, `down`, `up` |
| `vars.colors.border` | `light`, `default`, `dark`, `focus`, `lightDark`, `black` |
| `vars.colors.shadow` | `sm`, `md`, `lg`, `xl` |
| `vars.colors.overlay` | `light`, `medium`, `dark`, `darker` |

## 간격

| 토큰 | 값 |
| --- | --- |
| `vars.space.none` | `0` |
| `vars.space.xs` | `4px` |
| `vars.space.sm` | `8px` |
| `vars.space.md` | `12px` |
| `vars.space.lg` | `16px` |
| `vars.space.xl` | `24px` |
| `vars.space["2xl"]` | `32px` |
| `vars.space["3xl"]` | `48px` |
| `vars.space["4xl"]` | `64px` |
| `vars.space["5xl"]` | `80px` |
| `vars.space["6xl"]` | `96px` |

## 타이포그래피

| 토큰 그룹 | 토큰 |
| --- | --- |
| `vars.fontSizes` | `xs: 10px`, `sm: 12px`, `base/md: 14px`, `lg: 16px`, `xl: 18px`, `2xl: 20px`, `3xl: 24px`, `4xl: 32px`, `5xl: 40px`, `6xl: 48px` |
| `vars.fontWeights` | `light: 300`, `regular: 400`, `medium: 500`, `semibold: 600`, `bold: 700`, `extrabold: 800` |
| `vars.fontFamily` | `base`, `sans`, `korean`, `secondary` |
| `vars.lineHeights` | `tight`, `snug`, `normal`, `relaxed`, `loose` |
| `vars.letterSpacings` | `tighter`, `tight`, `normal`, `wide`, `wider` |

## 모션과 레이어

| 토큰 그룹 | 토큰 |
| --- | --- |
| `vars.transitions` | `fast`, `base`, `slow`, `slower` |
| `vars.zIndices` | `base`, `dropdown`, `sticky`, `fixed`, `modalBackdrop`, `modal`, `popover`, `tooltip` |

## 규칙

- 앱 로컬 상수를 추가하기 전에 이 토큰을 먼저 재사용한다.
- 같은 값이 컴포넌트나 앱 여러 곳에서 반복될 때만 새 토큰으로 승격한다.
- 단일 컴포넌트에만 쓰는 레이아웃 수치는 해당 컴포넌트 스타일 가까이에 둔다.
- magic hex 값을 여러 파일에 복제하지 않는다. 토큰을 추가하거나 기존 토큰을 재사용한다.
- 사용 중단된 텍스트 토큰은 호환성 유지용이다. 새 코드에서는 의미 기반 텍스트 토큰을 우선한다.
