import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import {
  avatarStyles,
  bubbleStyles,
  columnStyles,
  dotStyles,
  footerStyles,
  metaStyles,
  rowStyles,
  typingStyles,
} from "./styles/chatBubble.css";

export type ChatRole = "user" | "assistant";

export interface ChatBubbleProps {
  role: ChatRole;
  children?: ReactNode;
  /** 보낸 시각 같은 짧은 부가 정보 */
  meta?: ReactNode;
  /** 아직 답이 오는 중. `children`이 비어 있으면 점 세 개를 보여준다. */
  streaming?: boolean;
  /** 아바타를 보여줄지. `assistant`에서만 의미가 있다. */
  avatar?: boolean;
  /** 말풍선 아래 슬롯. 근거 펼치기·피드백 버튼을 넣는다. */
  footer?: ReactNode;
  className?: string;
}

/**
 * 코치와 주고받는 한 마디.
 *
 * 대화 목록을 감싸는 쪽에 `role="log"`과 `aria-live="polite"`를 주면
 * 새 답이 올 때 스크린 리더가 읽는다.
 */
export const ChatBubble = ({
  role,
  children,
  meta,
  streaming = false,
  avatar = false,
  footer,
  className,
}: ChatBubbleProps) => {
  const showTyping = streaming && !children;

  return (
    <div className={`${rowStyles({ role })} ${className || ""}`}>
      {role === "assistant" && avatar ? (
        <span className={avatarStyles} aria-hidden="true">
          <Sparkles size={15} />
        </span>
      ) : null}

      <div className={columnStyles({ role })}>
        <div className={bubbleStyles({ role })}>
          {showTyping ? (
            <span className={typingStyles} role="status" aria-label="답변 작성 중">
              <span className={dotStyles} />
              <span className={dotStyles} />
              <span className={dotStyles} />
            </span>
          ) : (
            children
          )}
        </div>

        {meta ? <span className={metaStyles}>{meta}</span> : null}
        {footer ? <div className={footerStyles}>{footer}</div> : null}
      </div>
    </div>
  );
};
