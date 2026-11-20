"use client";

import Link from "next/link";

import { ProgressBar } from "@repo/ui/progressBar";

import { ROUTES } from "@repo/web-shared/config";

import { GoalTemplateIcon, TEMPLATE_LABEL, useSavingsTemplates, type GoalTemplateKey } from "@/entities/goal";

import { GOALS_PAGE as M } from "../model";
import * as s from "./goalsStart.css";

const FALLBACK_ORDER = Object.keys(TEMPLATE_LABEL) as GoalTemplateKey[];
const SAMPLE_RATIOS = [0.62, 0.28];

/**
 * 목표가 없을 때 — 템플릿 고르기(`FE-REQ-060` FR-14, 2026-11-20). 한 줄만 있던 빈 패널이 "너무 비어 보인다"(사용자) →
 * 서버 템플릿 순서대로 타일, 누르면 그 템플릿으로 계산기(`/goals/new?template=`). 아래는 만든 뒤 모양의 예시(회색 · "예시" 표지 · 숫자 0)
 */
export const GoalsStart = () => {
  const templates = useSavingsTemplates();
  const keys = templates.data?.map((t) => t.key) ?? FALLBACK_ORDER;
  return (
    <div className={s.start}>
      <div className={s.hero}>
        <h2 className={s.title}>{M.start.title}</h2>
        <p className={s.description}>{M.start.description}</p>
      </div>
      <ul className={s.tiles} aria-label={M.start.templatesLabel}>
        {keys.map((key) => {
          return (
            <li key={key}>
              <Link href={`${ROUTES.addGoal}?template=${key}`} className={s.tile}>
                <span className={s.tileIcon} aria-hidden="true">
                  <GoalTemplateIcon template={key} size={20} />
                </span>
                <span className={s.tileLabel}>{TEMPLATE_LABEL[key]}</span>
                <span className={s.tileHint}>{M.start.hints[key]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <section className={s.sample} aria-hidden="true">
        <div className={s.sampleHead}>
          <span className={s.sampleTitle}>{M.start.sampleTitle}</span>
          <span className={s.sampleBadge}>{M.start.sample}</span>
        </div>
        {SAMPLE_RATIOS.map((ratio, index) => (
          <div key={ratio} className={s.sampleRow}>
            <span className={s.sampleIcon} />
            <span className={s.sampleName}>{M.start.sampleRows[index]}</span>
            <ProgressBar value={ratio} label="" height={6} className={s.sampleBar} />
          </div>
        ))}
      </section>
    </div>
  );
};
