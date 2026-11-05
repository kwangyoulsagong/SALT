"use client";

import { useState, type RefObject } from "react";

import { Button } from "@repo/ui/button";

import { STORY_MESSAGES, type StoryText } from "@/entities/household";

import { storyImage } from "../lib";
import { SHARE_STORY_MESSAGES as M } from "../model";
import * as s from "./share.css";

type Status = "idle" | "working" | "shared" | "saved" | "failed" | "shareFailed";

/**
 * 이야기 카드 이미지로 공유(`FE-REQ-057` FR-9 · 가계부 S1g). 화면 카드와 **같은 문장 · 같은 가림 상태**를 그린다 — 금액 가림은 기본(페이지가 쥔 값).
 * 파일 공유를 받는 브라우저면 공유 시트, 아니면 파일로 저장. 공유 시트를 닫은 것은 실패가 아니다(문구 0).
 */
export const ShareStoryButton = ({ text, period, cardRef }: { text: StoryText; period: string; cardRef: RefObject<HTMLElement | null> }) => {
  const [status, setStatus] = useState<Status>("idle");

  const onShare = async () => {
    const card = cardRef.current;
    if (!card) return;
    setStatus("working");
    try {
      const blob = await storyImage(text, card, STORY_MESSAGES.empty);
      const file = new File([blob], M.fileName(period), { type: "image/png" });
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: text.title });
          setStatus("shared");
        } catch (error) {
          // 공유 시트를 닫았다 — 아무 일도 없던 것으로
          setStatus(error instanceof DOMException && error.name === "AbortError" ? "idle" : "shareFailed");
        }
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("saved");
    } catch {
      setStatus("failed");
    }
  };

  const note = { idle: "", working: "", saved: M.saved, shared: M.shared, failed: M.failed, shareFailed: M.shareFailed }[status];
  return (
    <>
      <Button variant="secondary" size="sm" loading={status === "working"} onClick={() => void onShare()}>
        {M.share}
      </Button>
      <span className={s.note} role="status">
        {note}
      </span>
    </>
  );
};
