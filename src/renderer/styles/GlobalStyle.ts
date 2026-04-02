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
    &::-webkit-scrollbar {
        width:6px;
    }
    &::-webkit-scrollbar-track { 
        background:transparent;
        margin:8px 2px;
    }
    &::-webkit-scrollbar-thumb {
        background-color:transparent;
        transition: background-color 0.3s ease;

    }
    &:hover::-webkit-scrollbar-thumb {
        background-color:#d1d1d1;
        border-radius:16px;

    }
  }
`;
