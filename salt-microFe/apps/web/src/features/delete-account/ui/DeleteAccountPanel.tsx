"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { Button } from "@repo/ui/button";
import { StatusLine } from "@repo/ui/statusLine";
import { TextField } from "@repo/ui/textField";

import { clearSession, useHasSession, type ApiError } from "@repo/web-shared/api";
import { ROUTES } from "@repo/web-shared/config";
import { panel, panelDescription, panelHead, panelTitle } from "@repo/web-shared/ui/surface.css";

import { useDeleteAccount } from "../api";
import { DELETE_ACCOUNT_MESSAGES as MSG } from "../model";
import { field, form, scopeList, scopeTitle } from "./DeleteAccountPanel.css";

const errorText = (error: ApiError): string => {
  if (error.status === 429) return MSG.errors.tooMany;
  const known = MSG.errors[error.code as keyof typeof MSG.errors];
  return typeof known === "string" ? known : MSG.errors.other;
};

/**
 * 계정 지우기(`FE-REQ-055` FR-5 · FEATURE-015 FR-3). 비밀번호를 다시 받는다 — 접근 토큰만으로는 서버가 지우지 않는다(`SRV-REQ-048` FR-4).
 * 지운 뒤에는 이 기기 세션 쿠키도 지우고 결과 한 줄만 남긴다(다른 화면으로 바로 넘기면 무엇이 지워졌는지 못 본다). 로그인 전이면 패널째 없다.
 */
export const DeleteAccountPanel = () => {
  const signedIn = useHasSession();
  const queryClient = useQueryClient();
  const deletion = useDeleteAccount();
  const [password, setPassword] = useState("");
  const [deletedTotal, setDeletedTotal] = useState<number | null>(null);

  if (signedIn === false && deletedTotal === null) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (password.length === 0 || deletion.isPending) return;
    deletion.mutate(password, {
      onSuccess: async ({ total }) => {
        setPassword("");
        // 쿠키는 Route Handler 가 지운다 — 다 지운 뒤 결과를 보인다. 캐시도 비워 지운 사람 기록이 화면에 남지 않게
        await clearSession();
        queryClient.clear();
        setDeletedTotal(total);
      },
    });
  };

  return (
    <section className={panel}>
      <div className={panelHead}>
        <h2 className={panelTitle}>{MSG.heading}</h2>
      </div>
      {deletedTotal !== null ? (
        <>
          <StatusLine kind="success" live>
            {MSG.done(deletedTotal)}
          </StatusLine>
          <div>
            <Button variant="secondary" onClick={() => window.location.assign(ROUTES.login)}>
              {MSG.goHome}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className={panelDescription}>{MSG.description}</p>
          <div>
            <p className={scopeTitle}>{MSG.scopeLabel}</p>
            <ul className={scopeList}>
              {MSG.scope.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <form className={form} onSubmit={submit}>
            <div className={field}>
              <TextField
                variant="filled"
                type="password"
                autoComplete="current-password"
                aria-label={MSG.passwordLabel}
                placeholder={MSG.passwordPlaceholder}
                value={password}
                onChange={setPassword}
              />
            </div>
            <Button type="submit" variant="danger" disabled={password.length === 0 || signedIn !== true} loading={deletion.isPending}>
              {deletion.isPending ? MSG.pending : MSG.action}
            </Button>
          </form>
          {deletion.isError && (
            <StatusLine kind="error" live>
              {errorText(deletion.error)}
            </StatusLine>
          )}
        </>
      )}
    </section>
  );
};
