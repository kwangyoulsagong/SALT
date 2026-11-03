import { ProgressScene } from "@repo/ui/progressScene";

import { GOAL_MESSAGES } from "../model/messages";
import type { SavingsScene } from "../model/types";
import * as s from "./goal.css";

export interface GoalSceneProps {
  scene: SavingsScene;
  size?: "sm" | "md";
}

/**
 * 모이는 장면(`FE-REQ-056` FR-8) — 칸은 서버 `scene.step`. 적립으로 칸이 바뀌면 그림이 한 칸 움직이고 멈춘다(`@repo/ui` `ProgressScene`).
 * 그래픽을 지워도 뜻이 통하게 칸 수를 글로 같이 둔다
 */
export const GoalScene = ({ scene, size = "md" }: GoalSceneProps) => (
  <div className={s.scene}>
    <ProgressScene kind={scene.kind} step={scene.step} steps={scene.steps} size={size} />
    <span className={s.label}>{GOAL_MESSAGES.scene.progress(scene.step, scene.steps)}</span>
  </div>
);
