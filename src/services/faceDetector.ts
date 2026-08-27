import FaceDetection from "@react-native-ml-kit/face-detection";

export interface CaixaRosto {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

/**
 * Detecta rostos em uma imagem (foto de referência ou frame extraído de vídeo),
 * usando o detector on-device do ML Kit (Android/iOS, sem depender de internet).
 * Retorna as caixas delimitadoras encontradas, em pixels da imagem original.
 */
export async function detectarRostos(uriImagem: string): Promise<CaixaRosto[]> {
  const faces = await FaceDetection.detect(uriImagem, {
    performanceMode: "accurate",
    landmarkMode: "none",
    classificationMode: "none",
  });

  return faces.map((face) => ({
    x: Math.max(0, Math.round(face.frame.left)),
    y: Math.max(0, Math.round(face.frame.top)),
    largura: Math.round(face.frame.width),
    altura: Math.round(face.frame.height),
  }));
}
