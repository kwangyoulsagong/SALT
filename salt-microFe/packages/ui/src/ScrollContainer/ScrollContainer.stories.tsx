import type { Meta, StoryObj } from "@storybook/react";
import { ScrollContainer } from "./ScrollContainer";

const meta = {
  title: "Layout/ScrollContainer",
  component: ScrollContainer,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    direction: {
      control: "select",
      options: ["vertical", "horizontal", "both", "none"],
      description: "스크롤 방향",
    },
    scrollbar: {
      control: "select",
      options: ["default", "thin", "hidden"],
      description: "스크롤바 스타일",
    },
    maxHeight: {
      control: "select",
      options: ["xs", "sm", "md", "lg", "xl", "2xl", "full"],
      description: "최대 높이",
    },
    maxWidth: {
      control: "select",
      options: ["xs", "sm", "md", "lg", "xl", "2xl", "full"],
      description: "최대 너비",
    },
    showShadow: {
      control: "boolean",
      description: "스크롤 시 그림자 표시",
    },
    fullHeight: {
      control: "boolean",
      description: "전체 높이",
    },
    fullWidth: {
      control: "boolean",
      description: "전체 너비",
    },
  },
} satisfies Meta<typeof ScrollContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

const LongContent = () => (
  <div>
    {Array.from({ length: 20 }, (_, i) => (
      <p key={i} style={{ margin: "0 0 1rem 0" }}>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Paragraph{" "}
        {i + 1}
      </p>
    ))}
  </div>
);

const WideContent = () => (
  <div style={{ display: "flex", gap: "1rem" }}>
    {Array.from({ length: 20 }, (_, i) => (
      <div
        key={i}
        style={{
          minWidth: "150px",
          padding: "1rem",
          background: "#7949FF",
          color: "white",
          borderRadius: "8px",
        }}
      >
        Item {i + 1}
      </div>
    ))}
  </div>
);

// ===== Basic Examples =====
export const VerticalScroll: Story = {
  args: {
    direction: "vertical",
    maxHeight: "md",
    children: <LongContent />,
  },
};

export const HorizontalScroll: Story = {
  args: {
    direction: "horizontal",
    maxWidth: "lg",
    children: <WideContent />,
  },
};

export const BothDirections: Story = {
  args: {
    direction: "both",
    maxHeight: "md",
    maxWidth: "lg",
    children: (
      <div>
        <WideContent />
        <LongContent />
      </div>
    ),
  },
};

// ===== Scrollbar Styles =====
export const DefaultScrollbar: Story = {
  args: {
    scrollbar: "default",
    maxHeight: "md",
    children: <LongContent />,
  },
};

export const ThinScrollbar: Story = {
  args: {
    scrollbar: "thin",
    maxHeight: "md",
    children: <LongContent />,
  },
};

export const HiddenScrollbar: Story = {
  args: {
    scrollbar: "hidden",
    maxHeight: "md",
    children: <LongContent />,
  },
};

// ===== Max Height Variants =====
export const SmallHeight: Story = {
  args: {
    maxHeight: "sm",
    children: <LongContent />,
  },
};

export const LargeHeight: Story = {
  args: {
    maxHeight: "lg",
    children: <LongContent />,
  },
};

// ===== With Shadow =====
export const WithShadow: Story = {
  args: {
    maxHeight: "md",
    showShadow: true,
    children: <LongContent />,
  },
};

export const HorizontalImageGallery: Story = {
  args: {
    children: "ScrollContainer",
  },
  render: () => (
    <div style={{ width: "600px" }}>
      <h3 style={{ marginBottom: "1rem" }}>이미지 갤러리</h3>
      <ScrollContainer direction="horizontal" scrollbar="hidden">
        <div style={{ display: "flex", gap: "1rem" }}>
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              style={{
                minWidth: "200px",
                height: "150px",
                background: `linear-gradient(135deg, ${
                  i % 2 === 0 ? "#667eea" : "#F59D71"
                } 0%, ${i % 2 === 0 ? "#764ba2" : "#FF6B6B"} 100%)`,
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "24px",
                fontWeight: "bold",
              }}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </ScrollContainer>
    </div>
  ),
};

export const SidebarMenu: Story = {
  args: {
    children: "ScrollContainer",
  },
  render: () => (
    <div
      style={{
        width: "250px",
        height: "500px",
        background: "#f5f5f5",
        borderRadius: "8px",
      }}
    >
      <div style={{ padding: "1rem", borderBottom: "1px solid #e0e0e0" }}>
        <h3 style={{ margin: 0 }}>메뉴</h3>
      </div>
      <ScrollContainer maxHeight="full" fullHeight>
        {Array.from({ length: 30 }, (_, i) => (
          <div
            key={i}
            style={{
              padding: "0.75rem 1rem",
              borderBottom: "1px solid #e0e0e0",
              cursor: "pointer",
              background: i === 0 ? "#7949FF" : "transparent",
              color: i === 0 ? "white" : "#333",
            }}
          >
            메뉴 항목 {i + 1}
          </div>
        ))}
      </ScrollContainer>
    </div>
  ),
};
