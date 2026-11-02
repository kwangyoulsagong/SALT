import type { KeyboardEvent } from "react";

/**
 * 표 행 선택을 키보드로도 연다 (`FE-REQ-010` FR-60).
 *
 * Space 는 기본 동작이 스크롤이라 막는다. 그러지 않으면 선택과 동시에 목록이 한 화면
 * 내려가서, 방금 고른 행이 시야 밖으로 나간다.
 *
 * 실시간 표와 관심 목록 표가 **같은 규칙**을 쓴다. 두 곳에 복사하면 한쪽만 고쳐진다.
 */
export const selectRowOnKey =
  (onSelect: () => void) => (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect();
  };
