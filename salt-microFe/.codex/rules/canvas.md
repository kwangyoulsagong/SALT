# Canvas 도입 규칙

Canvas는 DOM/SVG/React 렌더링이 병목임을 확인한 뒤 도입한다.

## 도입 조건

- 수천 개 이상의 candle, point, particle, marker를 렌더링한다.
- 초당 업데이트가 잦아 React reconciliation 비용이 크다.
- SVG/DOM 노드 수 때문에 FPS 저하 또는 heap 증가가 관측된다.
- 개별 요소의 DOM 접근성/선택/SEO가 필수 요구사항이 아니다.

## 도입 금지

- 일반 form, table, card, navigation.
- 텍스트 선택, native focus, screen reader semantic이 중요한 UI.
- pagination, virtualization, SVG 최적화, lighter chart로 해결 가능한 경우.
- 측정 없이 "빠를 것 같아서" 도입하는 경우.

## 구현 패턴

- React는 layout, controls, state owner, accessibility wrapper를 담당한다.
- Canvas drawing은 전용 component/hook으로 격리한다.
- draw loop는 `requestAnimationFrame`을 사용하고 unmount 시 cancel한다.
- event listener, observer, worker, chart instance는 unmount에서 정리한다.
- CSS 크기와 backing store 크기를 분리하고 `devicePixelRatio`를 반영한다.
- canvas 밖에 요약 텍스트, label, fallback을 제공한다.

## 메모리 규칙

- 큰 배열은 불변 복사 남발을 피하고 ring buffer/windowing을 검토한다.
- streaming 데이터는 보관 기간과 최대 item 수를 상수로 둔다.
- unmount 후 heap snapshot에서 retained canvas/chart 객체가 남지 않아야 한다.
- OffscreenCanvas/Web Worker는 main-thread 압박이 측정된 뒤 검토한다.

## 도입 보고

- 도입 전 병목: item 수, update 빈도, FPS, heap, profiler 결과.
- 선택한 대안: DOM/SVG/virtualization 대신 canvas를 택한 이유.
- 도입 후 검증: mount/unmount 반복, 장시간 streaming, resize 동작.
