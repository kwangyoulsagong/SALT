import type { Meta, StoryObj } from "@storybook/react";
import { Padding } from "./Padding.tsx";

const meta = {
  title: "Layout/Padding",
  component: Padding,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    padding: {
      control: "select",
      options: ["none", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"],
      description: "전체 패딩",
    },
    paddingX: {
      control: "select",
      options: ["none", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"],
      description: "좌우 패딩",
    },
    paddingY: {
      control: "select",
      options: ["none", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"],
      description: "상하 패딩",
    },
    paddingTop: {
      control: "select",
      options: ["none", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"],
      description: "상단 패딩",
    },
    paddingBottom: {
      control: "select",
      options: ["none", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"],
      description: "하단 패딩",
    },
    paddingLeft: {
      control: "select",
      options: ["none", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"],
      description: "좌측 패딩",
    },
    paddingRight: {
      control: "select",
      options: ["none", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"],
      description: "우측 패딩",
    },
  },
} satisfies Meta<typeof Padding>;

export default meta;
type Story = StoryObj<typeof meta>;

const Box = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      background: "#7949FF",
      color: "white",
      padding: "1rem",
      borderRadius: "8px",
      textAlign: "center",
    }}
  >
    {children}
  </div>
);

const OutlineBox = ({ children }: { children: React.ReactNode }) => (
  <div style={{ border: "2px dashed #7949FF", borderRadius: "8px" }}>
    {children}
  </div>
);

// ===== Basic Padding =====
export const Default: Story = {
  args: {
    padding: "md",
    children: <Box>Medium Padding (기본)</Box>,
  },
};

export const Small: Story = {
  args: {
    padding: "sm",
    children: <Box>Small Padding</Box>,
  },
};

export const Large: Story = {
  args: {
    padding: "lg",
    children: <Box>Large Padding</Box>,
  },
};

export const ExtraLarge: Story = {
  args: {
    padding: "2xl",
    children: <Box>2XL Padding</Box>,
  },
};

// ===== All Sizes =====
export const AllPaddingSizes: Story = {
  args: {
    children: "Padding",
  },
  render: () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        width: "400px",
      }}
    >
      <OutlineBox>
        <Padding padding="xs">
          <Box>XS (4px)</Box>
        </Padding>
      </OutlineBox>
      <OutlineBox>
        <Padding padding="sm">
          <Box>SM (8px)</Box>
        </Padding>
      </OutlineBox>
      <OutlineBox>
        <Padding padding="md">
          <Box>MD (12px)</Box>
        </Padding>
      </OutlineBox>
      <OutlineBox>
        <Padding padding="lg">
          <Box>LG (16px)</Box>
        </Padding>
      </OutlineBox>
      <OutlineBox>
        <Padding padding="xl">
          <Box>XL (24px)</Box>
        </Padding>
      </OutlineBox>
      <OutlineBox>
        <Padding padding="2xl">
          <Box>2XL (32px)</Box>
        </Padding>
      </OutlineBox>
      <OutlineBox>
        <Padding padding="3xl">
          <Box>3XL (48px)</Box>
        </Padding>
      </OutlineBox>
    </div>
  ),
};

// ===== X/Y Padding =====
export const HorizontalPadding: Story = {
  args: {
    paddingX: "xl",
    children: (
      <OutlineBox>
        <Box>좌우 패딩만 (XL)</Box>
      </OutlineBox>
    ),
  },
};

export const VerticalPadding: Story = {
  args: {
    paddingY: "xl",
    children: (
      <OutlineBox>
        <Box>상하 패딩만 (XL)</Box>
      </OutlineBox>
    ),
  },
};

export const DifferentXY: Story = {
  args: {
    paddingX: "2xl",
    paddingY: "sm",
    children: (
      <OutlineBox>
        <Box>X: 2XL, Y: SM</Box>
      </OutlineBox>
    ),
  },
};

// ===== Directional Padding =====
export const TopPadding: Story = {
  args: {
    paddingTop: "2xl",
    children: (
      <OutlineBox>
        <Box>상단 패딩만 (2XL)</Box>
      </OutlineBox>
    ),
  },
};

export const BottomPadding: Story = {
  args: {
    paddingBottom: "2xl",
    children: (
      <OutlineBox>
        <Box>하단 패딩만 (2XL)</Box>
      </OutlineBox>
    ),
  },
};

export const LeftPadding: Story = {
  args: {
    paddingLeft: "2xl",
    children: (
      <OutlineBox>
        <Box>좌측 패딩만 (2XL)</Box>
      </OutlineBox>
    ),
  },
};

export const RightPadding: Story = {
  args: {
    paddingRight: "2xl",
    children: (
      <OutlineBox>
        <Box>우측 패딩만 (2XL)</Box>
      </OutlineBox>
    ),
  },
};

export const AllDirections: Story = {
  args: {
    children: "Padding",
  },
  render: () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        width: "400px",
      }}
    >
      <OutlineBox>
        <Padding paddingTop="xl">
          <Box>상단만 XL</Box>
        </Padding>
      </OutlineBox>
      <OutlineBox>
        <Padding paddingBottom="xl">
          <Box>하단만 XL</Box>
        </Padding>
      </OutlineBox>
      <OutlineBox>
        <Padding paddingLeft="xl">
          <Box>좌측만 XL</Box>
        </Padding>
      </OutlineBox>
      <OutlineBox>
        <Padding paddingRight="xl">
          <Box>우측만 XL</Box>
        </Padding>
      </OutlineBox>
    </div>
  ),
};

// ===== Complex Combinations =====
export const CustomCombination: Story = {
  args: {
    paddingTop: "2xl",
    paddingBottom: "sm",
    paddingLeft: "xl",
    paddingRight: "md",
    children: (
      <OutlineBox>
        <Box>각각 다른 패딩</Box>
      </OutlineBox>
    ),
  },
};

export const AsymmetricPadding: Story = {
  args: {
    children: "Padding",
  },
  render: () => (
    <OutlineBox>
      <Padding
        paddingTop="3xl"
        paddingBottom="xs"
        paddingLeft="xl"
        paddingRight="sm"
      >
        <Box>비대칭 패딩 (Top: 3XL, Bottom: XS, Left: XL, Right: SM)</Box>
      </Padding>
    </OutlineBox>
  ),
};
