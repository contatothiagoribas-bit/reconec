import { detectarRostos } from "./faceDetector";
import { calcularEmbedding } from "./embeddingModel";
import { RostoDetectado } from "../types";

/** Detecta todos os rostos de uma imagem e calcula o embedding de cada um. */
export async function reconhecerRostos(uriImagem: string): Promise<RostoDetectado[]> {
  const caixas = await detectarRostos(uriImagem);
  const rostos: RostoDetectado[] = [];
  for (const caixa of caixas) {
    const { embedding, recorteUri } = await calcularEmbedding(uriImagem, caixa);
    rostos.push({ embedding, caixa, recorteUri });
  }
  return rostos;
}

/**
 * Calcula o embedding "principal" de uma foto de referência de cliente: quando há
 * mais de um rosto na foto, usa o de maior área (presumivelmente o rosto em destaque).
 * Retorna null quando nenhum rosto é encontrado na foto.
 */
export async function calcularEmbeddingPrincipal(uriImagem: string): Promise<number[] | null> {
  const rostos = await reconhecerRostos(uriImagem);
  if (rostos.length === 0) return null;

  const maior = rostos.reduce((a, b) =>
    a.caixa.largura * a.caixa.altura >= b.caixa.largura * b.caixa.altura ? a : b
  );
  return maior.embedding;
}
