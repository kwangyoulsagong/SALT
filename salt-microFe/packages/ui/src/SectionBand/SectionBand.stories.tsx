import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SectionBand } from "./SectionBand";

const meta = {
  title: "Components/SectionBand",
  component: SectionBand,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    thickness: {
      control: "select",
      options: ["thin", "base", "thick"],
      description: "밴드 두께. base가 8px 기본값",
    },
  },
} satisfies Meta<typeof SectionBand>;

export default meta;
type Story = StoryObj<typeof meta>;

const Block = ({ label }: { label: string }) => (
  <div style={{ background: "#FFFFFF", padding: 20 }}>{label}</div>
);

export const Default: Story = {
  render: (args) => (
    <div>
      <Block label="보유 종목" />
      <SectionBand {...args} />
      <Block label="관심 종목" />
    </div>
  ),
};

export const AllThickness: Story = {
  render: () => (
    <div>
      <Block label="thin" />
      <SectionBand thickness="thin" />
      <Block label="base" />
      <SectionBand thickness="base" />
      <Block label="thick" />
      <SectionBand thickness="thick" />
      <Block label="끝" />
    </div>
  ),
};
