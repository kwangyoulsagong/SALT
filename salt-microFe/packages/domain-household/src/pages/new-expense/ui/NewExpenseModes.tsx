"use client";

import { useState } from "react";

import { SegmentedControl } from "@repo/ui/segmentedControl";

import { LineEntry, PasteEntry, QuickEntryForm, RECORD_MESSAGES } from "@/features/record-expense";

import { NEW_EXPENSE_PAGE as M } from "../model";

type Mode = "quick" | "line" | "paste";
const MODES: Mode[] = ["quick", "line", "paste"];

/** 적는 방법 셋(`FE-REQ-057` FR-2 · FR-3) — 바꾸면 그 입력이 새로 그려진다(붙여넣은 원문이 다른 방법으로 넘어가지 않는다) */
export const NewExpenseModes = () => {
  const [mode, setMode] = useState<Mode>("quick");
  return (
    <>
      <SegmentedControl label={M.mode} value={mode} onChange={setMode} options={MODES.map((m) => ({ value: m, label: RECORD_MESSAGES.modes[m] }))} />
      {mode === "quick" ? <QuickEntryForm /> : mode === "line" ? <LineEntry /> : <PasteEntry />}
    </>
  );
};
