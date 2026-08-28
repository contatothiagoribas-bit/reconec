import { loadTensorflowModel, TensorflowModel } from "react-native-fast-tflite";
import * as ImageManipulator from "expo-image-manipulator";
import { Asset } from "expo-asset";
import { Image } from "react-native";
import { toByteArray } from "base64-js";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const jpeg = require("jpeg-js");
import { CaixaRosto } from "./faceDetector";
import { aplicarMargem, calcularCaixaAlinhada } from "../utils/caixaRosto";

// Tamanho de entrada esperado pelo modelo de embedding (padrão MobileFaceNet/FaceNet: 112x112).
const TAMANHO_ENTRADA = 112;

let modeloPromise: Promise<TensorflowModel> | null = null;

/**
 * Carrega (uma única vez) o modelo TFLite de embedding facial (MobileFaceNet),
 * já incluído em `assets/models/mobilefacenet.tflite` — origem e licença
 * (BSD-3-Clause) documentadas em `assets/models/README.md`.
 *
 * Resolve o asset com `expo-asset` (em vez de passar o `require(...)` direto pro
 * `loadTensorflowModel`) para obter uma URI `file://` de verdade: a versão
 * publicada do react-native-fast-tflite (3.0.1) tem um bug no carregador nativo
 * Android que quebra ao receber o nome de recurso `res/raw` que o `require(...)`
 * de um asset não-imagem resolve em build de release (`no protocol: ...`,
 * https://github.com/mrousavy/react-native-fast-tflite — corrigido no branch
 * `main`, mas ainda não publicado no npm). Uma URI `file://` explícita passa
 * pelo caminho de carregamento que já funciona hoje.
 */
async function carregarModelo(): Promise<TensorflowModel> {
  if (!modeloPromise) {
    modeloPromise = (async () => {
      const asset = Asset.fromModule(require("../../assets/models/mobilefacenet.tflite"));
      await asset.downloadAsync();
      const uri = asset.localUri ?? asset.uri;
      // Delegate padrão (CPU) — veja a doc do react-native-fast-tflite para usar
      // aceleração por GPU ("core-ml" no iOS, "android-gpu"/"nnapi" no Android).
      return loadTensorflowModel({ url: uri }, []);
    })();
  }
  return modeloPromise;
}

export interface EmbeddingCalculado {
  embedding: number[];
  /** URI do recorte 112x112 realmente usado pra calcular o embedding — só pra diagnóstico visual. */
  recorteUri: string;
  /**
   * Se o recorte foi alinhado pela posição dos olhos (mais estável) ou caiu pro
   * método antigo, de margem sobre a caixa bruta do detector (rosto de perfil,
   * só um olho visível etc.) — só pra diagnóstico.
   */
  alinhadoPorOlhos: boolean;
}

/**
 * Recorta o rosto indicado pela caixa delimitadora (com uma margem extra ao
 * redor, o que o MobileFaceNet costuma preferir a um recorte justo), redimensiona
 * para o tamanho esperado pelo modelo e calcula o embedding: um vetor numérico
 * que representa a identidade daquele rosto, comparável via distância euclidiana.
 */
export async function calcularEmbedding(uriImagem: string, caixa: CaixaRosto): Promise<EmbeddingCalculado> {
  const modelo = await carregarModelo();
  const caixaComMargem = await calcularCaixaComMargemSegura(uriImagem, caixa);

  // Guarda contra um recorte degenerado (praticamente 1x1 px esticado pra
  // 112x112): isso não dá erro em lugar nenhum do pipeline, só produz um
  // embedding sem nenhuma informação do rosto — e todo mundo passa a parecer
  // igualmente "diferente" de todo mundo. Prefere falhar de forma visível.
  const AREA_MINIMA_AGEITAVEL = 20 * 20;
  if (caixaComMargem.largura * caixaComMargem.altura < AREA_MINIMA_AGEITAVEL) {
    throw new Error(
      `Recorte do rosto ficou pequeno demais (${caixaComMargem.largura}x${caixaComMargem.altura}px) ` +
        "— não deu pra calcular um embedding confiável."
    );
  }

  const recorte = await ImageManipulator.manipulateAsync(
    uriImagem,
    [
      {
        crop: {
          originX: caixaComMargem.x,
          originY: caixaComMargem.y,
          width: caixaComMargem.largura,
          height: caixaComMargem.altura,
        },
      },
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
  const embedding = Array.from(new Float32Array(saidas[0]));
  const alinhadoPorOlhos = Boolean(caixa.olhoEsquerdo && caixa.olhoDireito);
  return { embedding, recorteUri: recorte.uri, alinhadoPorOlhos };
}

/**
 * Aplica a margem ao redor do rosto, mas só quando dá pra confirmar o tamanho
 * real da imagem (necessário pra não estourar os limites dela). Se
 * `Image.getSize` falhar ou devolver algo inválido, usa a caixa original do
 * detector sem margem — mais seguro do que arriscar um recorte praticamente
 * vazio (ver a checagem de área mínima em `calcularEmbedding`).
 */
async function calcularCaixaComMargemSegura(uriImagem: string, caixa: CaixaRosto): Promise<CaixaRosto> {
  try {
    const { largura, altura } = await obterDimensoesImagem(uriImagem);
    if (largura > 0 && altura > 0) {
      // Prioriza alinhar pelos olhos (mais estável entre fotos da mesma pessoa
      // — ver calcularCaixaAlinhada) quando o detector identificou os dois;
      // cai pra margem sobre a caixa bruta quando não (ex.: rosto de perfil,
      // só um olho visível).
      if (caixa.olhoEsquerdo && caixa.olhoDireito) {
        return calcularCaixaAlinhada(caixa.olhoEsquerdo, caixa.olhoDireito, largura, altura);
      }
      return aplicarMargem(caixa, largura, altura);
    }
  } catch {
    // segue sem margem abaixo
  }
  return caixa;
}

/** Dimensões da imagem original — necessárias pra aplicar a margem do recorte com segurança. */
function obterDimensoesImagem(uri: string): Promise<{ largura: number; altura: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (largura, altura) => resolve({ largura, altura }),
      (erro) => reject(erro)
    );
  });
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
    // Normalização exigida pelo mobilefacenet.tflite embutido no app — ver
    // assets/models/README.md (mesma fórmula usada no app de referência do modelo).
    tensor[j] = (data[i] - 128) / 128;
    tensor[j + 1] = (data[i + 1] - 128) / 128;
    tensor[j + 2] = (data[i + 2] - 128) / 128;
  }
  return tensor;
}
