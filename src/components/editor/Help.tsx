import { css } from "styled-components/macro";

export function Help() {
  return (
    <table
      css={css`
        border-collapse: collapse;
        margin-top: 1ch;
        margin-bottom: 1ch;
        td {
          padding: 1ch;
        }
        tr td:first-child {
          text-align: right;
        }
      `}
    >
      <tr>
        <td>
          <Key>←</Key> / <Key>↑</Key> / <Key>→</Key> / <Key>↓</Key>
        </td>
        <td>to navigate</td>
      </tr>
      <tr>
        <td>
          <Key>Esc</Key>
        </td>
        <td>to escape any action</td>
      </tr>
      <tr>
        <td>
          <Key>Enter</Key>
        </td>
        <td>to select options or confirm rename or creation</td>
      </tr>
      <tr>
        <td>
          <Key>Ctrl</Key> + <Key>Click</Key>
        </td>
        <td>to go to definition</td>
      </tr>
      <tr>
        <td>
          <Key>Tab</Key>
        </td>
        <td>next option</td>
      </tr>
      <tr>
        <td>
          <Key>Shift</Key> + <Key>Tab</Key>
        </td>
        <td>previous option</td>
      </tr>
      <tr>
        <td>
          <Key>:</Key>
        </td>
        <td>to set annotation</td>
      </tr>
      <tr>
        <td>
          <Key>(</Key>
        </td>
        <td>to declare or set parameters</td>
      </tr>
      <tr>
        <td>
          <Key>Ctrl</Key> + <Key>(</Key>
        </td>
        <td>to create new variables in place</td>
      </tr>
      <tr>
        <td>
          <Key>=</Key>
        </td>
        <td>to assign</td>
      </tr>
      <tr>
        <td>
          <Key>)</Key>
        </td>
        <td>to close current parentheses</td>
      </tr>
      <tr>
        <td>
          <Key>Ctrl</Key> + <Key>z</Key>
        </td>
        <td>to undo</td>
      </tr>
      <tr>
        <td>
          <Key>Ctrl</Key> + <Key>Shift</Key> + <Key>z</Key>
        </td>
        <td>to redo</td>
      </tr>
      <tr>
        <td>
          <Key>Drag & Drop</Key>
        </td>
        <td>line numbers to reorder</td>
      </tr>
      <tr>
        <td>
          <Key>Click</Key>
        </td>
        <td>on line numbers to toggle ordering</td>
      </tr>
    </table>
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
