import { ReactNode, ElementType } from "react";
import { marginStyles } from "./styles/margin.css.ts";

type SpaceSize =
  | "none"
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl"
  | "5xl"
  | "6xl";
type HorizontalSize = SpaceSize | "auto";

export interface MarginProps {
  /** 하위 요소 */
  children?: ReactNode;
  /** 상단 마진 */
  top?: SpaceSize;
  /** 우측 마진 */
  right?: SpaceSize;
  /** 하단 마진 */
  bottom?: SpaceSize;
  /** 좌측 마진 */
  left?: SpaceSize;
  /** 가로 마진 (좌우) */
  horizontal?: HorizontalSize;
  /** 세로 마진 (상하) */
  vertical?: SpaceSize;
  /** 전체 마진 (모든 방향) */
  all?: SpaceSize | "auto";
  /** 단축 속성 - all과 동일 */
  m?: SpaceSize | "auto";
  /** 단축 속성 - top */
  mt?: SpaceSize;
  /** 단축 속성 - right */
  mr?: SpaceSize;
  /** 단축 속성 - bottom */
  mb?: SpaceSize;
  /** 단축 속성 - left */
  ml?: SpaceSize;
  /** 단축 속성 - horizontal */
  mx?: HorizontalSize;
  /** 단축 속성 - vertical */
  my?: SpaceSize;
  /** 인라인 블록으로 렌더링 */
  inline?: boolean;
  /** 렌더링할 HTML 요소 */
  as?: ElementType;
  /** 추가 CSS 클래스 */
  className?: string;
  /** 추가 인라인 스타일 */
  style?: React.CSSProperties;
}

/**
 * Margin 컴포넌트
 *
 * 요소에 마진을 적용하기 위한 유틸리티 컴포넌트입니다.
 *
 * @example
 * ```tsx
 * // 기본 사용법
 * <Margin bottom="lg">
 *   <Card>Content</Card>
 * </Margin>
 *
 * // 단축 속성 사용
 * <Margin mb="lg" mx="auto">
 *   <Card>Centered with margin bottom</Card>
 * </Margin>
 *
 * // 복합 사용
 * <Margin vertical="xl" horizontal="md">
 *   <Section>Content with padding</Section>
 * </Margin>
 * ```
 */
export const Margin = ({
  children,
  top,
  right,
  bottom,
  left,
  horizontal,
  vertical,
  all,
  m,
  mt,
  mr,
  mb,
  ml,
  mx,
  my,
  inline = false,
  as: Component = "div",
  className,
  style,
}: MarginProps) => {
  // 단축 속성 우선 적용
  const finalTop = mt || top;
  const finalRight = mr || right;
  const finalBottom = mb || bottom;
  const finalLeft = ml || left;
  const finalHorizontal = mx || horizontal;
  const finalVertical = my || vertical;
  const finalAll = m || all;

  const classes = marginStyles({
    top: finalTop,
    right: finalRight,
    bottom: finalBottom,
    left: finalLeft,
    horizontal: finalHorizontal,
    vertical: finalVertical,
    all: finalAll,
    inline,
  });

  // children이 없는 경우 spacer로 동작
  if (!children) {
    return (
      <Component
        className={`${classes} ${className || ""}`}
        style={style}
        aria-hidden="true"
      />
    );
  }

  return (
    <Component className={`${classes} ${className || ""}`} style={style}>
      {children}
    </Component>
  );
};

/**
 * Spacer 컴포넌트
 *
 * 요소 간 간격을 만들기 위한 빈 요소입니다.
 * Margin 컴포넌트의 alias입니다.
 *
 * @example
 * ```tsx
 * <Card />
 * <Spacer my="lg" />
 * <Card />
 * ```
 */
export const Spacer = (props: MarginProps) => <Margin {...props} />;

/**
 * MarginBox 컴포넌트
 *
 * 자주 사용되는 마진 패턴을 위한 프리셋 컴포넌트입니다.
 */
export const MarginBox = {
  /**
   * 섹션 간격 (상하 3xl)
   */
  Section: ({ children, ...props }: Omit<MarginProps, "vertical">) => (
    <Margin vertical="3xl" {...props}>
      {children}
    </Margin>
  ),

  /**
   * 카드 간격 (하단 lg)
   */
  Card: ({ children, ...props }: Omit<MarginProps, "bottom">) => (
    <Margin bottom="lg" {...props}>
      {children}
    </Margin>
  ),

  /**
   * 리스트 아이템 간격 (하단 md)
   */
  ListItem: ({ children, ...props }: Omit<MarginProps, "bottom">) => (
    <Margin bottom="md" {...props}>
      {children}
    </Margin>
  ),

  /**
   * 헤딩 간격 (하단 sm)
   */
  Heading: ({ children, ...props }: Omit<MarginProps, "bottom">) => (
    <Margin bottom="sm" {...props}>
      {children}
    </Margin>
  ),

  /**
   * 단락 간격 (하단 md)
   */
  Paragraph: ({ children, ...props }: Omit<MarginProps, "bottom">) => (
    <Margin bottom="md" {...props}>
      {children}
    </Margin>
  ),

  /**
   * 중앙 정렬 (좌우 auto)
   */
  Center: ({ children, ...props }: Omit<MarginProps, "horizontal">) => (
    <Margin horizontal="auto" {...props}>
      {children}
    </Margin>
  ),

  /**
   * 컨테이너 간격 (좌우 lg)
   */
  Container: ({ children, ...props }: Omit<MarginProps, "horizontal">) => (
    <Margin horizontal="lg" {...props}>
      {children}
    </Margin>
  ),
};
