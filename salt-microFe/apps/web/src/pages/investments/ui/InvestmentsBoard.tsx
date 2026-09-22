"use client";

// 클라이언트 잎: 우측 패널을 함수로 주입한다. 서버 컴포넌트는 함수를 props 로 넘길 수 없다.
import dynamic from "next/dynamic";

import { MarketBoard, type PreviewRenderer } from "@/widgets/market-board";

/**
 * 우측 AI 코치 패널 (`FE-REQ-026` K). **`next/dynamic` 으로 부른다.**
 *
 * 정적으로 import 하면 패널이 쓰는 `@/entities/market` barrel(프리뷰 · 차트)이 페이지
 * 첫 로드에 들어온다 — `market-board/model/index.ts` 에 적힌 125 → 178 kB 회귀가 그것이다.
 * 표 잎(`RealtimeMarketTable`)과 같이 `ssr:false` 다: 패널은 선택 행과 토큰이 있어야
 * 그릴 수 있고 둘 다 브라우저에만 있다.
 */
const CoachPanel = dynamic(
  () => import("@/widgets/coach-panel").then((mod) => mod.CoachPanel),
  { ssr: false, loading: () => null },
);

/** 모듈 상수 — 렌더마다 새 함수를 만들지 않는다 */
const renderCoachPanel: PreviewRenderer = (subject) => (
  <CoachPanel subject={subject} />
);

/**
 * 시세 보드 + 우측 AI 코치 패널 조합. `widgets` 끼리 import 할 수 없어서 조합은 페이지가
 * 한다(`fsd-widgets.md` — `pc-panel-grid` 와 같은 방식).
 */
export const InvestmentsBoard = () => <MarketBoard renderPreview={renderCoachPanel} />;

export default InvestmentsBoard;
