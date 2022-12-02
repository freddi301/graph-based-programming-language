import { createGlobalStyle, css } from "styled-components/macro";

const darkTheme = css`
  :root {
    --background-color: #23272e;
    --background-color-secondary: #1e2227;
    --hover-background-color: #2c313a;
    --text-color: #abb2bf;
    --text-color-secondary: #7f848e;
    --text-color-blue: #61afef;
    --border-color: black;
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
