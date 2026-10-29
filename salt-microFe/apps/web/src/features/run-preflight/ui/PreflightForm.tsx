"use client";

import type { PreflightMode, TradePreflightRequest } from "@repo/core/coach";
import { Chip } from "@repo/ui/chip";
import { TextField } from "@repo/ui/textField";
import { useEffect, useId, useMemo, useState } from "react";

import { formatAmountInput, parseAmountInput, useDebouncedValue } from "@/shared/lib";

import { useTradePreflight } from "../api";
import { PREFLIGHT_AMOUNT_CHIPS, PREFLIGHT_STOP_CHIPS, RUN_PREFLIGHT_MESSAGES as MSG } from "../model";
import { PreflightResult } from "./PreflightResult";
import { chips, closing, fieldBelow, inputWithAction, label, rows, unit, weakButton } from "./Preflight.css";

/** FEATURE-009 UX 와 같다 — 입력이 멈추고 300ms 뒤 계산 */
const PREFLIGHT_DEBOUNCE_MS = 300;

interface PreflightFormProps {
  symbol: string;
  /** 지금 보는 판단 모드 — 손절 없음 경고의 세기가 모드마다 다르다(서버) */
  mode: PreflightMode;
  /** 현재가(원) — 실시간 값, 없으면 서버 공개 시세. 진입가 첫 값 · [현재가] 버튼이 옮겨 적는다 — 계산하지 않는다 */
  livePrice: number | null;
}

/**
 * 주문 전 체크 입력 + 결과 (F004 FR-30 · `FE-REQ-026` FR-150~156).
 *
 * ## 이 폼이 하지 않는 것
 *
 * - **주문하지 않는다.** 주문 버튼 · 외부 주문 링크가 없다. 끝은 "직접 주문" 한 줄이다(FR-150)
 * - **막지 않는다.** 상한을 넘어도 결과가 나온다 — 배지가 사실을 말할 뿐이다(FR-156)
 * - **계산하지 않는다.** 손절 칩은 비율을 그대로 보내고 가격 환산은 서버가 한다(FR-153)
 * - **목표가를 채우지 않는다.** 비우면 손익비 자리에 안내만 둔다(FR-151)
 *
 * 진입가는 현재가로 한 번 채우고 그 뒤로는 따라가지 않는다 — 시세가 틱마다 바뀌면 결과 줄이 계속 다시 계산되며
 * 흔들린다. 다시 맞추려면 [현재가].
 */
export const PreflightForm = ({ symbol, mode, livePrice }: PreflightFormProps) => {
  const ids = { amount: useId(), entry: useId(), target: useId() };
  const [amount, setAmount] = useState("");
  const [entry, setEntry] = useState("");
  const [entryTouched, setEntryTouched] = useState(false);
  const [stopRate, setStopRate] = useState<number | null>(null);
  const [target, setTarget] = useState("");

  // 진입가 기본 = 현재가(FR-151). 사용자가 손대기 전, 첫 시세가 왔을 때 한 번만
  useEffect(() => {
    if (entryTouched || livePrice === null) return;
    setEntry((current) => current || formatAmountInput(String(livePrice)));
  }, [livePrice, entryTouched]);

  const parsed = {
    amount: parseAmountInput(amount),
    entry: parseAmountInput(entry),
    target: parseAmountInput(target),
  };
  const amountInvalid = amount.trim() !== "" && parsed.amount === null;
  const targetInvalid = target.trim() !== "" && parsed.target === null;

  const input = useMemo<TradePreflightRequest | null>(() => {
    if (parsed.amount === null || parsed.entry === null) return null;
    return {
      symbol,
      mode,
      entryPrice: parsed.entry,
      amount: parsed.amount,
      takeProfitPrices: parsed.target !== null ? [parsed.target] : [],
      ...(stopRate !== null ? { stopLossRate: stopRate } : {}),
    };
  }, [symbol, mode, parsed.amount, parsed.entry, parsed.target, stopRate]);
  const debounced = useDebouncedValue(input, PREFLIGHT_DEBOUNCE_MS);
  const preflight = useTradePreflight(debounced);
  const waitingDebounce = input !== debounced;

  return (
    <>
      <div className={rows}>
        <span className={label}>{MSG.amountLabel}</span>
        <div className={chips} role="group" aria-label={MSG.amountChipsLabel}>
          {PREFLIGHT_AMOUNT_CHIPS.map((chip) => (
            <Chip
              key={chip.value}
              size="sm"
              selected={parsed.amount === chip.value}
              onPress={() => setAmount(formatAmountInput(String(chip.value)))}
            >
              {chip.label}
            </Chip>
          ))}
        </div>
        <TextField
          id={ids.amount}
          className={fieldBelow}
          variant="compact"
          inputMode="numeric"
          autoComplete="off"
          aria-label={MSG.amountCustomLabel}
          value={amount}
          onChange={(value) => setAmount(formatAmountInput(value))}
          trailing={<span className={unit}>{MSG.amountUnit}</span>}
          error={amountInvalid ? MSG.invalidAmount : undefined}
        />

        <label className={label} htmlFor={ids.entry}>
          {MSG.entryLabel}
        </label>
        <div className={inputWithAction}>
          <TextField
            id={ids.entry}
            variant="compact"
            inputMode="decimal"
            autoComplete="off"
            value={entry}
            onChange={(value) => {
              setEntryTouched(true);
              setEntry(formatAmountInput(value));
            }}
            trailing={<span className={unit}>{MSG.amountUnit}</span>}
          />
          <button
            type="button"
            className={weakButton}
            aria-label={MSG.useLivePriceLabel}
            disabled={livePrice === null}
            onClick={() => livePrice !== null && setEntry(formatAmountInput(String(livePrice)))}
          >
            {MSG.useLivePrice}
          </button>
        </div>

        <span className={label}>{MSG.stopLabel}</span>
        <div className={chips} role="group" aria-label={MSG.stopChipsLabel}>
          {PREFLIGHT_STOP_CHIPS.map((chip) => (
            <Chip
              key={chip.value}
              size="sm"
              selected={stopRate === chip.value}
              // 다시 누르면 뺀다 — 손절 없음도 고를 수 있는 상태다(서버가 경고만 한다)
              onPress={() => setStopRate((current) => (current === chip.value ? null : chip.value))}
            >
              {chip.label}
            </Chip>
          ))}
        </div>

        <label className={label} htmlFor={ids.target}>
          {MSG.targetLabel}
        </label>
        <TextField
          id={ids.target}
          variant="compact"
          inputMode="decimal"
          autoComplete="off"
          placeholder={MSG.targetPlaceholder}
          value={target}
          onChange={(value) => setTarget(formatAmountInput(value))}
          trailing={<span className={unit}>{MSG.amountUnit}</span>}
          error={targetInvalid ? MSG.invalidAmount : undefined}
        />
      </div>

      <PreflightResult
        // 실패하면 이전 결과를 두지 않는다 — 지금 입력의 값처럼 읽힌다
        result={input === null || preflight.isError ? null : (preflight.data ?? null)}
        isError={input !== null && preflight.isError}
        isPending={input !== null && (waitingDebounce || preflight.isFetching)}
        hasTarget={parsed.target !== null}
      />
      <p className={closing}>{MSG.closing}</p>
    </>
  );
};
