import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Illustration } from "./Illustration";

const SCENES = ["coinPouch", "candles", "scale", "coachBubble", "target", "ledger"] as const;

const meta = {
  title: "Components/Illustration",
  component: Illustration,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    scene: {
      control: "select",
      options: SCENES,
      description: "장면 — 적립 · 분석 · 비중 · 코치 · 목표 · 거래 기록",
    },
    size: {
      control: "inline-radio",
      options: ["sm", "md", "lg"],
      description: "폭 96 · 160 · 220px (높이는 비율)",
    },
  },
} satisfies Meta<typeof Illustration>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { scene: "coinPouch", size: "lg" },
};

export const AllScenes: Story = {
  args: { scene: "coinPouch" },
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
      {SCENES.map((scene) => (
        <figure key={scene} style={{ margin: 0, textAlign: "center" }}>
          <Illustration scene={scene} />
          <figcaption>{scene}</figcaption>
        </figure>
      ))}
    </div>
  ),
};

export const AllSizes: Story = {
  args: { scene: "candles" },
  render: () => (
    <div style={{ display: "flex", gap: 24, alignItems: "flex-end" }}>
      <Illustration scene="candles" size="sm" />
      <Illustration scene="candles" size="md" />
      <Illustration scene="candles" size="lg" />
    </div>
  ),
};
