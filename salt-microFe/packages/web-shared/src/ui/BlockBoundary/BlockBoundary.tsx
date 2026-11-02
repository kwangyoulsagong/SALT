"use client";

import { Suspense, type ReactNode } from "react";
import { SectionBoundary } from "../SectionBoundary/SectionBoundary";
import { BlockSkeleton } from "./BlockSkeleton";

type BlockBoundaryProps = {
  /** 블록 이름. 스켈레톤과 실패 문구에 쓰인다. */
  name: string;
  /** 실제 블록과 같은 높이. 레이아웃 시프트를 막는다. */
  minHeight: number;
  /** 기본 스켈레톤 대신 쓸 자리표시자. */
  skeleton?: ReactNode;
  children: ReactNode;
};

/**
 * 스트리밍 블록 경계 (FE-REQ-008 FR-20 · FR-21, `.claude/rules/streaming-ssr.md` §3).
 *
 * **부분 지연과 부분 실패를 함께 격리한다.**
 * - `Suspense` — 이 블록이 느려도 나머지 블록이 먼저 페인트된다
 * - error boundary — 이 블록이 죽어도 화면 전체가 죽지 않는다
 *
 * 이 파일이 `"use client"`인 이유는 **error boundary 가 클래스 컴포넌트여야 하기 때문**이다.
 * `children` 으로 들어오는 서버 컴포넌트는 서버에서 렌더된 채로 꽂히므로,
 * 이 경계를 쓴다고 블록이 클라이언트로 내려가지 않는다.
 *
 * 경계는 **화면당 5개 이하**로 유지한다 (FR-26). 많으면 레이아웃 시프트가 늘고
 * TTFB 이득이 사라진다.
 */
export const BlockBoundary = ({
  name,
  minHeight,
  skeleton,
  children,
}: BlockBoundaryProps) => {
  return (
    <SectionBoundary name={name}>
      <Suspense
        fallback={skeleton ?? <BlockSkeleton name={name} minHeight={minHeight} />}
      >
        {children}
      </Suspense>
    </SectionBoundary>
  );
};

export default BlockBoundary;
