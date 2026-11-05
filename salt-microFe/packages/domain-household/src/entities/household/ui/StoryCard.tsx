"use client";

import { forwardRef } from "react";

import { STORY_MESSAGES as M, plainLine, type StoryText } from "../model/story";
import * as s from "./story.css";

/**
 * 이야기 카드(`FE-REQ-057` FR-9 · 가계부 S1g) — 받은 문장을 그린다(문장은 `storyText` 한 곳 — 공유 이미지와 같다).
 * 가린 금액은 "•••원" 대신 "가린 금액"으로 읽힌다. 줄이 없으면 "적은 기록이 없어요" 한 줄.
 * ref 는 공유 이미지가 이 카드의 계산된 색 · 글꼴을 읽는 자리다.
 */
export const StoryCard = forwardRef<HTMLElement, { text: StoryText }>(({ text }, ref) => (
  <article ref={ref} className={s.card} aria-label={text.title}>
    <h2 className={s.title}>{text.title}</h2>
    {text.lines.length === 0 ? (
      <p className={s.empty}>{M.empty}</p>
    ) : (
      <ul className={s.lines}>
        {text.lines.map((parts) => (
          <li key={plainLine(parts)} className={s.line}>
            {parts.map((p, i) =>
              p.masked ? (
                <span key={i} role="img" aria-label={M.maskedLabel}>
                  {p.text}
                </span>
              ) : (
                <span key={i}>{p.text}</span>
              ),
            )}
          </li>
        ))}
      </ul>
    )}
  </article>
));

StoryCard.displayName = "StoryCard";
