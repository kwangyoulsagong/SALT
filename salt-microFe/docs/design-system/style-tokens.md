# 스타일 토큰

`@repo/ui`의 공통 토큰은 `packages/ui/src/styles/tokens.css.ts`의 `vars`를 기준으로 한다. 앱 또는 컴포넌트 스타일에서 색상, 간격, 타이포그래피, radius, shadow, z-index가 필요하면 먼저 이 문서를 확인한다.

앱에서 토큰이 필요하면 공개 subpath로만 가져온다.

```ts
import { vars } from "@repo/ui/tokens";
```

`packages/ui/src/**` deep import는 금지한다.

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
| `vars.radius.button.sm` | `8px` | 작은 버튼·칩 |
| `vars.radius.button.md` | `10px` | 기본 버튼 |
| `vars.radius.button.lg` | `14px` | 큰 버튼 |
| `vars.radius.button.xl` | `16px` | 하단 CTA (height 56) |

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

AI/LLM 생성물은 브랜드 보라와 구분되는 별도 액센트를 쓴다. 브랜드 요소와 모델이 만든 문장이 같은 색이면 둘을 구분할 수 없다.

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `vars.colors.ai.primary` | `#20C997` | 아이콘·강조선. 값은 잠정 |
| `vars.colors.ai.light` | `#63E6BE` | 약한 강조 |
| `vars.colors.ai.lighter` | `#E6FCF5` | 배지·카드 배경 |

### 중립

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `vars.colors.neutral.50` | `#F9FAFB` | 가장 옅은 배경 |
| `vars.colors.neutral.100` | `#F2F4F6` | 그룹 배경·`SectionBand` |
| `vars.colors.neutral.200` | `#E5E8EB` | 경계선 |
| `vars.colors.neutral.300` | `#D1D6DB` | 비활성 경계 |
| `vars.colors.neutral.400` | `#B0B8C1` | 회색 문자·비활성 |
| `vars.colors.neutral.500` | `#8B95A1` | 보조 문자 |
| `vars.colors.neutral.600` | `#6B7684` | 중간 위계 문자 |
| `vars.colors.neutral.700` | `#4E5968` | 강한 보조 문자 |
| `vars.colors.neutral.800` | `#333D4B` | 본문 강조 |
| `vars.colors.neutral.900` | `#191F28` | 가장 진한 문자 |

명도 간격이 균등하다. 이전 스케일은 400과 500이 거의 같고 500에서 600으로 급격히 어두워져 중간 위계를 만들 단계가 없었다. 키 이름과 개수는 그대로이므로 앱 코드는 수정 없이 값만 바뀐다.

### 텍스트

| 토큰 | 값 | 비고 |
| --- | --- | --- |
| `vars.colors.text.primary` | `#191F28` | 기본 본문 |
| `vars.colors.text.secondary` | `#2A282F` | 보조 본문 |
| `vars.colors.text.tertiary` | `#8B95A1` | 부가 정보 |
| `vars.colors.text.disabled` | `#B0B8C1` | 비활성 |
| `vars.colors.text.white` | `#FFFFFF` | 흰색 텍스트 |
| `vars.colors.text.inverse` | `#FFFFFF` | 어두운 배경 위 텍스트 |
| `vars.colors.text.lightGray` | `#6B7684` | 약한 본문 |
| `vars.colors.text.base` | `#FFFFFF` | 사용 중단 |
| `vars.colors.text.nickname` | `#2A282F` | 사용 중단 |
| `vars.colors.text.email` | `#B0B8C1` | 사용 중단 |
| `vars.colors.text.H2` | `#191F28` | 사용 중단 |

### 상태와 특수 색상

| 토큰 그룹 | 토큰 |
| --- | --- |
| `vars.colors.status` | `success`, `successHover`, `successLight`, `successDark`, `error`, `errorHover`, `errorLight`, `errorDark`, `warning`, `warningHover`, `warningLight`, `warningDark`, `info`, `infoHover`, `infoLight`, `infoDark` |
| `vars.colors.special` | `orange*`, `purple*`, `pink*`, `teal*`, `up`, `upLight`, `upDark`, `down`, `downLight`, `downDark` |
| `vars.colors.border` | `light: #E5E8EB`, `default: #D1D6DB`, `dark: #B0B8C1`, `focus`, `lightDark`, `black` |
| `vars.colors.shadow` | `sm`, `md`, `lg`, `xl` — **사용 중단.** 완성된 그림자는 `vars.elevation.*` |
| `vars.colors.overlay` | `light`, `medium`, `dark`, `darker` |

`*Light` / `*Dark`는 틴트 배지용 쌍이다. 솔리드 배경 + 흰 글자는 작은 글자에서 WCAG AA(4.5:1)에 못 미친다. `#FF2E55` 위 흰 글자는 3.5:1, `#1677EE` 위 흰 글자는 4.0:1이다. `upLight` 배경 + `upDark` 전경은 5.0:1, `downLight` + `downDark`는 5.6:1로 통과한다.

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `vars.colors.special.up` | `#FF2E55` | 상승. 큰 숫자 전경 |
| `vars.colors.special.upLight` | `#FFE9ED` | 상승 배지 배경 |
| `vars.colors.special.upDark` | `#C9182F` | 상승 배지 전경 |
| `vars.colors.special.down` | `#1677EE` | 하락. 큰 숫자 전경 |
| `vars.colors.special.downLight` | `#E8F2FE` | 하락 배지 배경 |
| `vars.colors.special.downDark` | `#0B5BC4` | 하락 배지 전경 |

## 간격

| 토큰 | 값 |
| --- | --- |
| `vars.space.none` | `0` |
| `vars.space.xs` | `4px` |
| `vars.space.sm` | `8px` |
| `vars.space.md` | `12px` |
| `vars.space.lg` | `16px` |
| `vars.space.lg2` | `20px` — 리스트 행·그룹 헤더 좌우 패딩 |
| `vars.space.xl` | `24px` |
| `vars.space["2xl"]` | `32px` |
| `vars.space["3xl"]` | `48px` |
| `vars.space["4xl"]` | `64px` |
| `vars.space["5xl"]` | `80px` |
| `vars.space["6xl"]` | `96px` |

## 타이포그래피

`vars.typography.t1~t8`은 size와 line-height를 한 쌍으로 묶는다. 신규 컴포넌트는 `fontSizes` + 하드코딩한 배수 대신 이 그룹을 쓴다.

| 토큰 | size | line-height | 용도 |
| --- | --- | --- | --- |
| `vars.typography.t1` | `30px` | `40px` | 총자산·현재가. 화면당 1개 |
| `vars.typography.t2` | `26px` | `35px` | 큰 금액 |
| `vars.typography.t3` | `22px` | `31px` | 섹션 대표 숫자 |
| `vars.typography.t4` | `20px` | `29px` | 화면 제목 |
| `vars.typography.t5` | `17px` | `25.5px` | 그룹 제목·강조 본문 |
| `vars.typography.t6` | `15px` | `22.5px` | 리스트 행 본문 |
| `vars.typography.t7` | `13px` | `19.5px` | 보조 문자 |
| `vars.typography.t8` | `11px` | `16.5px` | 배지·캡션 |

`fontSizes`는 호환을 위해 남아 있다. `base`와 `md`가 둘 다 `14px`로 중복이다.

| 토큰 그룹 | 토큰 |
| --- | --- |
| `vars.fontSizes` | `xs: 10px`, `sm: 12px`, `base/md: 14px`, `lg: 16px`, `xl: 18px`, `2xl: 20px`, `3xl: 24px`, `4xl: 32px`, `5xl: 40px`, `6xl: 48px` |
| `vars.fontWeights` | `light: 300`, `regular: 400`, `medium: 500`, `semibold: 600`, `bold: 700`, `extrabold: 800` |
| `vars.fontFamily` | `base`, `sans`, `korean`, `secondary` |
| `vars.lineHeights` | `tight`, `snug`, `normal`, `relaxed`, `loose` |
| `vars.letterSpacings` | `tighter: -0.05em`, `tightest: -0.03em`, `tight: -0.02em`, `normal`, `wide`, `wider` |
| `vars.numeric.tabular` | `tabular-nums`. 시세·금액은 자리가 흔들리지 않아야 한다 |

## 그림자

카드에는 기본적으로 그림자를 쓰지 않는다. 모든 블록에 그림자가 깔리면 무게가 같아져 위계가 사라진다. 섹션은 흰 배경 그룹(`ListGroup`)과 회색 밴드(`SectionBand`)로 끊고, 그림자는 실제로 떠 있어야 하는 것에만 쓴다.

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `vars.elevation.none` | `none` | 기본값 |
| `vars.elevation.sm` | `0 1px 2px rgba(25,31,40,.04), 0 2px 8px rgba(25,31,40,.04)` | 살짝 떠 있는 카드 |
| `vars.elevation.md` | `0 4px 16px rgba(25,31,40,.08)` | 떠 있는 카드·팝오버 |
| `vars.elevation.lg` | `0 18px 50px rgba(25,31,40,.18)` | 모달 |
| `vars.elevation.sheet` | `0 -8px 30px rgba(25,31,40,.16)` | 아래에서 올라오는 시트 |

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
- 새 컴포넌트는 `fontSizes` + `lineHeights` 조합 대신 `typography.t1~t8`을 쓴다.
- 그림자는 `colors.shadow.*`를 직접 조합하지 말고 `elevation.*`을 쓴다.
- 숫자를 표시하는 곳에는 `numeric.tabular`를 함께 적용한다.
