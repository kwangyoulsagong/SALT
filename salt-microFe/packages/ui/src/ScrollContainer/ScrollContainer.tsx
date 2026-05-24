import {
  ReactNode,
  ElementType,
  ComponentPropsWithoutRef,
  CSSProperties,
  useRef,
  useState,
  useEffect,
  useCallback,
  memo,
} from "react";
import {
  scrollContainerStyles,
  scrollbarStyles,
} from "./styles/scrollContainer.css.ts";
import useThrottle from "../Utils/hooks/useThrottle.tsx";
import { DEBOUNCE_DELAY, THROTTLE_DELAY } from "../Utils/constants.ts";
import useDebounce from "../Utils/hooks/useDebounce.tsx";
export type ScrollDirection = "vertical" | "horizontal" | "both" | "none";
export type ScrollbarStyle = "default" | "thin" | "hidden";
export type ScrollSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "full";

type ScrollContainerPolymorphicProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  direction?: ScrollDirection;
  scrollbar?: ScrollbarStyle;
  maxHeight?: ScrollSize;
  maxWidth?: ScrollSize;
  fullHeight?: boolean;
  fullWidth?: boolean;
  showShadow?: boolean;
  onScrollStart?: () => void;
  onScrollEnd?: () => void;
  className?: string;
  style?: CSSProperties;
} & Omit<
  ComponentPropsWithoutRef<T>,
  "children" | "as" | "className" | "style"
>;

export type ScrollContainerProps<T extends ElementType = "div"> =
  ScrollContainerPolymorphicProps<T>;

const ScrollContainerComponent = <T extends ElementType = "div">({
  children,
  direction = "both",
  scrollbar = "default",
  maxHeight,
  maxWidth,
  fullHeight = false,
  fullWidth = false,
  showShadow = false,
  onScrollStart,
  onScrollEnd,
  as,
  className,
  style,
  ...rest
}: ScrollContainerProps<T>) => {
  const Component = as || "div";
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [showTopShadow, setShowTopShadow] = useState(false);
  const [showBottomShadow, setShowBottomShadow] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // 그림자 업데이트 - 쓰로틀링 (16ms ≈ 60fps)
  const updateShadows = useCallback(() => {
    const container = containerRef.current;
    if (!container || !showShadow) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    setShowTopShadow(scrollTop > 0);
    setShowBottomShadow(scrollTop + clientHeight < scrollHeight - 1);
  }, [showShadow]);

  const throttledUpdateShadows = useThrottle(updateShadows, THROTTLE_DELAY);

  // 스크롤 종료 감지 - 디바운스
  const handleScrollEnd = useDebounce(() => {
    setIsScrolling(false);
    onScrollEnd?.();
  }, DEBOUNCE_DELAY);

  // 스크롤 이벤트 핸들러
  const handleScroll = useCallback(() => {
    if (!isScrolling) {
      setIsScrolling(true);
      onScrollStart?.();
    }

    throttledUpdateShadows();
    handleScrollEnd();
  }, [isScrolling, onScrollStart, throttledUpdateShadows, handleScrollEnd]);

  // IntersectionObserver - 뷰포트 내에 있을 때만 스크롤 이벤트 처리
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        setIsVisible(entry.isIntersecting);

        if (entry.isIntersecting) {
          container.addEventListener("scroll", handleScroll, { passive: true });
          // 뷰포트에 들어올 때 그림자 상태 업데이트
          if (showShadow) {
            updateShadows();
          }
        } else {
          container.removeEventListener("scroll", handleScroll);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
      container.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll, showShadow, updateShadows]);

  // ResizeObserver - 컨테이너 크기 변경 감지
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !showShadow || !isVisible) return;

    const resizeObserver = new ResizeObserver(() => {
      updateShadows();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [showShadow, updateShadows, isVisible]);

  // 초기 그림자 상태 설정
  useEffect(() => {
    if (showShadow && isVisible) {
      updateShadows();
    }
  }, [showShadow, updateShadows, isVisible]);

  const containerStyle: CSSProperties = {
    ...style,
    position: "relative",
  };

  return (
    <Component
      ref={containerRef}
      className={`${scrollContainerStyles({
        direction,
        scrollbar,
        maxHeight,
        maxWidth,
        fullHeight,
        fullWidth,
      })} ${scrollbar !== "hidden" ? scrollbarStyles : ""} ${className || ""}`}
      style={containerStyle}
      {...rest}
    >
      {/* 상단 그림자 */}
      {showShadow && showTopShadow && (
        <div
          style={{
            position: "sticky",
            top: 0,
            height: "10px",
            marginBottom: "-10px",
            background:
              "linear-gradient(to top, transparent, rgba(0, 0, 0, 0.05))",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
      )}

      {children}

      {/* 하단 그림자 */}
      {showShadow && showBottomShadow && (
        <div
          style={{
            position: "sticky",
            bottom: 0,
            height: "10px",
            marginTop: "-10px",
            background:
              "linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.05))",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
      )}
    </Component>
  );
};

// memo로 감싸서 불필요한 리렌더링 방지
export const ScrollContainer = memo(
  ScrollContainerComponent
) as typeof ScrollContainerComponent;
