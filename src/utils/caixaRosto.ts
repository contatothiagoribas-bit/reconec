import { CaixaRosto, Ponto } from "../services/faceDetector";

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

// Quanto maior que a distância entre os olhos é o lado do recorte quadrado —
// calibrado pra deixar sobra suficiente de testa/queixo/laterais ao redor,
// parecido com o que os "5-point alignment" clássicos de FaceNet/ArcFace usam.
const FATOR_TAMANHO_PELOS_OLHOS = 2.2;

// Posição vertical dos olhos dentro do recorte final, de cima pra baixo (não é
// 0.5 porque o queixo ocupa mais espaço abaixo dos olhos do que a testa acima).
const FRACAO_VERTICAL_OLHOS = 0.42;

/**
 * Calcula o recorte de rosto a partir da posição dos dois olhos, em vez de só
 * da caixa delimitadora bruta do detector. A caixa bruta varia bastante entre
 * fotos da mesma pessoa (ângulo da cabeça, cabelo, acessório cobrindo a testa
 * como bandana/boné) — a posição dos olhos é bem mais estável, e é o que os
 * modelos desse tipo (MobileFaceNet/ArcFace) esperam como referência de
 * alinhamento. Sem isso, duas fotos nítidas da mesma pessoa em poses
 * diferentes podem gerar embeddings mais distantes do que deveriam.
 */
export function calcularCaixaAlinhada(
  olhoEsquerdo: Ponto,
  olhoDireito: Ponto,
  imgLargura: number,
  imgAltura: number
): CaixaRosto {
  const centroX = (olhoEsquerdo.x + olhoDireito.x) / 2;
  const centroY = (olhoEsquerdo.y + olhoDireito.y) / 2;
  const distanciaOlhos = Math.hypot(olhoDireito.x - olhoEsquerdo.x, olhoDireito.y - olhoEsquerdo.y);
  const lado = distanciaOlhos * FATOR_TAMANHO_PELOS_OLHOS;

  const x = Math.max(0, Math.round(centroX - lado / 2));
  const y = Math.max(0, Math.round(centroY - lado * FRACAO_VERTICAL_OLHOS));
  const largura = Math.max(1, Math.min(Math.round(imgLargura - x), Math.round(lado)));
  const altura = Math.max(1, Math.min(Math.round(imgAltura - y), Math.round(lado)));

  return { x, y, largura, altura };
}
