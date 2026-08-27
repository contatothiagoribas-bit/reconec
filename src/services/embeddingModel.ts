import { loadTensorflowModel, TensorflowModel } from "react-native-fast-tflite";
import * as ImageManipulator from "expo-image-manipulator";
import { toByteArray } from "base64-js";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const jpeg = require("jpeg-js");
import { CaixaRosto } from "./faceDetector";

// Tamanho de entrada esperado pelo modelo de embedding (padrão MobileFaceNet/FaceNet: 112x112).
const TAMANHO_ENTRADA = 112;

let modeloPromise: Promise<TensorflowModel> | null = null;

/**
 * Carrega (uma única vez) o modelo TFLite de embedding facial.
 *
 * IMPORTANTE: o arquivo do modelo não é distribuído neste repositório — veja
 * `assets/models/README.md` para instruções de como obtê-lo e onde colocá-lo antes
 * de rodar o app.
 */
function carregarModelo(): Promise<TensorflowModel> {
  if (!modeloPromise) {
    // Delegate padrão (CPU) — veja a doc do react-native-fast-tflite para usar
    // aceleração por GPU ("core-ml" no iOS, "android-gpu"/"nnapi" no Android).
    modeloPromise = loadTensorflowModel(require("../../assets/models/mobilefacenet.tflite"), []);
  }
  return modeloPromise;
}

/**
 * Recorta o rosto indicado pela caixa delimitadora, redimensiona para o tamanho
 * esperado pelo modelo e calcula o embedding: um vetor numérico que representa
 * a identidade daquele rosto, comparável via distância de cosseno.
 */
export async function calcularEmbedding(uriImagem: string, caixa: CaixaRosto): Promise<number[]> {
  const modelo = await carregarModelo();

  const recorte = await ImageManipulator.manipulateAsync(
    uriImagem,
    [
      { crop: { originX: caixa.x, originY: caixa.y, width: caixa.largura, height: caixa.altura } },
      { resize: { width: TAMANHO_ENTRADA, height: TAMANHO_ENTRADA } },
    ],
    { base64: true, format: ImageManipulator.SaveFormat.JPEG, compress: 0.95 }
  );

  if (!recorte.base64) {
    throw new Error("Não foi possível gerar o recorte da imagem para calcular o embedding");
  }

  const entrada = decodificarJpegParaTensor(recorte.base64, TAMANHO_ENTRADA);
  const saidas = modelo.runSync([entrada.buffer as ArrayBuffer]);
  // A primeira (e única) saída do modelo é o vetor de embedding (ex.: 192 floats).
  return Array.from(new Float32Array(saidas[0]));
}

/**
 * Decodifica um JPEG (já recortado e redimensionado) em um Float32Array normalizado
 * no formato [R,G,B, R,G,B, ...] esperado pelo modelo, sem depender de módulos nativos
 * extras — usa decodificação pura em JavaScript (`jpeg-js`).
 */
function decodificarJpegParaTensor(base64: string, tamanho: number): Float32Array {
  const bytes = toByteArray(base64);
  const { data, width, height } = jpeg.decode(bytes, { useTArray: true });

  if (width !== tamanho || height !== tamanho) {
    throw new Error(`Esperava imagem ${tamanho}x${tamanho}, mas recebi ${width}x${height}`);
  }

  const tensor = new Float32Array(tamanho * tamanho * 3);
  for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
    // Normaliza de [0,255] para [-1,1], padrão usado por MobileFaceNet/FaceNet.
    tensor[j] = (data[i] - 127.5) / 128;
    tensor[j + 1] = (data[i + 1] - 127.5) / 128;
    tensor[j + 2] = (data[i + 2] - 127.5) / 128;
  }
  return tensor;
}
