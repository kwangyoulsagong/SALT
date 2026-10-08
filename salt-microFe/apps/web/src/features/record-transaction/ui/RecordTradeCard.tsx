"use client";

import type { RecordableAssetType, RecordTradeResult, SizeCheckRequest, TradeSide } from "@repo/core/coach";
import { Button } from "@repo/ui/button";
import { SegmentedControl } from "@repo/ui/segmentedControl";
import { StatusGraphic } from "@repo/ui/statusGraphic";
import { StatusToast } from "@repo/ui/statusToast";
import { TextField } from "@repo/ui/textField";
import { ChevronDown } from "lucide-react";
import { useEffect, useId, useMemo, useState, type FormEvent } from "react";

import { CoachDisclosure, SizeCheckLines, TradeBehaviorLines } from "@/entities/coach";
import { useHasAccessToken } from "@/shared/api";
import { formatAmountInput, formatPrice, parseAmountInput, todayInKorea, toTransactionDate } from "@/shared/lib";

import { useRecordTrade, useSizeCheck } from "../api";
import { useDebouncedValue } from "../lib";
import { RECORD_TRANSACTION_MESSAGES as MSG } from "../model";
import { EntryChecklist } from "./EntryChecklist";
import {
  card,
  chevron,
  chevronOpen,
  description,
  errorText,
  fieldNote,
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
/** 국내 주식 — 비소유자 · 마스터에 없는 코드(서버 `KrStockNotAvailableError`) */
const KR_STOCK_NOT_AVAILABLE = "KR_STOCK_NOT_AVAILABLE";
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
  /** 코치 모양 심볼(`BTC`) · 국내 주식은 6자리 코드 */
  symbol: string;
  /** 주지 않으면 코인. 국내 주식도 같은 폼 — 계획 · 사이즈 계산을 그대로 쓴다(F011 슬라이스 4, 수수료는 서버가 자산군으로 고른다) */
  assetType?: RecordableAssetType;
  /**
   * 국내 주식 호가 단위(원) — 서버가 현재가로 정한 값(`detail.tickSize`). 단가 칸 아래 **안내만** 한다(FR-42 · 수동 입력 원칙).
   * 적은 단가가 배수인지는 따지지 않는다 — 가격대별 단위 표는 서버에 있고 프론트에 두 벌 두지 않는다
   */
  tickSize?: number | null;
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
export const RecordTradeCard = ({ symbol, assetType = "crypto", tickSize = null, livePrice, className }: RecordTradeCardProps) => {
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
  // 진입 전 체크(FR-30) — 매수 · 계획 안에서만. 펼쳤을 때 보인 질문과 체크를 계획에 기록한다
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checkedTags, setCheckedTags] = useState<string[]>([]);
  const [premortem, setPremortem] = useState("");
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
  // 계획 = 손절가 · 이유 · 프리모템 답 중 하나(FR-10 · FR-30). 계획 없음 후보(off_plan) 판정에 쓴다 — BFF 가 계획을 만드는 조건과 같다
  const hasPlan = parsed.stop !== null || thesis.trim() !== "" || (side === "buy" && premortem.trim() !== "");

  const sizeInput = useMemo<SizeCheckRequest | null>(() => {
    if (parsed.quantity === null || parsed.price === null) return null;
    return {
      symbol,
      side,
      quantity: parsed.quantity,
      price: parsed.price,
      ...(parsed.stop !== null ? { stopPrice: parsed.stop } : {}),
      hasPlan,
    };
  }, [symbol, side, parsed.quantity, parsed.price, parsed.stop, hasPlan]);
  const debouncedInput = useDebouncedValue(sizeInput, SIZE_CHECK_DEBOUNCE_MS);
  const sizeCheck = useSizeCheck(hasToken ? debouncedInput : null);
  const waitingDebounce = sizeInput !== debouncedInput;

  const { record, retryPlan } = useRecordTrade();
  const checklist = side === "buy" && sizeCheck.data?.status === "ok" ? (sizeCheck.data.behavior?.checklist ?? null) : null;

  /** 계획에 남길 진입 전 체크 — 매수이고 펼쳐서 질문을 본 경우만. 체크 · 답은 기록만 한다 */
  const checklistPlan = () => {
    if (side !== "buy") return {};
    const answer = premortem.trim();
    const shown = checklistOpen && checklist ? checklist.items.map((item) => item.tag) : [];
    return {
      ...(answer ? { invalidation: answer } : {}),
      ...(shown.length ? { checklist: { shown, checked: checkedTags.filter((tag) => shown.includes(tag)) } } : {}),
    };
  };
  const resetPlan = () => {
    setQuantity("");
    setStopPrice("");
    setThesis("");
    setPremortem("");
    setCheckedTags([]);
  };

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
        // 코인은 보내지 않는다(서버 기본값) — 기존 호출 모양 그대로
        ...(assetType === "crypto" ? {} : { assetType }),
        symbol,
        side,
        quantity: parsed.quantity,
        price: parsed.price,
        ...(today ? { transactionDate: toTransactionDate(date, today) } : {}),
        plan: {
          ...(parsed.stop !== null ? { stopPrice: parsed.stop } : {}),
          ...(trimmedThesis ? { thesis: trimmedThesis } : {}),
          ...checklistPlan(),
        },
      },
      {
        onSuccess: (result) => {
          setNotice({ kind: "saved", result });
          // 다음 거래를 바로 적을 수 있게 — 단가 · 날짜는 둔다(같은 날 여러 건이 흔하다)
          if (result.plan.status !== "unavailable") resetPlan();
          setTouched(false);
        },
        onError: (error) => {
          const message =
            error.code === INSUFFICIENT_QUANTITY
              ? MSG.errors.insufficient
              : error.code === KR_STOCK_NOT_AVAILABLE
                ? MSG.errors.notAvailable
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
        ...checklistPlan(),
      },
      {
        onSuccess: resetPlan,
      },
    );
  };

  const renderNotice = () => {
    if (!notice) return null;
    if (notice.kind === "error") return <p className={errorText}>{notice.message}</p>;
    const { plan } = notice.result;
    // 완료는 글자만 바꾸지 않고 그래픽을 먼저 보인다(FE-REQ-044 P-1). key 로 저장할 때마다 다시 재생한다
    const graphicKey = notice.result.transaction.id;
    if (plan.status === "unavailable") {
      return (
        <p className={noticeStyle}>
          <StatusGraphic key={`${graphicKey}-${retryPlan.isSuccess}`} kind={retryPlan.isSuccess ? "success" : "error"} size="sm" />
          {retryPlan.isSuccess ? MSG.retryPlanDone : MSG.planFailed}
          {!retryPlan.isSuccess && (
            <button type="button" className={weakButton} onClick={onRetryPlan} disabled={retryPlan.isPending}>
              {MSG.retryPlan}
            </button>
          )}
        </p>
      );
    }
    return (
      <p className={noticeStyle}>
        <StatusGraphic key={graphicKey} kind="success" size="sm" />
        {plan.status === "ok" ? MSG.savedWithPlan : MSG.saved}
      </p>
    );
  };

  const idleHint = side === "buy" && parsed.stop === null && sizeInput !== null ? MSG.stopIdleHint : MSG.idleHint;

  return (
    <section className={`${card} ${className ?? ""}`} aria-labelledby={`${ids.plan}-heading`}>
      {/* 저장된 순간 패널 위에 잠깐 떴다가 사라진다. 버튼 아래 결과 줄은 그대로 남는다 (FE-REQ-044 P-1 · 사용자 QA 2026-09-30) */}
      <StatusToast trigger={notice?.kind === "saved" ? notice.result.transaction.id : null}>{MSG.saved}</StatusToast>
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
            trailing={<span className={unit}>{assetType === "kr_stock" ? MSG.krStock.quantityUnit : MSG.quantityUnit}</span>}
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
          {tickSize !== null && <p className={`${hint} ${fieldNote}`}>{MSG.krStock.tickHint(formatPrice(tickSize))}</p>}

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

        <>
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
              {checklist && (
                <EntryChecklist
                  checklist={checklist}
                  open={checklistOpen}
                  onOpenChange={setChecklistOpen}
                  checked={checkedTags}
                  onCheckedChange={setCheckedTags}
                  premortem={premortem}
                  onPremortemChange={setPremortem}
                />
              )}
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
          {/* FR-19 · 시나리오 5 — 엣지 없음 · 매도 프레이밍 한 줄. 차단 아님: 버튼은 그대로다 */}
          {sizeInput !== null && sizeCheck.data?.status === "ok" && sizeCheck.data.side === side && (
            <div aria-live="polite">
              <TradeBehaviorLines side={side} preview={sizeCheck.data.behavior} />
            </div>
          )}
          </>

        <Button type="submit" variant="primary" size="sm" fullWidth loading={record.isPending}>
          {record.isPending ? MSG.submitting : MSG.submit}
        </Button>
        <div aria-live="polite">{renderNotice()}</div>
      </form>
      <CoachDisclosure />
    </section>
  );
};
