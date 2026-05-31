import type { Meta, StoryObj } from "@storybook/react";
import { FlexBox } from "./FlexBox";
import { Card } from "../Card/Card";

const meta = {
  title: "Layout/FlexBox",
  component: FlexBox,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    direction: {
      control: "select",
      options: ["row", "column", "rowReverse", "columnReverse"],
      description: "Flex 방향",
    },
    justify: {
      control: "select",
      options: ["start", "center", "end", "between", "around", "evenly"],
      description: "주축 정렬",
    },
    align: {
      control: "select",
      options: ["start", "center", "end", "stretch", "baseline"],
      description: "교차축 정렬",
    },
    gap: {
      control: "select",
      options: ["none", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"],
      description: "간격",
    },
    wrap: {
      control: "select",
      options: ["nowrap", "wrap", "wrapReverse"],
      description: "줄바꿈",
    },
    fullWidth: {
      control: "boolean",
      description: "전체 너비",
    },
    fullHeight: {
      control: "boolean",
      description: "전체 높이",
    },
  },
} satisfies Meta<typeof FlexBox>;

export default meta;
type Story = StoryObj<typeof meta>;

const Box = ({ children, ...props }: any) => (
  <div
    style={{
      padding: "1rem",
      background: "#7949FF",
      color: "white",
      borderRadius: "8px",
      textAlign: "center",
      minWidth: "60px",
      ...props.style,
    }}
  >
    {children}
  </div>
);

// ===== Direction =====
export const Row: Story = {
  args: {
    direction: "row",
    gap: "md",
    children: (
      <>
        <Box>1</Box>
        <Box>2</Box>
        <Box>3</Box>
      </>
    ),
  },
};

export const Column: Story = {
  args: {
    direction: "column",
    gap: "md",
    children: (
      <>
        <Box>1</Box>
        <Box>2</Box>
        <Box>3</Box>
      </>
    ),
  },
};

export const RowReverse: Story = {
  args: {
    direction: "rowReverse",
    gap: "md",
    children: (
      <>
        <Box>1</Box>
        <Box>2</Box>
        <Box>3</Box>
      </>
    ),
  },
};

export const ColumnReverse: Story = {
  args: {
    direction: "columnReverse",
    gap: "md",
    children: (
      <>
        <Box>1</Box>
        <Box>2</Box>
        <Box>3</Box>
      </>
    ),
  },
};

// ===== Justify =====
export const JustifyStart: Story = {
  args: {
    justify: "start",
    gap: "md",
    children: (
      <>
        <Box>1</Box>
        <Box>2</Box>
        <Box>3</Box>
      </>
    ),
  },
};

export const JustifyCenter: Story = {
  args: {
    justify: "center",
    gap: "md",
    children: (
      <>
        <Box>1</Box>
        <Box>2</Box>
        <Box>3</Box>
      </>
    ),
  },
};

export const JustifyEnd: Story = {
  args: {
    justify: "end",
    gap: "md",
    children: (
      <>
        <Box>1</Box>
        <Box>2</Box>
        <Box>3</Box>
      </>
    ),
  },
};

export const JustifyBetween: Story = {
  args: {
    justify: "between",
    children: (
      <>
        <Box>1</Box>
        <Box>2</Box>
        <Box>3</Box>
      </>
    ),
  },
};

export const JustifyAround: Story = {
  args: {
    justify: "around",
    children: (
      <>
        <Box>1</Box>
        <Box>2</Box>
        <Box>3</Box>
      </>
    ),
  },
};

export const JustifyEvenly: Story = {
  args: {
    justify: "evenly",
    children: (
      <>
        <Box>1</Box>
        <Box>2</Box>
        <Box>3</Box>
      </>
    ),
  },
};

// ===== Align =====
export const AlignStart: Story = {
  args: {
    align: "start",
    gap: "md",
    style: { height: "200px", border: "2px dashed #ddd" },
    children: (
      <>
        <Box>1</Box>
        <Box style={{ height: "80px" }}>2</Box>
        <Box>3</Box>
      </>
    ),
  },
};

export const AlignCenter: Story = {
  args: {
    align: "center",
    gap: "md",
    style: { height: "200px", border: "2px dashed #ddd" },
    children: (
      <>
        <Box>1</Box>
        <Box style={{ height: "80px" }}>2</Box>
        <Box>3</Box>
      </>
    ),
  },
};

export const AlignEnd: Story = {
  args: {
    align: "end",
    gap: "md",
    style: { height: "200px", border: "2px dashed #ddd" },
    children: (
      <>
        <Box>1</Box>
        <Box style={{ height: "80px" }}>2</Box>
        <Box>3</Box>
      </>
    ),
  },
};

export const AlignStretch: Story = {
  args: {
    align: "stretch",
    gap: "md",
    style: { height: "200px", border: "2px dashed #ddd" },
    children: (
      <>
        <Box>1</Box>
        <Box>2</Box>
        <Box>3</Box>
      </>
    ),
  },
};

// ===== Gap =====
export const GapSizes: Story = {
  args: {
    children: "FlexBox",
  },
  render: () => (
    <FlexBox direction="column" gap="xl">
      <div>
        <p style={{ marginBottom: "0.5rem" }}>No Gap:</p>
        <FlexBox gap="none">
          <Box>1</Box>
          <Box>2</Box>
          <Box>3</Box>
        </FlexBox>
      </div>
      <div>
        <p style={{ marginBottom: "0.5rem" }}>Small Gap (8px):</p>
        <FlexBox gap="sm">
          <Box>1</Box>
          <Box>2</Box>
          <Box>3</Box>
        </FlexBox>
      </div>
      <div>
        <p style={{ marginBottom: "0.5rem" }}>Medium Gap (12px):</p>
        <FlexBox gap="md">
          <Box>1</Box>
          <Box>2</Box>
          <Box>3</Box>
        </FlexBox>
      </div>
      <div>
        <p style={{ marginBottom: "0.5rem" }}>Large Gap (16px):</p>
        <FlexBox gap="lg">
          <Box>1</Box>
          <Box>2</Box>
          <Box>3</Box>
        </FlexBox>
      </div>
      <div>
        <p style={{ marginBottom: "0.5rem" }}>XL Gap (24px):</p>
        <FlexBox gap="xl">
          <Box>1</Box>
          <Box>2</Box>
          <Box>3</Box>
        </FlexBox>
      </div>
    </FlexBox>
  ),
};

// ===== Wrap =====
export const NoWrap: Story = {
  args: {
    wrap: "nowrap",
    gap: "md",
    style: { width: "300px", border: "2px dashed #ddd" },
    children: (
      <>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Box key={i}>{i}</Box>
        ))}
      </>
    ),
  },
};

export const Wrap: Story = {
  args: {
    wrap: "wrap",
    gap: "md",
    style: { width: "300px", border: "2px dashed #ddd" },
    children: (
      <>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Box key={i}>{i}</Box>
        ))}
      </>
    ),
  },
};
