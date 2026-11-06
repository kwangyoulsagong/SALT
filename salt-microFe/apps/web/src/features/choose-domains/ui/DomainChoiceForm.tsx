"use client";

import { Button } from "@repo/ui/button";
import { Checkbox } from "@repo/ui/checkbox";
import { StatusLine } from "@repo/ui/statusLine";
import { useState } from "react";

import type { Onboarding, OnboardingDomain } from "@/entities/auth";

import { useChooseDomains } from "../api/useOnboardingSteps";
import { CHOOSE_DOMAINS_MESSAGES as MSG } from "../model/messages";
import { form, hint, label, legend, list, row, text } from "./DomainChoiceForm.css";

interface DomainChoiceFormProps {
  /** 고를 수 있는 것 · 지금 골라진 것 — 서버 값(순서 포함). 프론트에 도메인 목록 상수 0 */
  choices: Onboarding["choices"];
}

/**
 * 온보딩 1단계 — 도메인 고르기(`FE-REQ-055` FR-4). 하나 이상 골라야 다음으로 간다(빈 선택은 서버도 거절).
 * 다음 단계(첫 입력 도메인)는 서버 답이 정한다 — 투자를 안 고르면 투자 질문 0(FEATURE-015 FR-1).
 */
export const DomainChoiceForm = ({ choices }: DomainChoiceFormProps) => {
  const choose = useChooseDomains();
  const [picked, setPicked] = useState<Set<OnboardingDomain>>(
    () => new Set(choices.filter((c) => c.selected).map((c) => c.domain)),
  );

  const toggle = (domain: OnboardingDomain, on: boolean) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (on) next.add(domain);
      else next.delete(domain);
      return next;
    });

  return (
    <form
      className={form}
      onSubmit={(event) => {
        event.preventDefault();
        // 서버 순서로 보낸다 — 고른 순서가 뜻을 갖지 않는다
        if (picked.size > 0 && !choose.isPending) choose.mutate(choices.map((c) => c.domain).filter((d) => picked.has(d)));
      }}
    >
      <fieldset className={list}>
        <legend className={legend}>{MSG.legend}</legend>
        <p className={hint}>{MSG.hint}</p>
        {choices.map(({ domain }) => {
          const copy = MSG.domains[domain];
          return (
            <div key={domain} className={row}>
              <Checkbox
                checked={picked.has(domain)}
                onChange={(on) => toggle(domain, on)}
                name="domains"
                value={domain}
                label={
                  <span className={text}>
                    <span className={label}>{copy.label}</span>
                    <span className={hint}>{copy.hint}</span>
                  </span>
                }
              />
            </div>
          );
        })}
      </fieldset>
      {choose.isError && <StatusLine kind="error">{MSG.failed}</StatusLine>}
      <Button type="submit" variant="primary" size="lg" fullWidth disabled={picked.size === 0} aria-busy={choose.isPending}>
        {MSG.submit}
      </Button>
    </form>
  );
};
