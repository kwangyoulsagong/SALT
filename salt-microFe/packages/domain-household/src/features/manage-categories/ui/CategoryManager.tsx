"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@repo/ui/button";
import { EmptyState } from "@repo/ui/emptyState";
import { SegmentedControl } from "@repo/ui/segmentedControl";
import { Skeleton } from "@repo/ui/skeleton";
import { TextField } from "@repo/ui/textField";

import { isApiError } from "@repo/web-shared/api";

import { BUCKET_SHORT_LABEL, useHouseholdCategories, type BucketKey, type HouseholdCategory } from "@/entities/household";

import { useAddCategory, useArchiveCategory, useEditCategory } from "../api";
import { CATEGORY_MANAGER_MESSAGES as M } from "../model";
import * as s from "./category.css";

const BUCKETS: BucketKey[] = ["needs", "wants"];
const bucketOptions = BUCKETS.map((b) => ({ value: b, label: BUCKET_SHORT_LABEL[b] }));

type Done = { kind: "added" | "saved" | "archived"; name: string };

/** 서버 오류 코드 → 문장. 모르는 코드는 일반 실패 문장 */
const errorText = (error: Error | null): string | null => {
  if (!error) return null;
  return (isApiError(error) && error.code ? M.errors[error.code] : undefined) ?? M.failed;
};

/** 한 줄 고치기 — 이름 · 묶음. 저장하면 닫힌다 */
const EditRow = ({ category, onDone }: { category: HouseholdCategory; onDone: (done: Done | null) => void }) => {
  const edit = useEditCategory();
  const [name, setName] = useState(category.name ?? "");
  const [bucket, setBucket] = useState<BucketKey>(category.bucket);
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim() === "") return;
    edit.mutate({ key: category.key, body: { name, bucket } }, { onSuccess: (c) => onDone({ kind: "saved", name: c.name ?? name }) });
  };
  return (
    <form className={s.form} onSubmit={onSubmit} aria-label={M.editLabel(category.name ?? "")}>
      <div className={s.editor}>
        <TextField label={M.name} value={name} onChange={setName} />
        <SegmentedControl label={M.bucket} value={bucket} onChange={setBucket} options={bucketOptions} />
      </div>
      <div className={s.actions}>
        <Button type="submit" size="sm" disabled={name.trim() === "" || edit.isPending} loading={edit.isPending}>
          {M.save}
        </Button>
        <Button size="sm" variant="weak" onClick={() => onDone(null)} disabled={edit.isPending}>
          {M.cancel}
        </Button>
      </div>
      <p className={s.note} role="status">
        {errorText(edit.error) ?? ""}
      </p>
    </form>
  );
};

/**
 * 내 분류 관리(`FE-REQ-057` FR-12, 가계부 S1f). 상한 · 이름 길이 · 같은 이름은 서버가 정한다(`limit` · 409 · 400 코드) — 화면은 문장만 고른다.
 * 지우기는 보관이라 확인 팝업 없이(지난 지출 이름은 남는다). 결과 문장은 줄이 사라져도 남는다.
 */
export const CategoryManager = () => {
  const table = useHouseholdCategories();
  const add = useAddCategory();
  const archive = useArchiveCategory();
  const [name, setName] = useState("");
  const [bucket, setBucket] = useState<BucketKey>("wants");
  const [editing, setEditing] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);

  if (table.isSignedOut) return <EmptyState title={M.signedOut} />;
  if (table.isError) return <EmptyState title={M.loadFailed} tone="error" />;
  if (!table.data) return <Skeleton height={160} />;
  const mine = table.data.categories.filter((c) => c.custom && !c.archived);
  const full = mine.length >= table.data.limit;

  const reset = () => {
    setDone(null);
    add.reset();
    archive.reset();
  };
  const onAdd = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim() === "" || full) return;
    reset();
    add.mutate(
      { name, bucket },
      {
        onSuccess: (c) => {
          setDone({ kind: "added", name: c.name ?? name });
          setName("");
        },
      },
    );
  };

  return (
    <section className={s.form} aria-label={M.title}>
      <p className={s.note}>{M.description}</p>
      {mine.length === 0 ? (
        <p className={s.note}>{M.empty}</p>
      ) : (
        <ul className={s.list}>
          {mine.map((c) => (
            <li key={c.key} className={s.row}>
              {editing === c.key ? (
                <EditRow
                  category={c}
                  onDone={(result) => {
                    setEditing(null);
                    setDone(result);
                  }}
                />
              ) : (
                <>
                  <span className={s.main}>
                    <span className={s.name}>{c.name}</span>
                    <span className={s.note}>{BUCKET_SHORT_LABEL[c.bucket]}</span>
                  </span>
                  <span className={s.actions}>
                    <Button
                      size="xs"
                      variant="weak"
                      aria-label={M.editLabel(c.name ?? "")}
                      onClick={() => {
                        reset();
                        setEditing(c.key);
                      }}
                    >
                      {M.edit}
                    </Button>
                    <Button
                      size="xs"
                      variant="weak"
                      aria-label={M.archiveLabel(c.name ?? "")}
                      disabled={archive.isPending}
                      onClick={() => {
                        reset();
                        archive.mutate(c.key, { onSuccess: () => setDone({ kind: "archived", name: c.name ?? "" }) });
                      }}
                    >
                      {M.archive}
                    </Button>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className={s.note}>{M.archiveNote}</p>
      <form className={s.form} onSubmit={onAdd} aria-label={M.add}>
        <div className={s.editor}>
          <TextField label={M.name} value={name} onChange={setName} />
          <SegmentedControl label={M.bucket} value={bucket} onChange={setBucket} options={bucketOptions} />
        </div>
        <div className={s.actions}>
          <Button type="submit" size="sm" disabled={name.trim() === "" || full || add.isPending} loading={add.isPending}>
            {M.add}
          </Button>
          <span className={s.note}>{M.limit(mine.length, table.data.limit)}</span>
        </div>
      </form>
      <p className={s.note} role="status">
        {errorText(add.error ?? archive.error) ?? (done ? M[done.kind](done.name) : "")}
      </p>
    </section>
  );
};
