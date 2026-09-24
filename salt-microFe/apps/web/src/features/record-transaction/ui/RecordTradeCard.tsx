"use client";

import type { RecordTradeResult, SizeCheckRequest, TradeSide } from "@repo/core/coach";
import { Button } from "@repo/ui/button";
import { SegmentedControl } from "@repo/ui/segmentedControl";
import { TextField } from "@repo/ui/textField";
import { ChevronDown } from "lucide-react";
import { useEffect, useId, useMemo, useState, type FormEvent } from "react";

import { CoachDisclosure, SizeCheckLines } from "@/entities/coach";
import { useHasAccessToken } from "@/shared/api";
import { formatAmountInput, parseAmountInput, todayInKorea, toTransactionDate } from "@/shared/lib";

import { useRecordTrade, useSizeCheck } from "../api";
import { useDebouncedValue } from "../lib";
import { RECORD_TRANSACTION_MESSAGES as MSG } from "../model";
import {
  chevron,
  chevronOpen,
  description,
  errorText,
  form,
  head,
  hint,
  inputWithAction,
  label,
  notice as noticeStyle,
  planBody,
  planToggle,
  rows,
  title,
  unit,
  weakButton,
} from "./RecordTrade.css";

/** FEATURE-009 UX — 입력이 멈추고 300ms 뒤 계산 */
const SIZE_CHECK_DEBOUNCE_MS = 300;
const THESIS_MAX_LENGTH = 200;
const INSUFFICIENT_QUANTITY = "PORTFOLIO_INSUFFICIENT_QUANTITY";
const HTTP_UNAUTHORIZED = 401;

const SIDE_OPTIONS: { label: string; value: TradeSide }[] = [
  { label: MSG.side.buy, value: "buy" },
  { label: MSG.side.sell, value: "sell" },
];

type Notice =
  | { kind: "saved"; result: RecordTradeResult }
  | { kind: "error"; message: string }
  | null;

interface RecordTradeCardProps {
  /** 코치 모양 심볼(`BTC`) */
  symbol: string;
  /** 실시간 현재가(원). [현재가] 버튼이 단가 칸에 옮겨 적는다 — 계산하지 않는다 */
  livePrice: number | null;
  className?: string;
}

/**
 * 거래 기록 + 계획(선택) + 사이즈 계산 결과 (F009 시나리오 1 · FR-4~10 · `FE-REQ-039`).
 *
 * ## 이 폼이 하지 않는 것
 *
 * - **주문하지 않는다.** 이미 한 거래를 적는다(수동 입력). 버튼 이름도 "기록하기"다
 * - **막지 않는다.** 손절가가 단가보다 높아도, 예산을 넘어도 저장된다 — 결과 줄이 사실을 말할 뿐이다
 * - **계산하지 않는다.** 결과 줄의 금액 · 비율은 서버 `size-check` 가 준 값이다. 손절 % 프리셋(−5/−8/−10%)도
 *   곱셈이라 넣지 않았다 — 서버가 프리셋 가격을 주면 붙인다(`FE-REQ-039` 미검증 표)
 *
 * 입력은 필수 4개(구분 · 수량 · 단가 · 날짜 — 날짜는 오늘이 기본) + 선택 2개(손절가 · 이유)다(FR-10 · "추가 입력 2개 이내").
 * 계산 결과는 `aria-live` 로 읽힌다. 모달 · 확인 단계가 없다.
 */
export const RecordTradeCard = ({ symbol, livePrice, className }: RecordTradeCardProps) => {
  const hasToken = useHasAccessToken();
  const ids = { quantity: useId(), price: useId(), date: useId(), stop: useId(), thesis: useId(), plan: useId() };

  const [side, setSide] = useState<TradeSide>("buy");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [today, setToday] = useState("");
  const [date, setDate] = useState("");
  const [planOpen, setPlanOpen] = useState(false);
  const [stopPrice, setStopPrice] = useState("");
  const [thesis, setThesis] = useState("");
  const [touched, setTouched] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  // 오늘 날짜는 브라우저에서만 안다 — 렌더 중에 만들지 않는다(`ssr.md`)
  useEffect(() => {
    const now = todayInKorea();
    setToday(now);
    setDate((current) => current || now);
  }, []);

  const parsed = {
    quantity: parseAmountInput(quantity),
    price: parseAmountInput(price),
    stop: parseAmountInput(stopPrice),
  };
  const stopInvalid = stopPrice.trim() !== "" && parsed.stop === null;

  const sizeInput = useMemo<SizeCheckRequest | null>(() => {
    if (parsed.quantity === null || parsed.price === null) return null;
    return {
      symbol,
      side,
      quantity: parsed.quantity,
      price: parsed.price,
      ...(parsed.stop !== null ? { stopPrice: parsed.stop } : {}),
    };
  }, [symbol, side, parsed.quantity, parsed.price, parsed.stop]);
  const debouncedInput = useDebouncedValue(sizeInput, SIZE_CHECK_DEBOUNCE_MS);
  const sizeCheck = useSizeCheck(hasToken ? debouncedInput : null);
  const waitingDebounce = sizeInput !== debouncedInput;

  const { record, retryPlan } = useRecordTrade();

  if (hasToken === false) {
    return (
      <section className={className}>
        <h2 className={title}>{MSG.heading}</h2>
        <p className={hint}>{MSG.errors.signedOut}</p>
      </section>
    );
  }

  const amountInvalid = touched && (parsed.quantity === null || parsed.price === null);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    setNotice(null);
    if (parsed.quantity === null || parsed.price === null || stopInvalid) return;

    const trimmedThesis = thesis.trim();
    record.mutate(
      {
        symbol,
        side,
        quantity: parsed.quantity,
        price: parsed.price,
        ...(today ? { transactionDate: toTransactionDate(date, today) } : {}),
        plan: {
          ...(parsed.stop !== null ? { stopPrice: parsed.stop } : {}),
          ...(trimmedThesis ? { thesis: trimmedThesis } : {}),
        },
      },
      {
        onSuccess: (result) => {
          setNotice({ kind: "saved", result });
          // 다음 거래를 바로 적을 수 있게 — 단가 · 날짜는 둔다(같은 날 여러 건이 흔하다)
          if (result.plan.status !== "unavailable") {
            setQuantity("");
            setStopPrice("");
            setThesis("");
          }
          setTouched(false);
        },
        onError: (error) => {
          const message =
            error.code === INSUFFICIENT_QUANTITY
              ? MSG.errors.insufficient
              : error.status === HTTP_UNAUTHORIZED
                ? MSG.errors.signedOut
                : MSG.errors.failed;
          setNotice({ kind: "error", message });
        },
      },
    );
  };

  const onRetryPlan = () => {
    if (notice?.kind !== "saved") return;
    const { transaction } = notice.result;
    const trimmedThesis = thesis.trim();
    retryPlan.mutate(
      {
        symbol: transaction.symbol,
        side: transaction.side,
        transactionId: transaction.id,
        ...(parsed.stop !== null ? { stopPrice: parsed.stop } : {}),
        ...(trimmedThesis ? { thesis: trimmedThesis } : {}),
      },
      {
        onSuccess: () => {
          setQuantity("");
          setStopPrice("");
          setThesis("");
        },
      },
    );
  };

  const renderNotice = () => {
    if (!notice) return null;
    if (notice.kind === "error") return <p className={errorText}>{notice.message}</p>;
    const { plan } = notice.result;
    if (plan.status === "unavailable") {
      return (
        <p className={noticeStyle}>
          {retryPlan.isSuccess ? MSG.retryPlanDone : MSG.planFailed}
          {!retryPlan.isSuccess && (
            <button type="button" className={weakButton} onClick={onRetryPlan} disabled={retryPlan.isPending}>
              {MSG.retryPlan}
            </button>
          )}
        </p>
      );
    }
    return <p className={noticeStyle}>{plan.status === "ok" ? MSG.savedWithPlan : MSG.saved}</p>;
  };

  const idleHint = side === "buy" && parsed.stop === null && sizeInput !== null ? MSG.stopIdleHint : MSG.idleHint;

  return (
    <section className={className} aria-labelledby={`${ids.plan}-heading`}>
      <form className={form} onSubmit={onSubmit} noValidate>
        <div className={head}>
          <h2 id={`${ids.plan}-heading`} className={title}>
            {MSG.heading}
          </h2>
          <p className={description}>{MSG.description}</p>
        </div>

        <div className={rows}>
          <span className={label}>{MSG.sideLabel}</span>
          <SegmentedControl options={SIDE_OPTIONS} value={side} onChange={setSide} label={MSG.sideLabel} />

          <label className={label} htmlFor={ids.quantity}>
            {MSG.quantity}
          </label>
          <TextField
            id={ids.quantity}
            variant="compact"
            inputMode="decimal"
            autoComplete="off"
            value={quantity}
            onChange={(value) => setQuantity(formatAmountInput(value))}
            trailing={<span className={unit}>{MSG.quantityUnit}</span>}
            error={amountInvalid && parsed.quantity === null ? MSG.errors.invalidAmount : undefined}
          />

          <label className={label} htmlFor={ids.price}>
            {MSG.price}
          </label>
          <div className={inputWithAction}>
            <TextField
              id={ids.price}
              variant="compact"
              inputMode="decimal"
              autoComplete="off"
              value={price}
              onChange={(value) => setPrice(formatAmountInput(value))}
              trailing={<span className={unit}>{MSG.priceUnit}</span>}
              error={amountInvalid && parsed.price === null ? MSG.errors.invalidAmount : undefined}
            />
            <button
              type="button"
              className={weakButton}
              aria-label={MSG.useLivePriceLabel}
              disabled={livePrice === null}
              onClick={() => livePrice !== null && setPrice(formatAmountInput(String(livePrice)))}
            >
              {MSG.useLivePrice}
            </button>
          </div>

          <label className={label} htmlFor={ids.date}>
            {MSG.date}
          </label>
          <TextField
            id={ids.date}
            variant="compact"
            type="date"
            max={today || undefined}
            value={date}
            onChange={setDate}
          />
        </div>

        <div>
          <button
            type="button"
            className={planToggle}
            aria-expanded={planOpen}
            aria-controls={ids.plan}
            onClick={() => setPlanOpen((open) => !open)}
          >
            {MSG.planToggle}
            <ChevronDown size={16} className={planOpen ? chevronOpen : chevron} aria-hidden="true" />
          </button>
          {/* 접힘은 조건부 렌더다 — `hidden` 속성은 `display:flex` 가 덮어 써서 늘 보였다 */}
          {planOpen && (
          <div id={ids.plan} className={planBody}>
            <p className={hint}>{MSG.planHint}</p>
            <div className={rows}>
              <label className={label} htmlFor={ids.stop}>
                {MSG.stopPrice}
              </label>
              <TextField
                id={ids.stop}
                variant="compact"
                inputMode="decimal"
                autoComplete="off"
                value={stopPrice}
                onChange={(value) => setStopPrice(formatAmountInput(value))}
                trailing={<span className={unit}>{MSG.priceUnit}</span>}
                error={stopInvalid ? MSG.errors.invalidStop : undefined}
              />
              <label className={label} htmlFor={ids.thesis}>
                {MSG.thesis}
              </label>
              <TextField
                id={ids.thesis}
                variant="compact"
                autoComplete="off"
                maxLength={THESIS_MAX_LENGTH}
                placeholder={MSG.thesisPlaceholder}
                value={thesis}
                onChange={setThesis}
              />
            </div>
          </div>
          )}
        </div>

        <SizeCheckLines
          result={
            sizeInput === null
              ? null
              : sizeCheck.isError
                ? { status: "unavailable" }
                : (sizeCheck.data ?? null)
          }
          isPending={sizeInput !== null && (waitingDebounce || sizeCheck.isFetching)}
          idleHint={idleHint}
        />

        <Button type="submit" variant="primary" size="sm" fullWidth loading={record.isPending}>
          {record.isPending ? MSG.submitting : MSG.submit}
        </Button>
        <div aria-live="polite">{renderNotice()}</div>
      </form>
      <CoachDisclosure />
    </section>
  );
};
