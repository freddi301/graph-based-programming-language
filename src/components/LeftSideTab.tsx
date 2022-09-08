import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import { css } from "styled-components/macro";

export type LeftSideTab = keyof typeof allTabs;

function ensure<V extends Record<string, { icon: React.ReactNode; label: React.ReactNode }>>(value: V) {
  return value;
}

const allTabs = ensure({
  "version-control": {
    icon: <FontAwesomeIcon icon="code-branch" />,
    label: "Version Control",
  },
  history: {
    icon: <FontAwesomeIcon icon="clock-rotate-left" />,
    label: "History",
  },
});

function RenderLeftSideTab({ tab, onSelect, isSelected }: { tab: LeftSideTab; onSelect(tab: LeftSideTab): void; isSelected: boolean }) {
  const [isTooltipOpen, setIsTooltipOpen] = React.useState(false);
  return (
    <div
      css={css`
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: ${isSelected ? "var(--background-color-secondary)" : "var(--background-color)"};
        :hover {
          background-color: var(--hover-background-color);
        }
        color: ${isSelected ? "var(--text-color)" : "var(--text-color-secondary)"};
        border-right: ${isSelected ? "1px solid var(--background-color-secondary)" : ""};
        position: relative;
      `}
      onClick={() => {
        onSelect(tab);
      }}
      onMouseEnter={() => {
        setIsTooltipOpen(true);
      }}
      onMouseLeave={() => {
        setIsTooltipOpen(false);
      }}
    >
      {allTabs[tab].icon}
      {isTooltipOpen && (
        <div
          css={css`
            position: absolute;
            top: 0%;
            left: 100%;
            background-color: var(--hover-background-color);
            z-index: 1;
            width: max-content;
            color: var(--text-color);
            height: 100%;
            display: flex;
            align-items: center;
            padding-right: 1ch;
          `}
        >
          {allTabs[tab].label}
        </div>
      )}
    </div>
  );
}

export const RenderLeftSideTabMemo = React.memo(RenderLeftSideTab);
