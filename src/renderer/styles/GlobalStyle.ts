import { createGlobalStyle } from 'styled-components';
import { normalize } from 'styled-normalize';
export const GlobalStyle = createGlobalStyle`
  ${normalize}

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background-color: #ffffff;
    color: #000000;
    user-select:none;
    -webkit-user-select:none;
    -webkit-app-region:no-drag;
    cursor:default;
  }
    /* 定义一个工具类，用于允许选择文本 */
  .selectable {
    user-select: text;
    -webkit-user-select: text;
    cursor: text;
  }

  * {
    box-sizing: border-box;
  }
`;
