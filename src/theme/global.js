import { createGlobalStyle, css } from "styled-components"

export default createGlobalStyle`
  body{
    margin: 0;
    font-size: 18px;
    font-family: sans-serif;
    ${({ scroll }) =>
      !scroll &&
      css`
        overflow: hidden;
      `};
}
  * {
    box-sizing: border-box;
  }
`
