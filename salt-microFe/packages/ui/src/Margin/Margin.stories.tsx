import type { Meta, StoryObj } from "@storybook/react";
import { Margin, Spacer, MarginBox } from "./Margin";
import { Card } from "../Card/Card";
import { FlexBox } from "../FlexBox/FlexBox";

const meta = {
  title: "Layout/Margin",
  component: Margin,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    top: {
      control: "select",
      options: [
        "none",
        "xs",
        "sm",
        "md",
        "lg",
        "xl",
        "2xl",
        "3xl",
        "4xl",
        "5xl",
        "6xl",
      ],
      description: "상단 마진",
    },
    right: {
      control: "select",
      options: [
        "none",
        "xs",
        "sm",
        "md",
        "lg",
        "xl",
        "2xl",
        "3xl",
        "4xl",
        "5xl",
        "6xl",
      ],
      description: "우측 마진",
    },
    bottom: {
      control: "select",
      options: [
        "none",
        "xs",
        "sm",
        "md",
        "lg",
        "xl",
        "2xl",
        "3xl",
        "4xl",
        "5xl",
        "6xl",
      ],
      description: "하단 마진",
    },
    left: {
      control: "select",
      options: [
        "none",
        "xs",
        "sm",
        "md",
        "lg",
        "xl",
        "2xl",
        "3xl",
        "4xl",
        "5xl",
        "6xl",
      ],
      description: "좌측 마진",
    },
    horizontal: {
      control: "select",
      options: [
        "none",
        "xs",
        "sm",
        "md",
        "lg",
        "xl",
        "2xl",
        "3xl",
        "4xl",
        "5xl",
        "6xl",
        "auto",
      ],
      description: "가로 마진 (좌우)",
    },
    vertical: {
      control: "select",
      options: [
        "none",
        "xs",
        "sm",
        "md",
        "lg",
        "xl",
        "2xl",
        "3xl",
        "4xl",
        "5xl",
        "6xl",
      ],
      description: "세로 마진 (상하)",
    },
    all: {
      control: "select",
      options: [
        "none",
        "xs",
        "sm",
        "md",
        "lg",
        "xl",
        "2xl",
        "3xl",
        "4xl",
        "5xl",
        "6xl",
        "auto",
      ],
      description: "전체 마진",
    },
    inline: {
      control: "boolean",
      description: "인라인 블록으로 렌더링",
    },
    as: {
      control: "select",
      options: ["div", "span", "section", "article", "main", "aside"],
      description: "렌더링할 HTML 요소",
    },
  },
} satisfies Meta<typeof Margin>;

export default meta;
type Story = StoryObj<typeof meta>;

// Helper component to show margin visually
const MarginVisualizer = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      background:
        "linear-gradient(45deg, #f0f0f0 25%, transparent 25%, transparent 75%, #f0f0f0 75%, #f0f0f0), linear-gradient(45deg, #f0f0f0 25%, transparent 25%, transparent 75%, #f0f0f0 75%, #f0f0f0)",
      backgroundSize: "20px 20px",
      backgroundPosition: "0 0, 10px 10px",
      padding: "20px",
    }}
  >
    {children}
  </div>
);

// ===== Basic Examples =====
export const Default: Story = {
  args: {
    bottom: "lg",
    children: (
      <Card padding="lg">
        <h3>카드 with Margin</h3>
        <p>이 카드는 하단에 lg 마진이 적용되어 있습니다.</p>
      </Card>
    ),
  },
  render: (args) => (
    <MarginVisualizer>
      <Margin {...args} />
      <Card padding="lg">
        <p>다음 카드</p>
      </Card>
    </MarginVisualizer>
  ),
};

export const HorizontalVertical: Story = {
  args: {
    horizontal: "xl",
    vertical: "md",
    children: (
      <Card padding="lg">
        <p>가로: xl, 세로: md 마진</p>
      </Card>
    ),
  },
  render: (args) => (
    <MarginVisualizer>
      <Margin {...args} />
    </MarginVisualizer>
  ),
};

// ===== Spacer Examples =====
export const SpacerUsage: Story = {
  render: () => (
    <div>
      <h3>Spacer 컴포넌트</h3>
      <p>요소 간 간격을 만들기 위한 빈 요소</p>

      <MarginVisualizer>
        <Card padding="lg">첫 번째 카드</Card>
        <Spacer my="xl" />
        <Card padding="lg">두 번째 카드</Card>
        <Spacer my="md" />
        <Card padding="lg">세 번째 카드</Card>
      </MarginVisualizer>
    </div>
  ),
};

// ===== MarginBox Presets =====
export const PresetComponents: Story = {
  render: () => (
    <div>
      <h3>MarginBox 프리셋 컴포넌트</h3>

      <MarginVisualizer>
        <MarginBox.Section>
          <Card padding="lg">
            <h4>MarginBox.Section</h4>
            <p>섹션 간격 (vertical: 3xl)</p>
          </Card>
        </MarginBox.Section>

        <MarginBox.Card>
          <Card padding="lg">
            <h4>MarginBox.Card</h4>
            <p>카드 간격 (bottom: lg)</p>
          </Card>
        </MarginBox.Card>

        <MarginBox.ListItem>
          <div style={{ padding: "8px", background: "#f3f4f6" }}>
            리스트 아이템 1 (bottom: md)
          </div>
        </MarginBox.ListItem>

        <MarginBox.ListItem>
          <div style={{ padding: "8px", background: "#f3f4f6" }}>
            리스트 아이템 2 (bottom: md)
          </div>
        </MarginBox.ListItem>
      </MarginVisualizer>
    </div>
  ),
};

// ===== Real-world Examples =====
export const CardList: Story = {
  render: () => (
    <div>
      <h3>카드 리스트</h3>

      {[1, 2, 3].map((i) => (
        <Margin key={i} bottom={i === 3 ? "none" : "lg"}>
          <Card padding="xl">
            <h4>카드 제목 {i}</h4>
            <p>
              카드 내용이 여기에 표시됩니다. 각 카드는 마지막을 제외하고 하단에
              lg 마진이 있습니다.
            </p>
          </Card>
        </Margin>
      ))}
    </div>
  ),
};

export const ArticleLayout: Story = {
  render: () => (
    <article style={{ maxWidth: "600px" }}>
      <MarginBox.Section>
        <h1 style={{ margin: 0 }}>기사 제목</h1>
      </MarginBox.Section>

      <MarginBox.Paragraph>
        <p style={{ margin: 0, color: "#6b7280" }}>
          작성자: 홍길동 | 2024.01.15
        </p>
      </MarginBox.Paragraph>

      <MarginBox.Section>
        <img
          src="https://via.placeholder.com/600x300"
          alt="기사 이미지"
          style={{ width: "100%", borderRadius: "8px" }}
        />
      </MarginBox.Section>

      <MarginBox.Paragraph>
        <p style={{ margin: 0, lineHeight: 1.6 }}>
          첫 번째 단락입니다. Lorem ipsum dolor sit amet, consectetur adipiscing
          elit. Sed do eiusmod tempor incididunt ut labore et dolore magna
          aliqua.
        </p>
      </MarginBox.Paragraph>

      <MarginBox.Paragraph>
        <p style={{ margin: 0, lineHeight: 1.6 }}>
          두 번째 단락입니다. Ut enim ad minim veniam, quis nostrud exercitation
          ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </p>
      </MarginBox.Paragraph>

      <MarginBox.Section>
        <h2 style={{ margin: "0 0 16px 0" }}>소제목</h2>
        <p style={{ margin: 0, lineHeight: 1.6 }}>
          세 번째 단락입니다. Duis aute irure dolor in reprehenderit in
          voluptate velit esse cillum dolore eu fugiat nulla pariatur.
        </p>
      </MarginBox.Section>
    </article>
  ),
};

export const InlineMargin: Story = {
  args: {
    inline: true,
    all: "sm",
    children: (
      <span
        style={{
          padding: "4px 8px",
          background: "#e5dbff",
          color: "#7949FF",
          borderRadius: "4px",
        }}
      >
        인라인 마진
      </span>
    ),
  },
  render: (args) => (
    <div>
      <p>
        텍스트 중간에
        <Margin {...args} />
        요소가 있습니다.
        <Margin {...args} />
        여러 개를 나란히 배치할 수 있습니다.
      </p>
    </div>
  ),
};

// ===== Size Scale =====
export const SizeScale: Story = {
  render: () => (
    <div>
      <h3>마진 크기 스케일</h3>

      {[
        "none",
        "xs",
        "sm",
        "md",
        "lg",
        "xl",
        "2xl",
        "3xl",
        "4xl",
        "5xl",
        "6xl",
      ].map((size) => (
        <div key={size} style={{ background: "#f9fafb", marginBottom: "8px" }}>
          <Margin bottom={size as any}>
            <div
              style={{
                padding: "12px",
                background: "#7949FF",
                color: "white",
                borderRadius: "4px",
              }}
            >
              {size}:{" "}
              {size === "none"
                ? "0"
                : size === "xs"
                ? "4px"
                : size === "sm"
                ? "8px"
                : size === "md"
                ? "12px"
                : size === "lg"
                ? "16px"
                : size === "xl"
                ? "24px"
                : size === "2xl"
                ? "32px"
                : size === "3xl"
                ? "48px"
                : size === "4xl"
                ? "64px"
                : size === "5xl"
                ? "80px"
                : "96px"}
            </div>
          </Margin>
        </div>
      ))}
    </div>
  ),
};
