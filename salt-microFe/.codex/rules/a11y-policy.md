# 접근성 정책

- semantic HTML을 우선한다.
- click 가능한 div 대신 button/a를 사용한다.
- icon-only button에는 `aria-label` 또는 visible label을 제공한다.
- form input은 label 또는 accessible name을 가져야 한다.
- focus outline을 제거하지 않는다. 디자인상 변경 시 대체 focus style을 둔다.
- modal, dropdown, tab, menu는 keyboard interaction을 고려한다.
- canvas/chart는 외부에 요약 텍스트 또는 table fallback을 제공한다.
- 색상만으로 상태를 표현하지 않는다.
- animation은 `prefers-reduced-motion`을 고려한다.
