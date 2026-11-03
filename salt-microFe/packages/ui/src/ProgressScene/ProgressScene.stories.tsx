import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProgressScene } from "./ProgressScene";

const KINDS = ["trip", "car", "umbrella", "house", "jar"] as const;

const meta = {
  title: "Components/ProgressScene",
  component: ProgressScene,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    kind: { control: "select", options: KINDS, description: "장면 — 여행 · 첫 차 · 비상금 · 주거 · 나머지" },
    step: { control: { type: "range", min: 0, max: 10, step: 1 }, description: "지금 칸 — 서버가 준 값" },
    steps: { control: { type: "number" }, description: "전체 칸" },
    size: { control: "inline-radio", options: ["sm", "md"], description: "폭 160 · 240px" },
  },
} satisfies Meta<typeof ProgressScene>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { kind: "trip", step: 3, steps: 10 } };

export const AllKinds: Story = {
  args: { kind: "trip", step: 0, steps: 10 },
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
      {KINDS.map((kind, i) => (
        <figure key={kind} style={{ margin: 0, textAlign: "center" }}>
          <ProgressScene kind={kind} step={i * 2 + 1} steps={10} />
          <figcaption style={{ fontSize: 12 }}>{kind}</figcaption>
        </figure>
      ))}
    </div>
  ),
};

export const EmptyAndFull: Story = {
  args: { kind: "jar", step: 0, steps: 10 },
  render: () => (
    <div style={{ display: "flex", gap: 24 }}>
      <ProgressScene kind="jar" step={0} steps={10} size="sm" />
      <ProgressScene kind="jar" step={10} steps={10} size="sm" />
    </div>
  ),
};
