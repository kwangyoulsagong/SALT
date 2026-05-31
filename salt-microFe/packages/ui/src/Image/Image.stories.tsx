import type { Meta, StoryObj } from "@storybook/react";
import { Image } from "./Image";
import { vars } from "../styles/tokens.css";

const meta: Meta<typeof Image> = {
  title: "Components/Image",
  component: Image,
  argTypes: {
    width: { control: "text", description: "width (px, %, rem 등)" },
    height: { control: "text", description: "height (px, %, rem 등)" },
    radius: { control: "text", description: "borderRadius (px, %, token)" },
    border: { control: "text", description: "CSS border 값" },
    objectFit: {
      control: "select",
      options: ["contain", "cover", "fill", "none", "scale-down"],
    },
    objectPosition: { control: "text" },
    backgroundColor: { control: "color" },
    fallback: { control: "text" },
    hoverScale: { control: "boolean" },
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof Image>;

export const Default: Story = {
  args: {
    src: "https://via.placeholder.com/150",
    width: 80,
    height: 80,
  },
};

export const Circle: Story = {
  args: {
    src: "https://via.placeholder.com/200x200",
    width: 60,
    height: 60,
    radius: "50%",
    objectFit: "cover",
  },
};

export const LogoContain: Story = {
  args: {
    src: "https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg",
    width: 120,
    height: 80,
    objectFit: "contain",
    backgroundColor: vars.colors.background.tertiary,
  },
};

export const Fallback: Story = {
  args: {
    src: "/invalid-image.png",
    fallback: "https://via.placeholder.com/80x80?text=No",
    width: 80,
    height: 80,
    radius: "8px",
  },
};

export const HoverScale: Story = {
  args: {
    src: "https://via.placeholder.com/150",
    width: 100,
    height: 100,
    hoverScale: true,
    radius: "12px",
  },
};
