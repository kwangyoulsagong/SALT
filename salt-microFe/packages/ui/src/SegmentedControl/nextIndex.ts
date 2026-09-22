/**
 * radiogroup 화살표 이동 (WAI-ARIA APG "Radio Group").
 *
 * 끝에서 넘어가면 반대쪽 처음으로 돈다. 이동하는 키가 아니면 `null` —
 * 부르는 쪽이 `preventDefault` 를 하지 않고 브라우저에 넘긴다.
 */
export const nextSegmentIndex = (
  key: string,
  current: number,
  length: number,
): number | null => {
  if (length === 0) return null;
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return (current + 1) % length;
    case "ArrowLeft":
    case "ArrowUp":
      return (current - 1 + length) % length;
    case "Home":
      return 0;
    case "End":
      return length - 1;
    default:
      return null;
  }
};
