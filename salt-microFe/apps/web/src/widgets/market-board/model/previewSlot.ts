import type { ReactNode } from "react";

import type { MarketPreviewSubject } from "@/entities/market";

/**
 * 우측 패널을 그리는 함수. **`pages` 가 주입한다.**
 *
 * 투자 화면의 우측은 AI 코치 패널(`widgets/coach-panel`, `FE-REQ-026` FR-110)이다. 위젯이
 * 다른 위젯을 import 하면 같은 레이어 cross-slice 라 여기서 부를 수 없다 — `pc-panel-grid`
 * 와 같은 방식으로 페이지가 끼운다(`fsd-widgets.md`). 주입이 없으면 시세 프리뷰만 그린다.
 */
export type PreviewRenderer = (subject: MarketPreviewSubject | undefined) => ReactNode;
