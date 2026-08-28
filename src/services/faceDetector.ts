import FaceDetection from "@react-native-ml-kit/face-detection";

export interface Ponto {
  x: number;
  y: number;
}

export interface CaixaRosto {
  x: number;
  y: number;
  largura: number;
  altura: number;
  /**
   * Posição dos olhos (quando o ML Kit consegue identificá-los — ex.: rosto
   * virado de perfil pode não ter os dois visíveis). Usados pra alinhar o
   * recorte pelo centro/distância entre os olhos em vez de só pela caixa
   * delimitadora bruta, que varia mais entre fotos (pose, cabelo, acessório
   * cobrindo a testa etc.) do que a posição dos olhos.
   */
  olhoEsquerdo?: Ponto;
  olhoDireito?: Ponto;
}

/**
 * Detecta rostos em uma imagem (foto de referência ou frame extraído de vídeo),
 * usando o detector on-device do ML Kit (Android/iOS, sem depender de internet).
 * Retorna as caixas delimitadoras encontradas, em pixels da imagem original,
 * junto com a posição dos olhos quando disponível (ver `CaixaRosto.olhoEsquerdo`).
 */
export async function detectarRostos(uriImagem: string): Promise<CaixaRosto[]> {
  const faces = await FaceDetection.detect(uriImagem, {
    performanceMode: "accurate",
    // "all" pra conseguir a posição dos olhos e alinhar o recorte por eles
    // (ver calcularCaixaAlinhada) — sem isso, o recorte usa só a caixa bruta
    // do detector, que é mais sensível a pose/acessórios (ex.: bandana).
    landmarkMode: "all",
    classificationMode: "none",
    // Padrão do ML Kit é 0.1 (rosto precisa ocupar 10% da largura da imagem).
    // Vídeos de drone costumam mostrar a pessoa bem distante/pequena no quadro —
    // reduz bastante esse mínimo pra não descartar esses rostos de cara.
    minFaceSize: 0.02,
  });

  return faces.map((face) => ({
    x: Math.max(0, Math.round(face.frame.left)),
    y: Math.max(0, Math.round(face.frame.top)),
    largura: Math.round(face.frame.width),
    altura: Math.round(face.frame.height),
    olhoEsquerdo: face.landmarks?.leftEye?.position,
    olhoDireito: face.landmarks?.rightEye?.position,
  }));
}
