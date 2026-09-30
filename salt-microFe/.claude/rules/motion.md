---
globs: apps/web/src/**, packages/ui/src/**, packages/tokens/src/**
---

# 모션 · 그래픽 규칙

근거 `FE-REQ-044`. 상태가 바뀌는 자리에는 **그래픽 한 장 + 짧은 움직임**을 둔다. 글자만 바뀌는 완료 · 빈 상태를 새로 만들지 않는다.

## 1. 무엇을 쓰나

| 필요 | 쓰는 것 | 위치 |
|---|---|---|
| 완료 · 진행 · 빈 상태 · 오류 · 막힘 | `StatusGraphic` | `@repo/ui/statusGraphic` |
| 기능 의미를 보여 주는 한 장면 | `Illustration` | `@repo/ui/illustration` |
| 누름 · 숫자 · 등장 · 탭 · 시트 | `@repo/ui` 컴포넌트에 이미 들어 있다 | 앱에서 다시 만들지 않는다 |
| 위에 없는 움직임 | `motion/react` + `@repo/tokens` `motion` | 컴포넌트 옆 |

- 결과 화면은 `EmptyState` + `icon={<StatusGraphic kind="success" />}`. **새 결과 컴포넌트를 만들지 않는다.**
- 새 장면이 필요하면 `Illustration` 에 `scene` 을 추가한다(Storybook 포함). 앱에 SVG 를 흩지 않는다.
- 배치는 `FE-REQ-044` 배치표가 기준이다. 표에 없는 자리에 넣을 때는 표에 행부터 추가한다.

## 2. 라이브러리

- 웹은 `framer-motion` v12. **`m` 과 named import 만** 쓴다 — `motion` 컴포넌트 · `motion/react` 는 ESLint 가 막는다(둘 다 드래그 · 레이아웃까지 실어 첫 로드 JS 가 45 kB 늘었다).
- 기능 묶음(`domAnimation`)은 앱 루트 `MotionProvider` 의 `LazyMotion` 이 **동적 import** 로 싣는다. 컴포넌트는 `m` 으로만 쓴다.
- Lottie · GIF · 동영상 · 외부 그래픽 파일 금지. 인라인 SVG 만 — 색 토큰을 따라야 하고 요청이 늘면 안 된다.
- RN 은 `react-native-reanimated` 로 **같은 토큰**을 읽는다.

## 3. 값은 토큰에서

```ts
import { tokens } from "@repo/tokens";
const { duration, easing, spring } = tokens.motion;

<m.div transition={{ duration: duration.base, ease: easing.enter }} />
<m.div transition={{ type: "spring", ...spring.bouncy }} />
```

- `*.css.ts` 의 `@keyframes` · `transition` 은 `vars.motion.duration.*` · `vars.motion.easing.*`(문자열).
- `0.3`, `"ease-out"`, `stiffness: 400` 같은 숫자를 컴포넌트에 쓰지 않는다. 새 값이 필요하면 토큰을 추가한다.
- 2026-09-30 이전 keyframes 중 값이 토큰과 **같은 것만** 토큰으로 바꿨다. 다른 값(해설 · 예측 · 사건 카드의 개별 안무, 등락률 깜빡임)은 이전 결정이라 그대로 둔다 — 새 코드에서 따라 하지 않는다.
- 블록 등장은 `@repo/ui/enterReveal`(`.css.ts` 전용 — `keyframes` 는 런타임 barrel 에서 내보낼 수 없다)을 base 에 펼친다. `Card` · 앱 `panel` 표면에 이미 있다.

| 토큰 | 값 | 쓰는 곳 |
|---|---|---|
| `duration.instant` | 0.12s | 누름 · 토글 |
| `duration.base` | 0.24s | 등장 · 퇴장 · 탭 밑줄 · 숫자 |
| `duration.slow` | 0.4s | 카드 · 패널 진입 |
| `duration.scene` | 0.9s | 일러스트 한 장면 |
| `spring.snappy` | 튀지 않음 | 누름 복귀 · 칩 |
| `spring.bouncy` | 한 번 출렁 | 착지 · 체크 · 배지 |
| `spring.gentle` | 느긋 | 시트 · 큰 면 |

## 4. 움직임 원칙

1. **한 장면은 1초 안에 끝나고 마지막 프레임에 멈춘다.** 무한 반복은 진행 중(로딩 · 스트리밍)에만.
2. **움직임은 의미를 따른다.** 모인다 = 위→아래 · 분석 = 왼쪽부터 차례 · 완료 = 선이 그려지고 튄다 · 오류 = 좌우 한 번.
3. **들어올 땐 `easing.enter`, 나갈 땐 `easing.exit`.** 나갈 때가 더 짧다.
4. **이동 거리는 작게.** 등장 8px · 누름 0.97. 화면 밖에서 날아오지 않는다(시트 제외).
5. **한 화면에 동시에 움직이는 장면은 하나.** 카드 차례 등장은 장면이 아니라 배경이다.
6. **문장이 주인공.** 그래픽은 `aria-hidden`. 그래픽을 지워도 문장만으로 뜻이 통해야 한다.

## 5. 성능

- `transform` · `opacity` 만 애니메이션한다. `width` · `height` · `top` · `left` · `box-shadow` 금지(`layout` prop 도 목록 재정렬에만).
- 첫 화면 밖 그래픽은 `whileInView` + `viewport={{ once: true }}` — 안 보이면 돌지 않는다.
- 표 안 시세처럼 초당 여러 번 바뀌는 값에 숫자 굴러가기를 쓰지 않는다. **가격에 깜빡임도 넣지 않는다**(사용자 결정 2026-09-30) — 기존 등락률 칸 깜빡임만 있다.
- 스크롤에 묶인 애니메이션 금지(`performance.md`).

## 6. SSR · 하이드레이션

- 그래픽은 서버에서 **마지막 프레임**으로 그린다. `initial` 을 숨김으로 두어 서버 HTML 에 빈칸이 생기게 하지 않는다.
  첫 진입에서만 재생하려면 마운트 후 `useAnimate` 로 시작하거나 `initial={false}` 를 쓴다.
- `window` · `matchMedia` 를 렌더 중에 읽지 않는다. 줄인 모션은 `MotionConfig reducedMotion="user"` 가 처리한다.
- 스트리밍으로 늦게 오는 블록의 등장은 블록 컴포넌트가 아니라 `SectionBoundary`/카드 한 곳에서 준다.

## 7. 접근성 — 줄인 모션

- 앱 루트 `MotionConfig reducedMotion="user"` — 이동 · 크기 · 회전은 꺼지고 투명도만 남는다.
- `*.css.ts` 의 keyframes 는 `@media (prefers-reduced-motion: reduce)` 에서 끈다.
- **진행 표시는 멈추지 않고 느려진다** — 필수 피드백이다.
- 깜빡임은 초당 3회 미만. 번쩍이는 전체 화면 전환 금지.

## 8. 제품 기준 (타협 대상 아님)

- **수익 · 매매 결과를 축하하지 않는다.** 성공 그래픽은 "기록됐다 · 분석이 끝났다 · 설정했다" 사실에만.
  손익 숫자에 폭죽 · 반짝임 · 맥박 금지 — 확신 표현(마스터 인덱스 §6-4)과 같은 효과다.
- 추천 · 판정 · 전망 카드에 시선을 끄는 반복 모션(맥박 · 흔들림 · 반짝임) 금지.
- 상승 · 하락 깜빡임은 방향 사실만. 색 + 글자 부호를 같이 둔다(색만으로 전달 금지).

## 9. 금지 요약

- ❌ 완료를 글자만 바꿔 알리기 — `StatusGraphic` 을 둔다
- ❌ 컴포넌트에 길이 · 이징 · 스프링 숫자 직접
- ❌ `motion` 컴포넌트 · `motion/react` import(ESLint) · Lottie · GIF
- ❌ 레이아웃 속성 애니메이션 · 스크롤 연동
- ❌ 서버 HTML 에 그래픽 빈칸(`initial` 숨김)
- ❌ 수익 축하 · 판정 카드 맥박
