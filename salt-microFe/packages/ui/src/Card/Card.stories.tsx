import type { Meta, StoryObj } from "@storybook/react";
import { Card } from "./Card.tsx";

const meta = {
  title: "Components/Card",
  component: Card,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    padding: {
      control: "select",
      options: ["none", "sm", "md", "lg", "xl"],
      description: "카드 내부 패딩",
    },
    children: {
      control: "text",
      description: "카드 내용",
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

// ===== Padding Variants =====
export const NoPadding: Story = {
  args: {
    children: "패딩 없는 카드",
    padding: "none",
  },
};

export const SmallPadding: Story = {
  args: {
    children: "작은 패딩 카드",
    padding: "sm",
  },
};

export const MediumPadding: Story = {
  args: {
    children: "중간 패딩 카드 (기본값)",
    padding: "md",
  },
};

export const LargePadding: Story = {
  args: {
    children: "큰 패딩 카드",
    padding: "lg",
  },
};

export const ExtraLargePadding: Story = {
  args: {
    children: "아주 큰 패딩 카드",
    padding: "xl",
  },
};

// ===== Showcases =====
export const AllPaddings: Story = {
  args: {
    children: "Card",
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
      <Card padding="none">
        <div style={{ padding: "8px", background: "#f0f0f0" }}>
          None: 패딩 없음
        </div>
      </Card>
      <Card padding="sm">Small: 작은 패딩 (12px)</Card>
      <Card padding="md">Medium: 중간 패딩 (16px)</Card>
      <Card padding="lg">Large: 큰 패딩 (24px)</Card>
      <Card padding="xl">XL: 아주 큰 패딩 (32px)</Card>
    </div>
  ),
};

// ===== Real-world Examples =====
export const UserProfile: Story = {
  args: {
    children: "Card",
  },
  render: () => (
    <Card padding="lg">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "#7949FF",
          }}
        />
        <div>
          <h3 style={{ margin: 0, marginBottom: "4px" }}>홍길동</h3>
          <p style={{ margin: 0, color: "#666" }}>hong@example.com</p>
        </div>
      </div>
      <p style={{ margin: 0, color: "#666" }}>
        프론트엔드 개발자 | React, TypeScript
      </p>
    </Card>
  ),
};

export const ProductCard: Story = {
  args: {
    children: "Card",
  },
  render: () => (
    <Card padding="none">
      <div
        style={{
          height: "200px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: "20px 20px 0 0",
        }}
      />
      <div style={{ padding: "16px" }}>
        <h3 style={{ margin: "0 0 8px 0" }}>제품 이름</h3>
        <p style={{ margin: "0 0 16px 0", color: "#666" }}>
          제품에 대한 간단한 설명입니다.
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "24px", fontWeight: "bold" }}>₩29,000</span>
          <button
            style={{
              padding: "8px 16px",
              background: "#7949FF",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            구매하기
          </button>
        </div>
      </div>
    </Card>
  ),
};

export const StatCard: Story = {
  args: {
    children: "Card",
  },
  render: () => (
    <div style={{ display: "flex", gap: "16px" }}>
      <Card padding="lg">
        <p style={{ margin: "0 0 8px 0", color: "#666", fontSize: "14px" }}>
          총 사용자
        </p>
        <h2 style={{ margin: "0", fontSize: "32px" }}>1,234</h2>
        <p style={{ margin: "8px 0 0 0", color: "#51CF66", fontSize: "14px" }}>
          ↑ 12% 증가
        </p>
      </Card>
      <Card padding="lg">
        <p style={{ margin: "0 0 8px 0", color: "#666", fontSize: "14px" }}>
          총 수익
        </p>
        <h2 style={{ margin: "0", fontSize: "32px" }}>₩5.2M</h2>
        <p style={{ margin: "8px 0 0 0", color: "#FF6B6B", fontSize: "14px" }}>
          ↓ 3% 감소
        </p>
      </Card>
    </div>
  ),
};

export const FormCard: Story = {
  args: {
    children: "Card",
  },
  render: () => (
    <Card padding="xl">
      <h2 style={{ margin: "0 0 24px 0" }}>문의하기</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <input
          type="text"
          placeholder="이름"
          style={{
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #ddd",
            fontSize: "14px",
          }}
        />
        <input
          type="email"
          placeholder="이메일"
          style={{
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #ddd",
            fontSize: "14px",
          }}
        />
        <textarea
          placeholder="메시지"
          rows={4}
          style={{
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #ddd",
            fontSize: "14px",
            fontFamily: "inherit",
            resize: "vertical",
          }}
        />
        <button
          style={{
            padding: "12px",
            background: "#7949FF",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          전송하기
        </button>
      </div>
    </Card>
  ),
};

export const NotificationCard: Story = {
  args: {
    children: "Card",
  },
  render: () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        width: "400px",
      }}
    >
      <Card padding="md">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "start",
          }}
        >
          <div>
            <h4 style={{ margin: "0 0 4px 0" }}>새 메시지가 도착했습니다</h4>
            <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
              홍길동님이 메시지를 보냈습니다.
            </p>
          </div>
          <span style={{ color: "#666", fontSize: "12px" }}>5분 전</span>
        </div>
      </Card>
      <Card padding="md">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "start",
          }}
        >
          <div>
            <h4 style={{ margin: "0 0 4px 0" }}>결제가 완료되었습니다</h4>
            <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
              ₩29,000 결제가 성공적으로 완료되었습니다.
            </p>
          </div>
          <span style={{ color: "#666", fontSize: "12px" }}>1시간 전</span>
        </div>
      </Card>
    </div>
  ),
};

export const ImageCard: Story = {
  args: {
    children: "Card",
  },
  render: () => (
    <Card padding="none">
      <div
        style={{
          height: "250px",
          background: "linear-gradient(45deg, #F59D71 0%, #FF6B6B 100%)",
        }}
      />
      <div style={{ padding: "20px" }}>
        <h3 style={{ margin: "0 0 8px 0" }}>멋진 제목</h3>
        <p style={{ margin: "0", color: "#666", lineHeight: "1.6" }}>
          이미지와 함께 표시되는 카드입니다. padding="none"으로 설정하여
          이미지가 카드 가장자리까지 표시됩니다.
        </p>
      </div>
    </Card>
  ),
};

export const CardGrid: Story = {
  args: {
    children: "Card",
  },
  render: () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "16px",
        width: "800px",
      }}
    >
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} padding="lg">
          <h3 style={{ margin: "0 0 8px 0" }}>카드 {i}</h3>
          <p style={{ margin: 0, color: "#666" }}>카드 내용</p>
        </Card>
      ))}
    </div>
  ),
};
