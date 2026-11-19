"use client";

import { useState } from "react";

import { SegmentedControl } from "@repo/ui/segmentedControl";

import { useDesktopViewport } from "@repo/web-shared/lib";

import { LineEntry, PasteEntry, QuickEntryForm, RECORD_MESSAGES } from "@/features/record-expense";

import { NEW_EXPENSE_PAGE as M } from "../model";

type Mode = "quick" | "line" | "paste";
const MODES: Mode[] = ["quick", "line", "paste"];

/**
 * 적는 방법 셋(`FE-REQ-057` FR-2 · FR-3) — 바꾸면 그 입력이 새로 그려진다(붙여넣은 원문이 다른 방법으로 넘어가지 않는다).
 * 1024 이상은 조밀한 입력(32) · 데스크톱 주 버튼(`FE-REQ-060` FR-6 · H6), 그보다 좁으면(태블릿 · 앱 웹뷰) 손가락 크기 그대로
 */
export const NewExpenseModes = () => {
  const [mode, setMode] = useState<Mode>("quick");
  const desktop = useDesktopViewport();
  return (
    <>
      <SegmentedControl label={M.mode} value={mode} onChange={setMode} options={MODES.map((m) => ({ value: m, label: RECORD_MESSAGES.modes[m] }))} />
      {mode === "quick" ? <QuickEntryForm compact={desktop} expanded /> : mode === "line" ? <LineEntry /> : <PasteEntry />}
    </>
  );
};
