// Permite `require("...arquivo.tflite")` no código, tratando o modelo como um
// asset binário (Metro resolve isso para um id numérico, igual a imagens/fontes).
declare module "*.tflite" {
  const value: number;
  export default value;
}
