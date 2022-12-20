import { createGlobalStyle, css } from "styled-components/macro";

const darkTheme = css`
  :root {
    --background-color: #23272e;
    --background-color-secondary: #1e2227;
    --hover-background-color: #2c313a;
    --text-color: #abb2bf;
    --text-color-secondary: #7f848e;
    --border-color: #0f1113;
    --border-color-secondary: #3e4452;
    --selection-background-color: #3f4859;
    --text-color-binding: #e06c75;
    --text-color-lambda: #61afef;
    --text-color-pi: #56b6c2;
    --text-color-type: #e5c07b;
    --text-color-literal: #98c379;
    --text-color-constructor: #d19a66;
    --text-color-comment: #7f848e;
    --text-color-keyword: #c678dd;
    --indent-guide-color: #3b4048;
    --code-line-height: 1.2em;
  }
`;

export const GlobalStyle = createGlobalStyle`
  ${darkTheme}
  @import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono&display=swap");
  body {
    margin: 0px;
    background-color: var(--background-color);
    color: var(--text-color);
    font-family: "JetBrains Mono", monospace;
    overflow: hidden;
    font-size: 14px;
  }
  ::-webkit-scrollbar {
    background: transparent;
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-corner {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 4px;
  }
  *:hover {
    ::-webkit-scrollbar-thumb {
      background: rgba(255,255,255, 0.05);
    }
  }
`;
