import type { Meta, StoryObj } from "@storybook/react";
import { Heading } from "./Heading";

const meta = {
  title: "Typography/Heading",
  component: Heading,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    level: {
      control: "select",
      options: [1, 2, 3, 4, 5, 6],
      description: "HTML 헤딩 레벨",
    },
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg", "xl", "2xl", "3xl"],
      description: "폰트 크기 오버라이드",
    },
    color: {
      control: "select",
      options: ["primary", "secondary", "tertiary", "brand", "white"],
      description: "텍스트 색상",
    },
  },
} satisfies Meta<typeof Heading>;

export default meta;
type Story = StoryObj<typeof meta>;

// 기본 레벨들
export const Level1: Story = {
  args: {
    children: "H1 제목",
    level: 1,
  },
};

export const Level2: Story = {
  args: {
    children: "H2 제목",
    level: 2,
  },
};

export const Level3: Story = {
  args: {
    children: "H3 제목",
    level: 3,
  },
};

// 크기 오버라이드
export const CustomSize: Story = {
  args: {
    children: "H3 태그지만 큰 크기",
    level: 3,
    size: "3xl",
  },
};

// 색상 변경
export const BrandColor: Story = {
  args: {
    children: "브랜드 색상 제목",
    level: 2,
    color: "brand",
  },
};

export const WhiteColor: Story = {
  args: {
    children: "흰색 제목",
    level: 2,
    color: "white",
  },
  parameters: {
    backgrounds: { default: "dark" },
  },
};

// 모든 레벨 표시
export const AllLevels: Story = {
  args: {
    children: "Heading",
    level: 2,
  },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <Heading level={1}>482,225원</Heading>
      <Heading level={2}>482,225원</Heading>
      <Heading level={3}>482,225원</Heading>
      <Heading level={4}>482,225원</Heading>
      <Heading level={5}>482,225원</Heading>
      <Heading level={6}>482,225원</Heading>
    </div>
  ),
};

// 색상 변형들
export const ColorVariants: Story = {
  args: {
    children: "Color Variants",
    level: 2,
  },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <Heading level={2} color="primary">
        Primary Color
      </Heading>
      <Heading level={2} color="secondary">
        Secondary Color
      </Heading>
      <Heading level={2} color="tertiary">
        Tertiary Color
      </Heading>
      <Heading level={2} color="brand">
        Brand Color
      </Heading>
    </div>
  ),
};

// 유연한 조합
export const FlexibleCombination: Story = {
  args: {
    children: "Flexible Combination",
    level: 2,
  },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <Heading level={3} size="3xl" color="brand">
        H3 태그 / 큰 크기 / 브랜드 색상
      </Heading>
      <Heading level={1} size="md" color="secondary">
        H1 태그 / 작은 크기 / 보조 색상
      </Heading>
    </div>
  ),
};
