---
id: FE-REQ-005
spec: ../../specs/done/FE-REQ-005.md
checklist: ../checklists/FE-REQ-005.md
title: "@repo/ui 토큰·컴포넌트 확장 회고"
date: 2026-09-09
---

# FE-REQ-005 회고

## 무엇을 했나

토큰 12항목을 정합시키고 컴포넌트 25종을 추가했다. 스토리보드 27개 화면을 조립해 보면 앱마다 중복 구현될 프리미티브가 없었던 상태를 메웠다. 브랜드/상승·하락 색과 폰트는 그대로 두고, 중립 스케일 값·타입 리듬·elevation·등가폭 숫자만 바꿨다.

## 잘된 점

- **비파괴로 값만 바꿨다.** 중립 스케일을 교체하면서 키 이름과 개수를 유지해 `apps/**`를 한 줄도 고치지 않았다. `apps`의 `vars.*` 참조 17종이 세 앱 `next build` 타입 체크를 그대로 통과한다. 삭제한 토큰 키는 0개다.
- **접근성 문제를 값으로 해결했다.** 배지 대비 미달은 원래 Open Question이었다. 솔리드 배경 + 흰 글자는 `#FF2E55`에서 3.5:1, `#1677EE`에서 4.0:1로 작은 글자 AA에 못 미친다. 후보 ②안(전부 `neutral.800` 전경)은 상승·하락이 배경 틴트로만 구분되어 의미가 약해지므로, `up/downLight`·`up/downDark`와 `status.*Dark`를 신설해 5.0:1 / 5.6:1로 맞췄다. **컴포넌트에서 우회하지 않고 토큰 층에서 끝냈다.**
- **위계를 그림자에서 밴드로 옮겼다.** `Card`가 무조건 `boxShadow`를 갖고 있어 모든 블록이 같은 무게로 보였다. 기본값을 `none`으로 바꾸고 `ListGroup` + `SectionBand`를 만들었다. 기존 호출부 호환을 위해 `elevation="sm"`을 남기고, 경계가 사라져 보일 곳을 대비해 `bordered`를 미리 넣었다.
- **중복 컴포넌트를 만들지 않았다.** `SegmentedControl`은 pill이 `FilterTabs`, underline이 `Tabs`와 그대로 겹쳐서 제외했다. 대신 `component-index.md`에 "겹치는 컴포넌트 고르기" 표를 넣어 다음 사람이 같은 갭을 다시 판단하지 않게 했다.
- **`typography` 신설로 하드코딩을 끊었다.** `lineHeights`가 존재하는데 어떤 컴포넌트도 참조하지 않고 `Heading` 1.3 / `Text` 1.5를 각자 박아두고 있었다. size와 line-height를 한 쌍으로 묶은 `t1~t8`을 만들고 신규 컴포넌트 전부가 이것만 쓴다.

## 아쉬운 점 / 배운 점

- **`SegmentedControl`을 뺀 대가를 정산하지 않았다.** `FilterTabs`가 사실상 세그먼트 역할을 하는데 `role="tablist"`도 `aria-selected`도 없다. "이미 있으니 안 만든다"는 판단은 맞았지만, 그렇다면 **기존 것을 접근성 기준까지 올리는 작업이 같은 REQ에 들어와야 했다.** 지금은 부채로 남았다.
- **`EmptyState` 이름이 겹쳤다.** `@repo/ui/table`이 이미 표 안 `<tr><td>`용 `EmptyState`를 export하고 있었다. 공개 export를 깨지 않으려고 이름을 바꾸지 않고 경로로만 구분했는데, 같은 이름이 두 경로에 있는 상태는 결국 누군가 헷갈릴 자리다. 갭 분석 때 기존 export 이름까지 대조했어야 했다.
- **`space.lg2`라는 이름이 어색하다.** 기존 키 순서를 깨지 않으려고 `lg`와 `xl` 사이에 `lg2`를 끼웠다. 동작은 맞지만 이름이 스케일을 설명하지 못한다. `space`를 숫자 기반(`s4/s8/s12`)으로 재편하는 건 별도 REQ로 미뤘고, 그 사이에 `lg2`가 코드에 퍼지는 만큼 나중 마이그레이션 비용이 는다.
- **시각 회귀를 안 돌렸다.** 검증 계획 2번(375/390/1440 스크린샷 비교)이 이 REQ의 핵심 리스크였다. 중립 스케일을 열 단계 전부 바꿨으니 의도치 않게 대비가 낮아진 화면이 있을 수 있다. 타입·린트·빌드가 통과한다고 이 리스크가 사라지지 않는다.
- **`colors.ai.primary`를 잠정값으로 넘겼다.** `#20C997`은 흰 글자 대비가 2.2:1이라 텍스트에는 못 쓴다. 그래서 `Badge tone="ai"`는 `ai.lighter` 배경 + `neutral.800` 전경으로 우회했다. 값이 확정되지 않은 채 컴포넌트가 그 값을 참조하기 시작한 상태다.

## Action Items

- [ ] `FilterTabs`에 `role="tablist"` / `aria-selected` / 화살표 키 이동 추가 — high
- [ ] 중립 스케일 교체 후 앱 시각 회귀(375/390/1440 스크린샷 비교) — high
- [ ] `colors.ai.primary` 확정 — medium
- [ ] 320px 폭에서 신규 컴포넌트 전수 브라우저 확인 — medium
- [ ] `EmptyState` 이름 충돌 정리 방안 결정(`Table`의 것을 `TableEmptyState`로 옮길지) — low
- [ ] `space` 키 숫자 기반 재편 여부 결정 — low
- [ ] `fontSizes.base`/`md` 14px 중복 정리 여부 결정 — low

## Quality Score

| 항목 | 점수 | 근거 |
|---|---|---|
| 도메인 경계 | 5/5 | `packages/ui`가 `apps/*`를 import하지 않고 비즈니스 문구도 없다. 커밋에 `apps/**` 0개 |
| 타입 안전성 | 5/5 | `any` 0건, `check-types` 통과, `BottomTabBar`는 5개 제한을 튜플 union으로 강제 |
| SSR/MFE 안정성 | 4/5 | render-time browser API 없음. 다만 앱에 실제 적용해 본 적이 없어 MFE 환경 검증은 빌드 통과까지만 |
| 성능 | 4/5 | Vanilla Extract 정적 추출 유지, 애니메이션은 transform/opacity만. 번들 예산 기준을 다시 써야 함 |
| 접근성 | 4/5 | 부호 문자 병기, 틴트 대비 AA, focus visible 유지. `FilterTabs` 부채와 320px 미확인이 감점 |
