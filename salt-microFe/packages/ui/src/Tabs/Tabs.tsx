import { KeyboardEvent, ReactNode, useId, useState } from "react";
import { useSlidingIndicator } from "../Motion/useSlidingIndicator";
import { pillSliding, pillThumb, tabListStyles, tabsContainerStyles } from "./style/tabs.css";
import { Tab } from "./Tab/Tab";
import { TabPanel } from "./TabPanel/TabPanel";

export interface TabItem {
  id: string;
  label: ReactNode;
  content?: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultActiveTab?: string;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  tabPanel?: boolean;
  className?: string;
  /** 모양 — 섹션 탭(기본) · 상세 알약 탭 */
  variant?: "section" | "pill";
  /** 탭 목록 이름(스크린리더). 없으면 "Tabs" */
  label?: string;
  /**
   * 탭 · 패널 id 의 앞부분. 소비처가 패널을 직접 그릴 때 준다 — 그러면 탭은 `${idBase}-panel-${id}` 를 가리키고(`aria-controls`),
   * 소비처는 그 id 로 `role="tabpanel"` 을 그려 `${idBase}-tab-${id}` 로 이름 붙인다
   */
  idBase?: string;
}

export const Tabs = ({
  tabs,
  defaultActiveTab,
  activeTab: controlledActiveTab,
  onTabChange,
  tabPanel = false,
  className,
  variant = "section",
  label = "Tabs",
  idBase,
}: TabsProps) => {
  const [internalActiveTab, setInternalActiveTab] = useState(
    defaultActiveTab || tabs[0]?.id
  );

  const isControlled = controlledActiveTab !== undefined;
  const activeTab = isControlled ? controlledActiveTab : internalActiveTab;
  // 알약 탭은 선택 면이 새 탭으로 미끄러진다(`FE-REQ-049` · 세그먼트와 같은 훅 — FE-REQ-044 FR-34). 섹션 탭은 진하기만이라 없다
  const pill = variant === "pill";
  const thumb = useSlidingIndicator<HTMLDivElement>(controlledActiveTab ?? internalActiveTab, '[role="tab"][aria-selected="true"]');
  const generatedId = useId();
  const baseId = idBase ?? generatedId;

  const handleTabClick = (tabId: string) => {
    if (!isControlled) {
      setInternalActiveTab(tabId);
    }
    onTabChange?.(tabId);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // tabs 배열이 비어있거나 activeTab이 없는 경우 early return
    if (!tabs || tabs.length === 0 || !activeTab) {
      return;
    }

    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);

    // 현재 활성 탭을 찾을 수 없는 경우
    if (currentIndex === -1) {
      return;
    }

    let newIndex = currentIndex;

    switch (e.key) {
      case "ArrowLeft": {
        e.preventDefault();
        newIndex = currentIndex - 1;
        if (newIndex < 0) newIndex = tabs.length - 1;

        // 비활성화된 탭 건너뛰기
        let leftAttempts = 0;
        while (tabs[newIndex]?.disabled && leftAttempts < tabs.length) {
          newIndex = newIndex - 1;
          if (newIndex < 0) newIndex = tabs.length - 1;
          leftAttempts++;
        }
        break;
      }

      case "ArrowRight": {
        e.preventDefault();
        newIndex = currentIndex + 1;
        if (newIndex >= tabs.length) newIndex = 0;

        // 비활성화된 탭 건너뛰기
        let rightAttempts = 0;
        while (tabs[newIndex]?.disabled && rightAttempts < tabs.length) {
          newIndex = newIndex + 1;
          if (newIndex >= tabs.length) newIndex = 0;
          rightAttempts++;
        }
        break;
      }

      case "Home":
        e.preventDefault();
        newIndex = 0;

        // 첫 번째 활성화된 탭 찾기
        while (newIndex < tabs.length && tabs[newIndex]?.disabled) {
          newIndex++;
        }

        // 모든 탭이 비활성화된 경우 원래 인덱스 유지
        if (newIndex >= tabs.length) {
          newIndex = currentIndex;
        }
        break;

      case "End":
        e.preventDefault();
        newIndex = tabs.length - 1;

        // 마지막 활성화된 탭 찾기
        while (newIndex > 0 && tabs[newIndex]?.disabled) {
          newIndex--;
        }

        // 모든 탭이 비활성화된 경우 원래 인덱스 유지
        if (newIndex < 0 || tabs[newIndex]?.disabled) {
          newIndex = currentIndex;
        }
        break;

      default:
        return;
    }

    // 새로운 탭이 유효하고, 현재 탭과 다르며, 비활성화되지 않은 경우에만 변경
    const newTab = tabs[newIndex];
    if (newIndex !== currentIndex && newTab && !newTab.disabled && newTab.id) {
      handleTabClick(newTab.id);

      // Focus the new tab
      const newTabElement = document.getElementById(
        `${baseId}-tab-${newTab.id}`
      );
      newTabElement?.focus();
    }
  };

  // tabs가 비어있는 경우 처리
  if (!tabs || tabs.length === 0) {
    return null;
  }

  // activeTab이 유효하지 않은 경우 첫 번째 활성화된 탭으로 설정
  const isActiveTabValid = tabs.some((tab) => tab.id === activeTab);
  const validActiveTab = isActiveTabValid
    ? activeTab
    : tabs.find((tab) => !tab.disabled)?.id || tabs[0]?.id;

  return (
    <div className={className}>
      <div className={tabsContainerStyles}>
        <div
          ref={pill ? thumb.containerRef : undefined}
          role="tablist"
          aria-label={label}
          className={pill ? `${tabListStyles} ${pillSliding}` : tabListStyles}
          data-sliding={pill && thumb.sliding}
          onKeyDown={handleKeyDown}
        >
          {pill && thumb.sliding ? (
            <span aria-hidden="true" className={pillThumb({ animated: thumb.animated })} style={thumb.indicatorStyle} />
          ) : null}
          {tabs.map((tab) => (
            <Tab
              key={tab.id}
              id={`${baseId}-tab-${tab.id}`}
              // 패널을 이 컴포넌트가 그릴 때만 가리킨다 — 소비처가 패널을 직접 그리면 없는 id 를 가리킨다(axe critical)
              panelId={tabPanel || idBase ? `${baseId}-panel-${tab.id}` : undefined}
              isActive={validActiveTab === tab.id}
              disabled={tab.disabled}
              onClick={() => handleTabClick(tab.id)}
              variant={variant}
            >
              {tab.label}
            </Tab>
          ))}
        </div>
      </div>

      {tabPanel &&
        tabs.map((tab) => (
          <TabPanel
            key={tab.id}
            id={`${baseId}-panel-${tab.id}`}
            tabId={`${baseId}-tab-${tab.id}`}
            isActive={validActiveTab === tab.id}
          >
            {tab.content}
          </TabPanel>
        ))}
    </div>
  );
};
