"use client";

import Link from "next/link";

import { WHY_MOVED_MESSAGES as M } from "../../model/whyMovedMessages";

import { WHY_MOVED_ANCHOR_ID } from "@repo/web-shared/config";
import { rowChip } from "./CauseFlow.css";

/**
 * 시장 표 행 "왜?"(F016 단계 C · `FE-REQ-063` FR-6) — 카드가 서는 날인 행에만(서버 `moveCard`). 누르면 상세 한 장 패널의 "왜 움직였나" 줄로(F017 v4 순서 6).
 * 행 전체 누름과 겹쳐 두 번 가지 않게 멈춘다(이름 링크와 같은 규칙). 같은 zone 안 이동이라 `next/link`
 */
export const WhyMovedRowChip = ({ href, name }: { href: string; name: string }) => (
  <Link
    href={`${href}#${WHY_MOVED_ANCHOR_ID}`}
    prefetch={false}
    className={rowChip}
    aria-label={M.rowChipLabel(name)}
    onClick={(event) => event.stopPropagation()}
  >
    {M.rowChip}
  </Link>
);
