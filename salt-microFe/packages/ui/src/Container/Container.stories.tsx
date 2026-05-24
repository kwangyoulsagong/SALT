import type { Meta, StoryObj } from "@storybook/react";
import { Container } from "./Container.tsx";
import { Card } from "../Card/Card.tsx";

const meta = {
  title: "Layout/Container",
  component: Container,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg", "xl", "2xl", "full"],
      description: "컨테이너 최대 너비",
    },
    padding: {
      control: "select",
      options: ["none", "sm", "md", "lg", "xl"],
      description: "좌우 패딩",
    },
    centered: {
      control: "boolean",
      description: "콘텐츠 중앙 정렬",
    },
    as: {
      control: "select",
      options: ["div", "section", "main", "article", "header", "footer"],
      description: "HTML 태그",
    },
  },
} satisfies Meta<typeof Container>;

export default meta;
type Story = StoryObj<typeof meta>;

// ===== Size Variants =====
export const Small: Story = {
  args: {
    size: "sm",
    children: (
      <Card padding="lg">
        <h2>Small Container (640px)</h2>
        <p>작은 컨테이너입니다.</p>
      </Card>
    ),
  },
};

export const Medium: Story = {
  args: {
    size: "md",
    children: (
      <Card padding="lg">
        <h2>Medium Container (768px)</h2>
        <p>중간 크기 컨테이너입니다.</p>
      </Card>
    ),
  },
};

export const Large: Story = {
  args: {
    size: "lg",
    children: (
      <Card padding="lg">
        <h2>Large Container (1024px)</h2>
        <p>큰 컨테이너입니다.</p>
      </Card>
    ),
  },
};

export const ExtraLarge: Story = {
  args: {
    size: "xl",
    children: (
      <Card padding="lg">
        <h2>Extra Large Container (1280px)</h2>
        <p>아주 큰 컨테이너입니다 (기본값).</p>
      </Card>
    ),
  },
};

export const TwoExtraLarge: Story = {
  args: {
    size: "2xl",
    children: (
      <Card padding="lg">
        <h2>2XL Container (1536px)</h2>
        <p>최대 크기 컨테이너입니다.</p>
      </Card>
    ),
  },
};

export const FullWidth: Story = {
  args: {
    size: "full",
    children: (
      <Card padding="lg">
        <h2>Full Width Container</h2>
        <p>전체 너비 컨테이너입니다.</p>
      </Card>
    ),
  },
};

// ===== Size Comparison =====
export const AllSizes: Story = {
  args: {
    children: "Container",
  },
  render: () => (
    <div style={{ background: "#f5f5f5", padding: "2rem 0" }}>
      <Container size="sm" style={{ marginBottom: "1rem" }}>
        <Card padding="md">
          <strong>Small (640px)</strong>
        </Card>
      </Container>
      <Container size="md" style={{ marginBottom: "1rem" }}>
        <Card padding="md">
          <strong>Medium (768px)</strong>
        </Card>
      </Container>
      <Container size="lg" style={{ marginBottom: "1rem" }}>
        <Card padding="md">
          <strong>Large (1024px)</strong>
        </Card>
      </Container>
      <Container size="xl" style={{ marginBottom: "1rem" }}>
        <Card padding="md">
          <strong>Extra Large (1280px)</strong>
        </Card>
      </Container>
      <Container size="2xl" style={{ marginBottom: "1rem" }}>
        <Card padding="md">
          <strong>2XL (1536px)</strong>
        </Card>
      </Container>
    </div>
  ),
};

// ===== Padding Variants =====
export const NoPadding: Story = {
  args: {
    size: "lg",
    padding: "none",
    children: (
      <div style={{ background: "#e0e0e0", padding: "1rem" }}>패딩 없음</div>
    ),
  },
};

export const CustomPadding: Story = {
  args: {
    children: "Container",
  },
  render: () => (
    <div style={{ background: "#f5f5f5", padding: "2rem 0" }}>
      <Container padding="sm" style={{ marginBottom: "1rem" }}>
        <div style={{ background: "#fff", padding: "1rem" }}>Small Padding</div>
      </Container>
      <Container padding="md" style={{ marginBottom: "1rem" }}>
        <div style={{ background: "#fff", padding: "1rem" }}>
          Medium Padding
        </div>
      </Container>
      <Container padding="lg" style={{ marginBottom: "1rem" }}>
        <div style={{ background: "#fff", padding: "1rem" }}>
          Large Padding (기본값)
        </div>
      </Container>
      <Container padding="xl">
        <div style={{ background: "#fff", padding: "1rem" }}>XL Padding</div>
      </Container>
    </div>
  ),
};

// ===== Centered =====
export const Centered: Story = {
  args: {
    size: "md",
    centered: true,
    children: (
      <div style={{ textAlign: "center" }}>
        <h2>중앙 정렬 컨테이너</h2>
        <p>콘텐츠가 중앙에 정렬됩니다.</p>
      </div>
    ),
  },
};

// ===== Real-world Examples =====
export const BlogPost: Story = {
  args: {
    children: "Container",
  },
  render: () => (
    <Container size="md" as="article">
      <h1 style={{ marginBottom: "1rem" }}>블로그 포스트 제목</h1>
      <p style={{ color: "#666", marginBottom: "2rem" }}>
        2024년 11월 17일 · 5분 읽기
      </p>
      <img
        src="https://via.placeholder.com/800x400"
        alt="Cover"
        style={{ width: "100%", borderRadius: "12px", marginBottom: "2rem" }}
      />
      <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua.
      </p>
      <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
        Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi
        ut aliquip ex ea commodo consequat.
      </p>
    </Container>
  ),
};

export const Dashboard: Story = {
  args: {
    children: "Container",
  },
  render: () => (
    <div
      style={{ background: "#f5f5f5", minHeight: "100vh", padding: "2rem 0" }}
    >
      <Container size="xl">
        <h1 style={{ marginBottom: "2rem" }}>대시보드</h1>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <Card padding="lg">
            <h3 style={{ margin: "0 0 0.5rem 0" }}>총 사용자</h3>
            <p style={{ fontSize: "32px", fontWeight: "bold", margin: 0 }}>
              1,234
            </p>
          </Card>
          <Card padding="lg">
            <h3 style={{ margin: "0 0 0.5rem 0" }}>총 수익</h3>
            <p style={{ fontSize: "32px", fontWeight: "bold", margin: 0 }}>
              ₩5.2M
            </p>
          </Card>
          <Card padding="lg">
            <h3 style={{ margin: "0 0 0.5rem 0" }}>활성 세션</h3>
            <p style={{ fontSize: "32px", fontWeight: "bold", margin: 0 }}>
              567
            </p>
          </Card>
        </div>
        <Card padding="lg">
          <h2 style={{ margin: "0 0 1rem 0" }}>최근 활동</h2>
          <p>활동 내역이 여기에 표시됩니다.</p>
        </Card>
      </Container>
    </div>
  ),
};
