import type { ReactNode } from "react";

import { PANEL_MESSAGES as M } from "../../model";
import * as s from "./ScenarioPanel.css";

export type PanelRowKind = "usual" | "cause" | "company" | "invalidation" | "track";

/** 줄 아이콘 — 뜻은 줄 이름이 말한다(그림은 `aria-hidden`) */
const GLYPH: Record<PanelRowKind, string> = { usual: "↺", cause: "✦", company: "▤", invalidation: "⌁", track: "✓" };

/** 패널 줄 하나 — 왼쪽 아이콘 판 34 + 이름 + 본문(시안 §6). 줄 이름이 머리(h3)다 */
export const PanelRow = ({ kind, children }: { kind: PanelRowKind; children: ReactNode }) => (
  <section className={s.row} aria-labelledby={`panel-row-${kind}`}>
    <span className={s.icon[kind]} aria-hidden="true">
      {GLYPH[kind]}
    </span>
    <div className={s.body}>
      <h3 id={`panel-row-${kind}`} className={s.rowLabel}>
        {M.rows[kind]}
      </h3>
      {children}
    </div>
  </section>
);
