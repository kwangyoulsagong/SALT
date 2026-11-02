"use client";

import type { CoachMode, CoachProfileSettings, CoachProfileUpdate } from "@repo/core/coach";
import { SegmentedControl } from "@repo/ui/segmentedControl";
import { StatusLine } from "@repo/ui/statusLine";
import { TextField } from "@repo/ui/textField";
import { useId, useState, type FormEvent } from "react";

import {
  COACH_MESSAGES,
  PANIC_SELL_WINDOW_MAX_HOURS as MAX,
  PANIC_SELL_WINDOW_MIN_HOURS as MIN,
} from "@/entities/coach";

import { useEditCoachProfile } from "../api";
import { formatHoursInput, toWindowHours } from "../lib";
import { EDIT_COACH_PROFILE_MESSAGES as MSG } from "../model";
import { actions, field, form, hint, hoursField, label, primaryButton, row, unit } from "./CoachProfileForm.css";

const MODE_OPTIONS: { label: string; value: CoachMode }[] = [
  { label: COACH_MESSAGES.modes.scalp, value: "scalp" },
  { label: COACH_MESSAGES.modes.long_term, value: "long_term" },
];

/**
 * 코치 설정 폼 (F004 FR-12 · `FE-REQ-026` FR-80~82) — 기본 모드 · 매도 돌아보는 기간.
 *
 * - **바꾼 칸만 보낸다** — 한 칸이 응답에서 빠져(`null`) 그 칸을 못 그려도 다른 칸은 저장된다
 * - 서버가 모르는 값을 보냈으면(`null`) 그 칸만 "불러오지 못했어요" — 기본값을 지어 채우지 않는다
 * - 저장 응답이 곧 새 설정이다 — 비교 기준은 늘 지금 캐시(`settings`)
 */
export const CoachProfileForm = ({ settings }: { settings: CoachProfileSettings }) => {
  const [mode, setMode] = useState<CoachMode | null>(settings.defaultMode);
  const [hoursText, setHoursText] = useState(
    settings.panicSellWindowHours === null ? "" : String(settings.panicSellWindowHours),
  );
  const save = useEditCoachProfile();
  const windowId = useId();

  const hours = toWindowHours(hoursText);
  const windowKnown = settings.panicSellWindowHours !== null;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (windowKnown && hours === undefined) return;
    const body: CoachProfileUpdate = {
      ...(mode !== null && mode !== settings.defaultMode ? { defaultMode: mode } : {}),
      ...(hours !== undefined && hours !== settings.panicSellWindowHours ? { panicSellWindowHours: hours } : {}),
    };
    if (Object.keys(body).length === 0) return;
    save.mutate(body);
  };

  return (
    <form className={form} onSubmit={onSubmit} noValidate>
      <div className={row}>
        {/* 보이는 이름 — 세그먼트는 `radiogroup` 이고 같은 이름을 `label` 로 따로 갖는다 */}
        <span className={label} aria-hidden>
          {MSG.defaultMode}
        </span>
        <div className={field}>
          {mode === null ? (
            <StatusLine kind="error">{MSG.fieldUnavailable}</StatusLine>
          ) : (
            <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} label={MSG.defaultMode} />
          )}
          <p className={hint}>{MSG.defaultModeHint}</p>
        </div>
      </div>

      <div className={row}>
        <label className={label} htmlFor={windowId}>
          {MSG.window}
        </label>
        <div className={field}>
          {windowKnown ? (
            <div className={hoursField}>
              <TextField
                id={windowId}
                variant="compact"
                inputMode="numeric"
                autoComplete="off"
                value={hoursText}
                onChange={(text) => setHoursText(formatHoursInput(text))}
                trailing={<span className={unit}>{MSG.windowUnit}</span>}
                error={hours === undefined ? MSG.invalidWindow(MIN, MAX) : undefined}
              />
            </div>
          ) : (
            <StatusLine kind="error">{MSG.fieldUnavailable}</StatusLine>
          )}
          <p className={hint}>{MSG.windowHint(MIN, MAX)}</p>
        </div>
      </div>

      <div className={actions}>
        <button type="submit" className={primaryButton} disabled={save.isPending}>
          {save.isPending ? MSG.saving : MSG.save}
        </button>
        <div aria-live="polite">
          {/* 저장 결과는 글자만 바꾸지 않고 그래픽과 함께 (FE-REQ-044 P-5) */}
          {save.isSuccess && <StatusLine kind="success">{MSG.saved}</StatusLine>}
          {save.isError && <StatusLine kind="error">{MSG.failed}</StatusLine>}
        </div>
      </div>
    </form>
  );
};
