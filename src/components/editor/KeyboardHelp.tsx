import { css } from "styled-components/macro";

export function KeyboardHelp() {
  return (
    <div
      css={css`
        padding: 1ch;
        > div {
          margin-bottom: 1em;
        }
      `}
    >
      <div>
        <Key>←</Key> / <Key>↑</Key> / <Key>→</Key> / <Key>↓</Key> to navigate
      </div>
      <div>
        <Key>Esc</Key> to escape any action
      </div>
      <div>
        <Key>Enter</Key> to select options
      </div>
      <div>
        <Key>Ctrl</Key> + click to go to definition
      </div>
      <div>
        <Key>Tab</Key> next option
      </div>
      <div>
        <Key>Shift</Key> + <Key>Tab</Key> previous option
      </div>
      <div>
        <Key>:</Key> to set annotation
      </div>
      <div>
        <Key>(</Key> to declare or set parameters
      </div>
      <div>
        <Key>Ctrl</Key> + ( to create new variables in place
      </div>
      <div>
        <Key>=</Key> to asign
      </div>
      <div>
        <Key>)</Key> to close current parentheses
      </div>
      <div>
        <Key>Ctrl</Key> + <Key>z</Key> to undo
      </div>
      <div>
        <Key>Ctrl</Key> + <Key>Shift</Key> + <Key>z</Key> to redo
      </div>
    </div>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <span
      css={css`
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px var(--border-color);
        font-size: 0.85rem;
        padding: 0px 4px;
        white-space: nowrap;
        border-radius: 4px;
      `}
    >
      {children}
    </span>
  );
}
