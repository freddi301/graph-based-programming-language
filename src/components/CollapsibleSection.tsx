import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import { css } from "styled-components/macro";

export function CollapsibleSection({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
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
