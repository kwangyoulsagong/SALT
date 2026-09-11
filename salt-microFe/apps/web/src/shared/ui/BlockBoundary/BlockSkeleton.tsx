import { Skeleton } from "@repo/ui/skeleton";

import { BOUNDARY_MESSAGES } from "@/shared/i18n";

export type BlockSkeletonProps = {
  /** 블록 이름. 스크린리더에 "…불러오는 중"으로 읽힌다. */
  name: string;
  /**
   * **실제 블록과 같은 높이**를 준다 (FE-REQ-008 NFR·접근성).
   * 스켈레톤이 실제보다 짧으면 스트리밍이 레이아웃 시프트를 만들어 이득을 상쇄한다.
   */
  minHeight: number;
  lines?: number;
};

/**
 * 스트리밍 대기 중인 블록의 자리표시자.
 *
 * `aria-busy`는 여기 달린다. 블록이 도착하면 이 트리 전체가 실제 블록으로 교체되므로
 * **도착 시 자동으로 해제**된다 — 따로 끄는 코드가 없다.
 */
export const BlockSkeleton = ({
  name,
  minHeight,
  lines = 3,
}: BlockSkeletonProps) => {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      role="status"
      style={{ minHeight, padding: 16, width: "100%" }}
    >
      <span
        style={{
          border: 0,
          clip: "rect(0 0 0 0)",
          height: 1,
          overflow: "hidden",
          position: "absolute",
          whiteSpace: "nowrap",
          width: 1,
        }}
      >
        {BOUNDARY_MESSAGES.loading(name)}
      </span>
      <Skeleton lines={lines} height={20} />
    </div>
  );
};

export default BlockSkeleton;
