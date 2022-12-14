import React from "react";
import { css } from "styled-components/macro";

export function AppLayout({
  top,
  left,
  center,
  bottom,
  right,
}: {
  top: React.ReactNode;
  left: React.ReactNode;
  center: React.ReactNode;
  bottom: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div
      css={css`
        display: grid;
        width: 100vw;
        height: 100vh;
        grid-template-areas:
          "top top top"
          "left center right"
          "left bottom right";
        grid-template-columns: 340px 1fr 400px;
        grid-template-rows: 20px 1fr 1fr;
      `}
    >
      <div
        css={css`
          grid-area: top;
          background-color: var(--background-color-secondary);
        `}
      >
        {top}
      </div>
      <div
        css={css`
          grid-area: left;
          background-color: var(--background-color-secondary);
        `}
      >
        {left}
      </div>
      <div
        css={css`
          grid-area: center;
          background-color: var(--background-color);
          border-top: 1px solid var(--border-color-secondary);
        `}
      >
        {center}
      </div>
      <div
        css={css`
          grid-area: bottom;
          background-color: var(--background-color);
          border-top: 1px solid var(--border-color-secondary);
        `}
      >
        {bottom}
      </div>
      <div
        css={css`
          grid-area: right;
          background-color: var(--background-color-secondary);
        `}
      >
        {right}
      </div>
    </div>
  );
}
