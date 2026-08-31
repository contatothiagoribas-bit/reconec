/**
 * Reconhecimento facial — roda inteiramente no navegador de quem estiver
 * usando a página (dono do site fazendo upload, ou cliente buscando as
 * fotos dele). O servidor nunca vê a foto crua: só recebe a "assinatura"
 * (descriptor) já calculada, e o arquivo da foto em si (pra guardar/servir
 * de volta pro download) — não faz nenhum processamento de reconhecimento.
 *
 * Mesma lógica validada no local-face-match/: SsdMobilenetv1 (mais
 * confiável que o TinyFaceDetector em foto real) + detecta TODOS os
 * rostos da imagem (uma foto de evento pode ter mais de uma pessoa) + sem
 * "plano B" que calcula em cima da imagem inteira quando não acha rosto
 * (isso já causou falso positivo em massa).
 *
 * Import DINÂMICO de propósito (nunca `import ... from` no topo do
 * arquivo): a build "main" do @vladmandic/face-api puxa
 * @tensorflow/tfjs-node, que não instalamos (evita dependência nativa no
 * servidor) — um import estático quebraria a build do Next.js, que carrega
 * o módulo da página no servidor pra coletar metadados, mesmo sem
 * executar nada. Com import dinâmico dentro das funções, o carregamento
 * só acontece de fato quando o navegador chama, nunca durante a build.
 */
type FaceApiModule = typeof import('@vladmandic/face-api');

let faceapiPromise: Promise<FaceApiModule> | null = null;
function getFaceApi(): Promise<FaceApiModule> {
  if (!faceapiPromise) faceapiPromise = import('@vladmandic/face-api');
  return faceapiPromise;
}

const MODEL_URL = '/models';
let modelosCarregados: Promise<void> | null = null;

export function carregarModelos(): Promise<void> {
  if (!modelosCarregados) {
    modelosCarregados = (async () => {
      const faceapi = await getFaceApi();
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    })();
  }
  return modelosCarregados;
}

export type RostoDetectado = { descriptor: Float32Array; area: number };

/** Detecta TODOS os rostos da imagem e retorna a assinatura de cada um. */
export async function detectarRostos(img: HTMLImageElement): Promise<RostoDetectado[]> {
  const faceapi = await getFaceApi();
  // minConfidence baixo pra não perder rosto de ângulo mais difícil (de
  // lado, óculos de sol, sombra) — uma detecção "sobrando" não é problema,
  // ela só vai gerar uma distância alta e ser descartada na comparação.
  const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 });
  const deteccoes = await faceapi.detectAllFaces(img, options).withFaceLandmarks().withFaceDescriptors();
  return deteccoes.map((d) => ({
    descriptor: d.descriptor,
    area: d.detection.box.width * d.detection.box.height,
  }));
}

/** Fica com o maior rosto da imagem (heurística pra selfie: o rosto de quem tirou a foto). */
export async function detectarRostoPrincipal(img: HTMLImageElement): Promise<Float32Array | null> {
  const rostos = await detectarRostos(img);
  if (rostos.length === 0) return null;
  return rostos.reduce((a, b) => (a.area > b.area ? a : b)).descriptor;
}

export function carregarImagem(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
