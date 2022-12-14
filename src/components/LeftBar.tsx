import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { css } from "styled-components/macro";

export function LeftBar({
  tabs,
}: {
  tabs: Array<{
    label: React.ReactNode;
    icon: React.ReactNode;
    sections: Array<{
      title: React.ReactNode;
      content: React.ReactNode;
    }>;
  }>;
}) {
  const [selectedTabIndex, setSelectedTabIndex] = React.useState(0);
  return (
    <div
      css={css`
        display: flex;
        width: 100%;
        height: 100%;
      `}
    >
      <div
        css={css`
          height: 100%;
          background-color: var(--background-color);
        `}
      >
        {tabs.map(({ label, icon }, tabIndex) => {
          return (
            <Tab
              key={tabIndex}
              label={label}
              icon={icon}
              isSelected={tabIndex === selectedTabIndex}
              onSelect={() => setSelectedTabIndex(tabIndex)}
            />
          );
        })}
      </div>
      <div
        css={css`
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
        `}
      >
        {tabs[selectedTabIndex]?.sections.map(({ title, content }, sectionIndex) => {
          return (
            <CollapsibleSection key={sectionIndex} title={title}>
              {content}
            </CollapsibleSection>
          );
        })}
      </div>
    </div>
  );
}

function Tab({
  label,
  icon,
  onSelect,
  isSelected,
}: {
  label: React.ReactNode;
  icon: React.ReactNode;
  onSelect(): void;
  isSelected: boolean;
}) {
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
          border-top: 1px solid var(--border-color);
          border-top: 1px solid var(--border-color);
          border-bottom: 1px solid var(--border-color);
        }
        color: ${isSelected ? "var(--text-color)" : "var(--text-color-secondary)"};
        border-right: ${isSelected ? "1px solid var(--background-color-secondary)" : ""};
        position: relative;
        box-sizing: border-box;
      `}
      onClick={() => {
        onSelect();
      }}
      onMouseEnter={() => {
        setIsTooltipOpen(true);
      }}
      onMouseLeave={() => {
        setIsTooltipOpen(false);
      }}
    >
      {icon}
      {isTooltipOpen && (
        <div
          css={css`
            position: absolute;
            top: -1px;
            left: 100%;
            background-color: var(--hover-background-color);
            z-index: 1;
            width: max-content;
            color: var(--text-color);
            height: 100%;
            display: flex;
            align-items: center;
            padding-right: 1ch;
            border-top: 1px solid var(--border-color);
            border-right: 1px solid var(--border-color);
            border-bottom: 1px solid var(--border-color);
          `}
        >
          {label}
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(true);
  return (
    <div
      css={css`
        flex-grow: ${isOpen ? 1 : 0};
        display: flex;
        flex-direction: column;
      `}
    >
      <div
        css={css`
          display: flex;
          background-color: var(--background-color);
          user-select: none;
          cursor: pointer;
        `}
        onClick={() => {
          setIsOpen(!isOpen);
        }}
      >
        <div
          css={css`
            display: flex;
            align-items: center;
            justify-content: center;
            width: 2ch;
          `}
        >
          <FontAwesomeIcon icon={isOpen ? "angle-down" : "angle-up"} />
        </div>
        <div
          css={css`
            flex-grow: 1;
          `}
        >
          {title}
        </div>
      </div>
      <div
        hidden={!isOpen}
        css={css`
          flex-grow: 1;
          background-color: var(--background-color-secondary);
          position: relative;
        `}
      >
        <div
          css={css`
            position: absolute;
            width: 100%;
            height: 100%;
            overflow: auto;
            box-sizing: border-box;
          `}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
