import type { Meta, StoryObj } from "@storybook/react";
import { Section } from "./Section.tsx";
import { FlexBox } from "../FlexBox/FlexBox.tsx";
import { Card } from "../Card/Card.tsx";

const meta = {
  title: "Layout/Section",
  component: Section,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    padding: {
      control: "select",
      options: ["none", "sm", "md", "lg", "xl"],
      description: "섹션 상하 패딩",
    },
    background: {
      control: "select",
      options: ["transparent", "white", "gray", "brand", "dark", "gradient"],
      description: "배경색",
    },
    containerSize: {
      control: "select",
      options: ["sm", "md", "lg", "xl", "2xl", "full"],
      description: "내부 컨테이너 최대 너비",
    },
    noContainer: {
      control: "boolean",
      description: "컨테이너 사용 안 함",
    },
    fullWidth: {
      control: "boolean",
      description: "전체 너비 사용",
    },
  },
} satisfies Meta<typeof Section>;

export default meta;
type Story = StoryObj<typeof meta>;

// ===== Padding Variants =====
export const SmallPadding: Story = {
  args: {
    padding: "sm",
    background: "gray",
    children: (
      <div>
        <h2>Small Padding Section</h2>
        <p>작은 패딩이 적용된 섹션입니다.</p>
      </div>
    ),
  },
};

export const MediumPadding: Story = {
  args: {
    padding: "md",
    background: "gray",
    children: (
      <div>
        <h2>Medium Padding Section (기본값)</h2>
        <p>중간 패딩이 적용된 섹션입니다.</p>
      </div>
    ),
  },
};

export const LargePadding: Story = {
  args: {
    padding: "lg",
    background: "gray",
    children: (
      <div>
        <h2>Large Padding Section</h2>
        <p>큰 패딩이 적용된 섹션입니다.</p>
      </div>
    ),
  },
};

export const ExtraLargePadding: Story = {
  args: {
    padding: "xl",
    background: "gray",
    children: (
      <div>
        <h2>Extra Large Padding Section</h2>
        <p>아주 큰 패딩이 적용된 섹션입니다.</p>
      </div>
    ),
  },
};

export const NoPadding: Story = {
  args: {
    padding: "none",
    background: "gray",
    children: (
      <div style={{ padding: "1rem" }}>
        <h2>No Padding Section</h2>
        <p>패딩이 없는 섹션입니다.</p>
      </div>
    ),
  },
};

// ===== Background Variants =====
export const Transparent: Story = {
  args: {
    background: "transparent",
    children: (
      <div>
        <h2>Transparent Background</h2>
        <p>투명한 배경의 섹션입니다.</p>
      </div>
    ),
  },
};

export const White: Story = {
  args: {
    background: "white",
    children: (
      <div>
        <h2>White Background</h2>
        <p>흰색 배경의 섹션입니다.</p>
      </div>
    ),
  },
};

export const Gray: Story = {
  args: {
    background: "gray",
    children: (
      <div>
        <h2>Gray Background</h2>
        <p>회색 배경의 섹션입니다.</p>
      </div>
    ),
  },
};

export const Brand: Story = {
  args: {
    background: "brand",
    children: (
      <div>
        <h2>Brand Background</h2>
        <p>브랜드 색상 배경의 섹션입니다.</p>
      </div>
    ),
  },
};

export const Dark: Story = {
  args: {
    background: "dark",
    children: (
      <div>
        <h2>Dark Background</h2>
        <p>다크 배경의 섹션입니다.</p>
      </div>
    ),
  },
};

export const Gradient: Story = {
  args: {
    background: "gradient",
    children: (
      <div>
        <h2>Gradient Background</h2>
        <p>그라디언트 배경의 섹션입니다.</p>
      </div>
    ),
  },
};

// ===== Container Size =====
export const SmallContainer: Story = {
  args: {
    containerSize: "sm",
    background: "gray",
    children: (
      <Card padding="lg">
        <h2>Small Container (640px)</h2>
        <p>작은 컨테이너를 사용하는 섹션입니다.</p>
      </Card>
    ),
  },
};

export const LargeContainer: Story = {
  args: {
    containerSize: "lg",
    background: "gray",
    children: (
      <Card padding="lg">
        <h2>Large Container (1024px)</h2>
        <p>큰 컨테이너를 사용하는 섹션입니다.</p>
      </Card>
    ),
  },
};

export const NoContainer: Story = {
  args: {
    noContainer: true,
    background: "brand",
    padding: "lg",
    children: (
      <div style={{ textAlign: "center" }}>
        <h2>No Container</h2>
        <p>컨테이너 없이 전체 너비를 사용하는 섹션입니다.</p>
      </div>
    ),
  },
};

// ===== Real-world Examples =====
export const HeroSection: Story = {
  args: {
    children: "Section",
  },
  render: () => (
    <Section background="gradient" padding="xl">
      <FlexBox
        direction="column"
        align="center"
        gap="lg"
        style={{ textAlign: "center" }}
      >
        <h1 style={{ fontSize: "48px", margin: 0 }}>환영합니다</h1>
        <p style={{ fontSize: "20px", margin: 0, opacity: 0.9 }}>
          최고의 서비스를 경험하세요
        </p>
        <FlexBox gap="md">
          <button
            style={{
              padding: "12px 32px",
              background: "white",
              color: "#667eea",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            시작하기
          </button>
          <button
            style={{
              padding: "12px 32px",
              background: "transparent",
              color: "white",
              border: "2px solid white",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            더 알아보기
          </button>
        </FlexBox>
      </FlexBox>
    </Section>
  ),
};

export const FeaturesSection: Story = {
  args: {
    children: "Section",
  },
  render: () => (
    <Section background="white" padding="lg">
      <h2
        style={{ textAlign: "center", marginBottom: "3rem", fontSize: "36px" }}
      >
        주요 기능
      </h2>
      <FlexBox wrap="wrap" gap="lg">
        {[1, 2, 3].map((i) => (
          <Card key={i} padding="xl">
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "#7949FF",
                marginBottom: "1rem",
              }}
            />
            <h3 style={{ margin: "0 0 0.5rem 0" }}>기능 {i}</h3>
            <p style={{ margin: 0, color: "#666" }}>
              이것은 주요 기능에 대한 설명입니다.
            </p>
          </Card>
        ))}
      </FlexBox>
    </Section>
  ),
};

export const StatsSection: Story = {
  args: {
    children: "Section",
  },
  render: () => (
    <Section background="brand" padding="lg">
      <FlexBox
        justify="around"
        wrap="wrap"
        gap="xl"
        style={{ textAlign: "center" }}
      >
        {[
          { label: "사용자", value: "10K+" },
          { label: "프로젝트", value: "500+" },
          { label: "국가", value: "50+" },
          { label: "만족도", value: "99%" },
        ].map((stat, i) => (
          <div key={i}>
            <h2 style={{ fontSize: "48px", margin: "0 0 0.5rem 0" }}>
              {stat.value}
            </h2>
            <p style={{ fontSize: "18px", margin: 0, opacity: 0.9 }}>
              {stat.label}
            </p>
          </div>
        ))}
      </FlexBox>
    </Section>
  ),
};
