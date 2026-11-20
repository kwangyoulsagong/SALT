import {
  BookOpen,
  Bus,
  Coffee,
  Gift,
  HeartPulse,
  Home,
  Receipt,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Tag,
  Ticket,
  Utensils,
  type LucideIcon,
} from "lucide-react";

/** 기본 분류 12개 그림 — 선 아이콘(2026-11-20 — 글자 한 자 판이 밋밋했다). 내 분류(`u_…`)는 꼬리표 하나. 장식이라 읽지 않는다 */
const CATEGORY_ICON: Readonly<Record<string, LucideIcon>> = {
  food: Utensils,
  cafe: Coffee,
  transport: Bus,
  housing: Home,
  telecom: Smartphone,
  living: ShoppingBasket,
  health: HeartPulse,
  education: BookOpen,
  shopping: ShoppingBag,
  culture: Ticket,
  gift: Gift,
  other: Receipt,
};

export const CategoryIcon = ({ category, size = 16 }: { category: string; size?: number }) => {
  const Icon = Object.prototype.hasOwnProperty.call(CATEGORY_ICON, category) ? CATEGORY_ICON[category] : Tag;
  return <Icon size={size} strokeWidth={2} aria-hidden="true" />;
};
