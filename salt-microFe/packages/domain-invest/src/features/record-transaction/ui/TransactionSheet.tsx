"use client";

import { AssetIcon } from "@repo/ui/assetIcon";
import { BottomSheet } from "@repo/ui/bottomSheet";
import { Button } from "@repo/ui/button";
import { EmptyState } from "@repo/ui/emptyState";
import { Modal } from "@repo/ui/modal";
import { SegmentedControl } from "@repo/ui/segmentedControl";
import { StatusGraphic } from "@repo/ui/statusGraphic";
import { StatusLine } from "@repo/ui/statusLine";
import { TextField } from "@repo/ui/textField";
import { useEffect, useId, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";

import {
  INSUFFICIENT_QUANTITY_CODE,
  LEDGER_ASSET_LABEL,
  LEDGER_SIDE_LABEL,
  toKoreanDate,
  type LedgerAssetType,
  type LedgerSide,
  type PositionTransactionVM,
  type TransactionPreviewInput,
} from "@/entities/portfolio";
import { hasApiStatus, type ApiError } from "@repo/web-shared/api";
import {
  parseAmountInput,
  todayInKorea,
  toTransactionDate,
  useDebouncedValue,
  useNarrowViewport,
  useNumberFields,
} from "@repo/web-shared/lib";

import { useLedgerWrites, useTransactionPreview } from "../api";
import { LEDGER_PREVIEW_DEBOUNCE_MS, LEDGER_SHEET_MESSAGES as M } from "../model";
import { LedgerPreviewCard } from "./LedgerPreviewCard";
import { LedgerSymbolPicker, type PickedSymbol } from "./LedgerSymbolPicker";
import { actions, deleteZone, field, fieldLabel, note, pickedName, pickedSymbol, sheetBody, textButton } from "./LedgerSheet.css";

const ASSET_OPTIONS: { label: string; value: LedgerAssetType }[] = [
  { label: LEDGER_ASSET_LABEL.crypto, value: "crypto" },
  { label: LEDGER_ASSET_LABEL.kr_stock, value: "kr_stock" },
];
const SIDE_OPTIONS: { label: string; value: LedgerSide }[] = [
  { label: LEDGER_SIDE_LABEL.buy, value: "buy" },
  { label: LEDGER_SIDE_LABEL.sell, value: "sell" },
];

type Done = "created" | "updated" | "deleted";

interface TransactionSheetProps {
  open: boolean;
  onClose: () => void;
  /** 고칠 거래 — 없으면 새 거래. 종목 · 자산군 · 매수/매도는 잠긴다(서버 FR-87) */
  editing?: PositionTransactionVM | null;
}

/**
 * 거래 기록 시트(F006 G절 2단계 · `FE-REQ-030` FR-104~106 · 108 · `FE-REQ-031` FR-80~83) — 좁은 화면은 바텀시트, 넓은 화면은 모달.
 *
 * - 필드 순서: 자산군 → 종목(검색) → 매수/매도 → 수량 → 단가 → 거래일 → 미리보기 → 저장
 * - **계산하지 않는다.** 전후 수량 · 평단 · 총액은 서버 미리보기(입력 300ms 멈춤 뒤 · 앞 요청 끊음)
 * - 과매도면 저장을 막고 서버 사유를 보인다 — 입력은 그대로. 미리보기가 다른 이유로 실패하면 저장은 된다(서버가 다시 본다)
 * - **주문이 아니다** — 외부 주문 링크 · 버튼 0(FR-108)
 * - 삭제 확인은 시트 안 한 줄(앱에 `DialogProvider` 가 없다 — 스펙의 `useDialog().confirm` 대신)
 */
export const TransactionSheet = ({ open, onClose, editing = null }: TransactionSheetProps) => {
  const narrow = useNarrowViewport();
  const title = editing ? M.editTitle : M.createTitle;
  // 열 때마다 새 폼 — 닫았다 연 시트에 앞 입력 · 결과가 남지 않게(편집 대상이 바뀌어도)
  const body = open ? <LedgerForm key={editing?.id ?? "new"} editing={editing} onClose={onClose} /> : null;

  if (narrow) {
    return (
      <BottomSheet open={open} onClose={onClose} title={title}>
        {body}
      </BottomSheet>
    );
  }
  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      {body}
    </Modal>
  );
};

const Field = ({ id, label, children }: { id?: string; label: string; children: ReactNode }) => (
  <div className={field}>
    {id ? (
      <label className={fieldLabel} htmlFor={id}>
        {label}
      </label>
    ) : (
      <span className={fieldLabel}>{label}</span>
    )}
    {children}
  </div>
);

const LedgerForm = ({ editing, onClose }: { editing: PositionTransactionVM | null; onClose: () => void }) => {
  const ids = { quantity: useId(), price: useId(), date: useId() };
  const [assetType, setAssetType] = useState<LedgerAssetType>(editing?.assetType ?? "crypto");
  const [picked, setPicked] = useState<PickedSymbol | null>(
    editing ? { symbol: editing.symbol, name: editing.name, logoUrl: editing.logoUrl } : null,
  );
  const [side, setSide] = useState<LedgerSide>(editing?.side ?? "buy");
  const nums = useNumberFields({ quantity: "price", price: "price" });
  const [today, setToday] = useState("");
  const [date, setDate] = useState("");
  const [touched, setTouched] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const { create, update, remove } = useLedgerWrites();

  // 오늘 날짜는 브라우저에서만 안다 — 렌더 중에 만들지 않는다(`ssr.md`). 고치는 거래면 그 거래 값으로 채운다
  useEffect(() => {
    setToday(todayInKorea());
    if (editing) {
      setDate(toKoreanDate(editing.transactionDate));
      nums.setNumber("quantity", editing.quantity);
      nums.setNumber("price", editing.price);
    } else {
      setDate(todayInKorea());
    }
    // 처음 한 번만 — 고치는 동안 서버 값으로 되돌리지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const quantity = parseAmountInput(nums.value("quantity"));
  const price = parseAmountInput(nums.value("price"));
  const originalDate = editing ? toKoreanDate(editing.transactionDate) : "";
  /**
   * 서버로 보낼 거래일 — 새 거래가 오늘이면 보내지 않는다(서버가 지금 시각). 고칠 때 날짜를 안 바꿨으면 보내지 않는다.
   * 고쳐서 오늘로 옮기면 오늘 0시(한국) — `toTransactionDate` 는 오늘을 "안 보냄"으로 읽어 바꾼 날짜가 사라졌다
   */
  const sentDate =
    editing && date === originalDate
      ? undefined
      : // 오늘을 아직 모르는 첫 렌더(둘 다 "")에 이 분기를 타면 잘못된 날짜로 던진다(2026-11-18 실화면 — 목록 블록이 깨졌다)
        editing && today !== "" && date === today
        ? new Date(`${today}T00:00:00+09:00`).toISOString()
        : toTransactionDate(date, today);
  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(date) && (today === "" || date <= today);

  const previewInput = useMemo<TransactionPreviewInput | null>(() => {
    if (quantity === null || price === null || !dateValid || !today) return null;
    if (editing) {
      return {
        transactionId: editing.id,
        ...(quantity !== editing.quantity ? { quantity } : {}),
        ...(price !== editing.price ? { price } : {}),
        ...(sentDate ? { transactionDate: sentDate } : {}),
      };
    }
    if (!picked) return null;
    return { assetType, symbol: picked.symbol, side, quantity, price, ...(sentDate ? { transactionDate: sentDate } : {}) };
  }, [quantity, price, dateValid, today, editing, picked, assetType, side, sentDate]);
  const debounced = useDebouncedValue(previewInput, LEDGER_PREVIEW_DEBOUNCE_MS);
  const preview = useTransactionPreview(debounced);
  const settled = debounced === previewInput;
  const blocked = settled && preview.error?.code === INSUFFICIENT_QUANTITY_CODE;

  const writeError = (create.error ?? update.error) as ApiError | null;
  const saving = create.isPending || update.isPending;

  if (done) {
    const titleText = done === "created" ? M.savedCreate : done === "updated" ? M.savedEdit : M.deleted;
    return (
      <EmptyState
        iconFrame="none"
        icon={<StatusGraphic kind="success" />}
        title={titleText}
        description={M.savedBody}
        action={
          <div className={actions}>
            <Button variant="weak" onClick={onClose}>
              {M.close}
            </Button>
          </div>
        }
      />
    );
  }

  const onSubmit = () => {
    setTouched(true);
    if (quantity === null || price === null || !dateValid || blocked) return;
    if (editing) {
      update.mutate(
        {
          id: editing.id,
          patch: {
            ...(quantity !== editing.quantity ? { quantity } : {}),
            ...(price !== editing.price ? { price } : {}),
            ...(sentDate ? { transactionDate: sentDate } : {}),
          },
        },
        { onSuccess: () => setDone("updated") },
      );
      return;
    }
    if (!picked) return;
    create.mutate(
      { assetType, symbol: picked.symbol, side, quantity, price, ...(sentDate ? { transactionDate: sentDate } : {}) },
      { onSuccess: () => setDone("created") },
    );
  };

  // `<form>` 이 아니라 Enter 저장이 저절로 안 된다 — 숫자 · 날짜 칸에서 Enter 면 저장 버튼과 같은 길(막힘 · 진행 중이면 무시)
  const submitOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (!saving) onSubmit();
  };

  const writeMessage =
    writeError?.code === INSUFFICIENT_QUANTITY_CODE ? M.insufficient : hasApiStatus(writeError, 404) ? M.notFound : writeError ? M.failed : null;
  const deleteMessage =
    remove.error?.code === INSUFFICIENT_QUANTITY_CODE ? M.delete.insufficient : hasApiStatus(remove.error, 404) ? M.notFound : remove.error ? M.failed : null;

  return (
    // `<form>` 이 아니다 — 종목 검색칸(`SearchField`)이 자기 `<form>` 을 가져 겹친다(2026-11-18 실화면 수화 경고). 저장은 버튼으로
    <div className={sheetBody}>
      <p className={note}>{M.description}</p>

      {editing ? (
        <>
          <div className={pickedSymbol}>
            <span className={pickedName}>
              <AssetIcon symbol={editing.assetType === "kr_stock" ? editing.name : editing.symbol} src={editing.logoUrl ?? undefined} name={editing.name} size="sm" />
              {editing.name} · {LEDGER_ASSET_LABEL[editing.assetType]} · {LEDGER_SIDE_LABEL[editing.side]}
            </span>
          </div>
          <p className={note}>{M.locked}</p>
        </>
      ) : (
        <>
          <Field label={M.assetLabel}>
            <SegmentedControl
              label={M.assetLabel}
              options={ASSET_OPTIONS}
              value={assetType}
              onChange={(next) => {
                setAssetType(next);
                setPicked(null); // 다른 자산군 종목이 남지 않게
              }}
            />
          </Field>
          <Field label={M.symbolLabel}>
            {picked ? (
              <div className={pickedSymbol}>
                <span className={pickedName}>
                  <AssetIcon symbol={assetType === "kr_stock" ? picked.name : picked.symbol} src={picked.logoUrl ?? undefined} name={picked.name} size="sm" />
                  {picked.name}
                </span>
                <button type="button" className={textButton} onClick={() => setPicked(null)}>
                  {M.symbolChange}
                </button>
              </div>
            ) : (
              <LedgerSymbolPicker assetType={assetType} onPick={setPicked} />
            )}
          </Field>
          <Field label={M.sideLabel}>
            <SegmentedControl label={M.sideLabel} options={SIDE_OPTIONS} value={side} onChange={setSide} />
          </Field>
        </>
      )}

      <Field id={ids.quantity} label={M.quantity}>
        <TextField
          id={ids.quantity}
          variant="compact"
          inputMode="decimal"
          autoComplete="off"
          value={nums.value("quantity")}
          onChange={(value) => nums.change("quantity", value)}
          onKeyDown={submitOnEnter}
          error={nums.message("quantity") ?? (touched && quantity === null ? M.invalidAmount : undefined)}
        />
      </Field>
      <Field id={ids.price} label={M.price}>
        <TextField
          id={ids.price}
          variant="compact"
          inputMode="decimal"
          autoComplete="off"
          value={nums.value("price")}
          onChange={(value) => nums.change("price", value)}
          onKeyDown={submitOnEnter}
          trailing={<span className={note}>{M.priceUnit}</span>}
          error={nums.message("price") ?? (touched && price === null ? M.invalidAmount : undefined)}
        />
      </Field>
      <Field id={ids.date} label={M.date}>
        <TextField id={ids.date} variant="compact" type="date" max={today || undefined} value={date} onChange={setDate} onKeyDown={submitOnEnter} />
      </Field>

      <LedgerPreviewCard
        ready={previewInput !== null}
        data={settled ? preview.data : undefined}
        isFetching={!settled || preview.isFetching}
        error={settled ? preview.error : null}
      />

      {writeMessage ? (
        <StatusLine kind={writeError?.code === INSUFFICIENT_QUANTITY_CODE ? "blocked" : "error"} live>
          {writeMessage}
        </StatusLine>
      ) : null}

      <div className={actions}>
        <Button onClick={onSubmit} disabled={blocked || saving || (!editing && !picked)} loading={saving}>
          {saving ? M.submitting : editing ? M.submitEdit : M.submitCreate}
        </Button>
      </div>

      {editing ? (
        <div className={deleteZone}>
          {confirmingDelete ? (
            <>
              <p className={note}>{M.delete.confirm}</p>
              {deleteMessage ? (
                <StatusLine kind={remove.error?.code === INSUFFICIENT_QUANTITY_CODE ? "blocked" : "error"} live>
                  {deleteMessage}
                </StatusLine>
              ) : null}
              <div className={actions}>
                <Button variant="weak" onClick={() => setConfirmingDelete(false)}>
                  {M.close}
                </Button>
                {/* 되돌릴 수 없다 — 지운 거래는 서버에서 사라지고 복구 경로가 없다(다시 적는 것뿐) */}
                <Button
                  variant="danger"
                  loading={remove.isPending}
                  onClick={() => remove.mutate({ id: editing.id, symbol: editing.symbol }, { onSuccess: () => setDone("deleted") })}
                >
                  {remove.isPending ? M.delete.deleting : M.delete.confirmButton}
                </Button>
              </div>
            </>
          ) : (
            <div className={actions}>
              <button type="button" className={textButton} onClick={() => setConfirmingDelete(true)}>
                {M.delete.open}
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
