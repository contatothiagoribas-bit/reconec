import { CaixaRosto } from "../services/faceDetector";

// Margem extra ao redor do rosto detectado, como proporção da largura/altura da
// caixa. O MobileFaceNet costuma performar melhor com um pouco de "sobra" ao
// redor do rosto (testa/queixo) do que com um recorte exatamente nos limites
// da caixa que o detector devolve.
const MARGEM_PROPORCIONAL = 0.2;

/**
 * Expande a caixa do rosto com uma margem proporcional ao seu tamanho,
 * garantindo que o resultado não saia dos limites da imagem original.
 */
export function aplicarMargem(caixa: CaixaRosto, imgLargura: number, imgAltura: number): CaixaRosto {
  const margemX = Math.round(caixa.largura * MARGEM_PROPORCIONAL);
  const margemY = Math.round(caixa.altura * MARGEM_PROPORCIONAL);

  const x = Math.max(0, caixa.x - margemX);
  const y = Math.max(0, caixa.y - margemY);
  const largura = Math.min(imgLargura - x, caixa.largura + margemX * 2);
  const altura = Math.min(imgAltura - y, caixa.altura + margemY * 2);

  return {
    x,
    y,
    largura: Math.max(1, largura),
    altura: Math.max(1, altura),
  };
}
