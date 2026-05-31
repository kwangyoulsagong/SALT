import type { Meta, StoryObj } from "@storybook/react";
import { Grid, GridItem } from "./Grid";
import { Card } from "../Card/Card";

const meta = {
  title: "Layout/Grid",
  component: Grid,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    columns: {
      control: "select",
      options: [1, 2, 3, 4, 5, 6, 12],
      description: "그리드 컬럼 수",
    },
    gap: {
      control: "select",
      options: ["none", "xs", "sm", "md", "lg", "xl", "2xl"],
      description: "그리드 간격",
    },
    rowGap: {
      control: "select",
      options: ["none", "xs", "sm", "md", "lg", "xl", "2xl"],
      description: "행 간격 (별도 조절)",
    },
    columnGap: {
      control: "select",
      options: ["none", "xs", "sm", "md", "lg", "xl", "2xl"],
      description: "열 간격 (별도 조절)",
    },
    responsive: {
      control: "boolean",
      description: "반응형 그리드 사용",
    },
    minWidth: {
      control: "select",
      options: ["xs", "sm", "md", "lg", "xl"],
      description: "반응형 그리드 최소 너비",
    },
    fullWidth: {
      control: "boolean",
      description: "전체 너비 사용",
    },
  },
} satisfies Meta<typeof Grid>;

export default meta;
type Story = StoryObj<typeof meta>;

const Box = ({ children, ...props }: any) => (
  <div
    style={{
      padding: "2rem",
      background: "#7949FF",
      color: "white",
      borderRadius: "8px",
      textAlign: "center",
      fontSize: "18px",
      fontWeight: "600",
      ...props.style,
    }}
  >
    {children}
  </div>
);

// ===== Basic Examples =====
export const Default: Story = {
  args: {
    columns: 3,
    gap: "md",
    children: (
      <>
        <Box>1</Box>
        <Box>2</Box>
        <Box>3</Box>
        <Box>4</Box>
        <Box>5</Box>
        <Box>6</Box>
      </>
    ),
  },
};

export const TwoColumns: Story = {
  args: {
    columns: 2,
    gap: "md",
    children: (
      <>
        <Box>1</Box>
        <Box>2</Box>
        <Box>3</Box>
        <Box>4</Box>
      </>
    ),
  },
};

export const FourColumns: Story = {
  args: {
    columns: 4,
    gap: "md",
    children: (
      <>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Box key={i}>{i}</Box>
        ))}
      </>
    ),
  },
};

export const SixColumns: Story = {
  args: {
    columns: 6,
    gap: "sm",
    children: (
      <>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
          <Box key={i} style={{ padding: "1rem" }}>
            {i}
          </Box>
        ))}
      </>
    ),
  },
};

// ===== Gap Variants =====
export const NoGap: Story = {
  args: {
    columns: 3,
    gap: "none",
    children: (
      <>
        <Box>1</Box>
        <Box>2</Box>
        <Box>3</Box>
      </>
    ),
  },
};

export const SmallGap: Story = {
  args: {
    columns: 3,
    gap: "sm",
    children: (
      <>
        <Box>1</Box>
        <Box>2</Box>
        <Box>3</Box>
      </>
    ),
  },
};

export const LargeGap: Story = {
  args: {
    columns: 3,
    gap: "lg",
    children: (
      <>
        <Box>1</Box>
        <Box>2</Box>
        <Box>3</Box>
      </>
    ),
  },
};

export const ExtraLargeGap: Story = {
  args: {
    columns: 3,
    gap: "2xl",
    children: (
      <>
        <Box>1</Box>
        <Box>2</Box>
        <Box>3</Box>
      </>
    ),
  },
};

export const AllGapSizes: Story = {
  args: {
    children: "Grid",
  },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div>
        <h3 style={{ marginBottom: "1rem" }}>No Gap</h3>
        <Grid columns={3} gap="none">
          <Box>1</Box>
          <Box>2</Box>
          <Box>3</Box>
        </Grid>
      </div>
      <div>
        <h3 style={{ marginBottom: "1rem" }}>Small Gap (8px)</h3>
        <Grid columns={3} gap="sm">
          <Box>1</Box>
          <Box>2</Box>
          <Box>3</Box>
        </Grid>
      </div>
      <div>
        <h3 style={{ marginBottom: "1rem" }}>Medium Gap (12px)</h3>
        <Grid columns={3} gap="md">
          <Box>1</Box>
          <Box>2</Box>
          <Box>3</Box>
        </Grid>
      </div>
      <div>
        <h3 style={{ marginBottom: "1rem" }}>Large Gap (16px)</h3>
        <Grid columns={3} gap="lg">
          <Box>1</Box>
          <Box>2</Box>
          <Box>3</Box>
        </Grid>
      </div>
      <div>
        <h3 style={{ marginBottom: "1rem" }}>XL Gap (24px)</h3>
        <Grid columns={3} gap="xl">
          <Box>1</Box>
          <Box>2</Box>
          <Box>3</Box>
        </Grid>
      </div>
    </div>
  ),
};

export const CustomRowColumnGap: Story = {
  args: {
    columns: 3,
    rowGap: "xl",
    columnGap: "sm",
    children: (
      <>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Box key={i}>{i}</Box>
        ))}
      </>
    ),
  },
};

// ===== Responsive Grid =====
export const ResponsiveGrid: Story = {
  args: {
    responsive: true,
    minWidth: "md",
    gap: "lg",
    children: (
      <>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} padding="lg">
            <h3 style={{ margin: "0 0 0.5rem 0" }}>카드 {i}</h3>
            <p style={{ margin: 0, color: "#666" }}>
              반응형 그리드입니다. 화면 크기를 조절해보세요!
            </p>
          </Card>
        ))}
      </>
    ),
  },
};

export const ResponsiveSmall: Story = {
  args: {
    responsive: true,
    minWidth: "sm",
    gap: "md",
    children: (
      <>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Box key={i} style={{ padding: "1.5rem" }}>
            {i}
          </Box>
        ))}
      </>
    ),
  },
};

export const ResponsiveLarge: Story = {
  args: {
    responsive: true,
    minWidth: "lg",
    gap: "xl",
    children: (
      <>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} padding="xl">
            <h3>항목 {i}</h3>
            <p style={{ color: "#666" }}>큰 최소 너비를 가진 반응형 그리드</p>
          </Card>
        ))}
      </>
    ),
  },
};
