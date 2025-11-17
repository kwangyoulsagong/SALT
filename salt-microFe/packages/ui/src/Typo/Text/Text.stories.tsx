import type { Meta, StoryObj } from "@storybook/react";
import { Text } from "./Text.tsx";

const meta = {
  title: "Typography/Text",
  component: Text,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["body", "bodyLarge", "caption"],
      description: "텍스트 크기 및 굵기",
    },
    color: {
      control: "select",
      options: ["primary", "secondary", "tertiary", "muted", "brand", "white"],
      description: "텍스트 색상",
    },
    children: {
      control: "text",
      description: "텍스트 내용",
    },
  },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

// 기본 variants
export const Body: Story = {
  args: {
    children: "기본 본문 텍스트",
    variant: "body",
  },
};

export const BodyLarge: Story = {
  args: {
    children: "큰 본문 텍스트",
    variant: "bodyLarge",
  },
};

export const Caption: Story = {
  args: {
    children: "캡션 텍스트",
    variant: "caption",
  },
};

// 색상 variants
export const MutedText: Story = {
  args: {
    children: "example@email.com",
    variant: "body",
    color: "muted",
  },
};

export const BrandText: Story = {
  args: {
    children: "브랜드 색상 텍스트",
    variant: "bodyLarge",
    color: "brand",
  },
};

export const WhiteText: Story = {
  args: {
    children: "흰색 텍스트",
    variant: "body",
    color: "white",
  },
  parameters: {
    backgrounds: { default: "dark" },
  },
};

// 모든 조합
export const AllVariants: Story = {
  args: {
    children: "Sample Text",
    variant: "body",
  },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <strong>크기 변형</strong>
        <Text variant="body">Body: 기본 텍스트 (12px)</Text>
        <Text variant="bodyLarge">Body Large: 큰 텍스트 (14px)</Text>
        <Text variant="caption">Caption: 작은 텍스트 (10px, bold)</Text>
      </div>

      <div>
        <strong>색상 변형</strong>
        <Text color="primary">Primary 색상</Text>
        <Text color="secondary">Secondary 색상</Text>
        <Text color="tertiary">Tertiary 색상</Text>
        <Text color="muted">Muted 색상 (비활성)</Text>
        <Text color="brand">Brand 색상</Text>
      </div>

      <div>
        <strong>조합 예시</strong>
        <Text variant="bodyLarge" color="brand">
          큰 브랜드 텍스트
        </Text>
        <Text variant="caption" color="muted">
          작은 비활성 텍스트
        </Text>
      </div>
    </div>
  ),
};

export const UserProfile: Story = {
  args: {
    children: "Profile Text",
    variant: "body",
  },
  render: () => (
    <div style={{ maxWidth: "400px" }}>
      <h2 style={{ marginBottom: "0.5rem" }}>사용자 정보</h2>
      <Text variant="bodyLarge" color="primary">
        홍길동
      </Text>
      <Text variant="body" color="muted">
        hong@example.com
      </Text>
      <Text variant="body" color="tertiary">
        가입일: 2024년 1월 1일
      </Text>
      <Text variant="caption" color="brand">
        프리미엄 회원
      </Text>
    </div>
  ),
};

export const ColorShowcase: Story = {
  args: {
    children: "Color Text",
    variant: "body",
  },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <Text variant="body" color="primary">
        Primary - 주요 텍스트
      </Text>
      <Text variant="body" color="secondary">
        Secondary - 부제목
      </Text>
      <Text variant="body" color="tertiary">
        Tertiary - 보조 정보
      </Text>
      <Text variant="body" color="muted">
        Muted - 이메일, 날짜
      </Text>
      <Text variant="body" color="brand">
        Brand - 강조 텍스트
      </Text>
    </div>
  ),
};
