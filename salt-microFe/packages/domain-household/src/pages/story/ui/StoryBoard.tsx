"use client";

import { useMemo, useRef, useState } from "react";

import { EmptyState } from "@repo/ui/emptyState";
import { Skeleton } from "@repo/ui/skeleton";

import { panelDescription } from "@repo/web-shared/ui/surface.css";

import {
  CategoryNamesProvider,
  STORY_MESSAGES,
  StoryCard,
  storyText,
  storyTitle,
  useCategoryLabel,
  useHouseholdStory,
  type HouseholdStory,
} from "@/entities/household";
import { AmountToggle, SHARE_STORY_MESSAGES, ShareStoryButton } from "@/features/share-story";

import { STORY_PAGE as M } from "../model";
import * as s from "./story.css";

/** 카드 + 금액 보이기 + 공유 — 가림 상태 하나를 카드와 이미지가 같이 쓴다(화면에 보인 그대로 나간다) */
const StoryBody = ({ story }: { story: HouseholdStory }) => {
  const [showAmounts, setShowAmounts] = useState(false);
  const label = useCategoryLabel();
  const text = useMemo(() => storyText(story, { showAmounts, label: label.category }), [story, showAmounts, label]);
  const cardRef = useRef<HTMLElement>(null);
  // 적은 게 없는 기간 — 가릴 금액도 나눌 이야기도 없다
  if (text.lines.length === 0) return <StoryCard text={text} />;
  return (
    <>
      <StoryCard ref={cardRef} text={text} />
      <div className={s.controls}>
        <AmountToggle checked={showAmounts} onChange={setShowAmounts} />
        <ShareStoryButton text={text} period={story.period} cardRef={cardRef} />
      </div>
      <p className={panelDescription}>{SHARE_STORY_MESSAGES.hiddenNote}</p>
    </>
  );
};

/**
 * 이야기 카드 잎(`FE-REQ-057` FR-9 · 가계부 S1g). 어떤 줄 · 금액 · 볼 수 있는 날은 서버 값. 첫 카드는 서버가 쿠키로 받아 넘긴다.
 * 내 분류 이름은 받은 표로(월 화면과 같은 꼴 — 서버 HTML 부터 이름이 맞다).
 */
export const StoryBoard = ({ period, initial }: { period: string; initial: HouseholdStory | null }) => {
  const query = useHouseholdStory(period, initial);
  if (query.isSignedOut) return <EmptyState title={M.signedOut} />;
  if (query.isError) return <EmptyState title={M.loadFailed} tone="error" />;
  if (!query.data) return <Skeleton height={280} />;
  const story = query.data;
  if (!story.ready) return <EmptyState title={storyTitle(story)} description={STORY_MESSAGES.readyOn(story.readyOn ?? "")} />;
  return (
    <div className={s.board}>
      <CategoryNamesProvider categories={story.categories}>
        <StoryBody story={story} />
      </CategoryNamesProvider>
    </div>
  );
};
