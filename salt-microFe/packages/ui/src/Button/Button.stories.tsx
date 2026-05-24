import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button.tsx";

const meta = {
  title: "Components/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: [
        "primary",
        "secondary",
        "ghost",
        "outline",
        "warning",
        "danger",
        "success",
      ],
      description: "버튼 스타일 변형",
    },
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg"],
      description: "버튼 크기",
    },
    fullWidth: {
      control: "boolean",
      description: "전체 너비 사용 여부",
    },
    disabled: {
      control: "boolean",
      description: "비활성화 상태",
    },
    children: {
      control: "text",
      description: "버튼 내용",
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// ===== Variants =====
export const Primary: Story = {
  args: {
    children: "Primary Button",
    variant: "primary",
  },
};

export const Secondary: Story = {
  args: {
    children: "Secondary Button",
    variant: "secondary",
  },
};

export const Ghost: Story = {
  args: {
    children: "Ghost Button",
    variant: "ghost",
  },
};

export const Outline: Story = {
  args: {
    children: "Outline Button",
    variant: "outline",
  },
};

export const Warning: Story = {
  args: {
    children: "Warning",
    variant: "warning",
  },
};

export const Danger: Story = {
  args: {
    children: "Delete",
    variant: "danger",
  },
};

export const Success: Story = {
  args: {
    children: "Success",
    variant: "success",
  },
};

// ===== Sizes =====
export const ExtraSmall: Story = {
  args: {
    children: "Extra Small",
    size: "xs",
  },
};

export const Small: Story = {
  args: {
    children: "Small Button",
    size: "sm",
  },
};

export const Medium: Story = {
  args: {
    children: "Medium Button",
    size: "md",
  },
};

export const Large: Story = {
  args: {
    children: "Large Button",
    size: "lg",
  },
};

// ===== States =====
export const Disabled: Story = {
  args: {
    children: "Disabled Button",
    disabled: true,
  },
};

export const DisabledVariants: Story = {
  args: {
    children: "Button",
  },
  render: () => (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      <Button variant="primary" disabled>
        Primary
      </Button>
      <Button variant="secondary" disabled>
        Secondary
      </Button>
      <Button variant="ghost" disabled>
        Ghost
      </Button>
      <Button variant="outline" disabled>
        Outline
      </Button>
      <Button variant="danger" disabled>
        Danger
      </Button>
    </div>
  ),
};

export const FullWidth: Story = {
  args: {
    children: "Full Width Button",
    fullWidth: true,
  },
  parameters: {
    layout: "padded",
  },
};

export const WithClickEvent: Story = {
  args: {
    children: "Click Me",
    onClick: () => alert("Button clicked!"),
  },
};

// ===== Showcases =====
export const AllVariants: Story = {
  args: {
    children: "Button",
  },
  render: () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        width: "300px",
      }}
    >
      <Button variant="primary">Primary - 주요 액션</Button>
      <Button variant="secondary">Secondary - 보조 액션</Button>
      <Button variant="ghost">Ghost - 중립 액션</Button>
      <Button variant="outline">Outline - 테두리 버튼</Button>
      <Button variant="warning">Warning - 경고</Button>
      <Button variant="danger">Danger - 삭제/위험</Button>
      <Button variant="success">Success - 성공/완료</Button>
    </div>
  ),
};

export const AllSizes: Story = {
  args: {
    children: "Button",
  },
  render: () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        alignItems: "flex-start",
      }}
    >
      <Button size="xs">Extra Small (30px)</Button>
      <Button size="sm">Small (40px)</Button>
      <Button size="md">Medium (48px)</Button>
      <Button size="lg">Large (60px)</Button>
    </div>
  ),
};

export const SizeComparison: Story = {
  args: {
    children: "Button",
  },
  render: () => (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      <Button size="xs">XS</Button>
      <Button size="sm">SM</Button>
      <Button size="md">MD</Button>
      <Button size="lg">LG</Button>
    </div>
  ),
};
