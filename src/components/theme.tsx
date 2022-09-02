import { createGlobalStyle, css } from "styled-components/macro";

const darkTheme = css`
  :root {
    --background-color: #282c34;
    --action-hover-background-color: gray;
    --text-color: #abb2bf;
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
  }
`;
