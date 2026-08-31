/**
 * Teste local de reconhecimento facial.
 *
 * Fluxo:
 *  1. Lê todas as fotos da pasta `base/` (fotos do evento — pode ter mais de
 *     uma pessoa por foto).
 *  2. Lê a foto de `referencia/` (a selfie da pessoa que queremos achar).
 *  3. Detecta TODOS os rostos de cada foto e calcula o "descriptor"
 *     (assinatura facial) de cada um.
 *  4. Pra cada foto da base, compara a referência com cada rosto encontrado
 *     nela e fica com a melhor distância (a de mais parecido). Abaixo do
 *     limiar (THRESHOLD) é considerado a mesma pessoa.
 *  5. Copia as fotos da base que bateram para `resultados/`.
 *
 * Rodar: npm run match
 */

import * as fs from 'fs';
import * as path from 'path';
import * as canvas from 'canvas';
import * as faceapi from '@vladmandic/face-api';

const { Canvas, Image, ImageData } = canvas as unknown as {
  Canvas: typeof canvas.Canvas;
  Image: typeof canvas.Image;
  ImageData: typeof canvas.ImageData;
};
// @ts-expect-error - monkeyPatch espera os tipos DOM do browser; canvas cobre o que o face-api usa em Node.
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const ROOT = path.join(__dirname, '..');
// Os pesos do modelo vêm junto com o pacote @vladmandic/face-api (baixados
// pelo `npm install`) — não precisa guardar uma cópia extra no repositório.
const MODELS_DIR = path.join(ROOT, 'node_modules', '@vladmandic', 'face-api', 'model');
const BASE_DIR = path.join(ROOT, 'base');
const REFERENCIA_DIR = path.join(ROOT, 'referencia');
const RESULTADOS_DIR = path.join(ROOT, 'resultados');

// Distância euclidiana máxima pra considerar "mesma pessoa". Padrão recomendado
// pelo face-api.js é 0.6 — suba se estiver perdendo foto que deveria bater,
// desça se estiver aceitando gente diferente. Pode sobrescrever sem editar o
// arquivo: `THRESHOLD=0.65 npm run match`.
const THRESHOLD = Number(process.env.THRESHOLD) || 0.6;

const EXTENSOES_VALIDAS = ['.jpg', '.jpeg', '.png'];

function listarImagens(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => EXTENSOES_VALIDAS.includes(path.extname(f).toLowerCase()))
    .sort();
}

/**
 * Detecta todos os rostos de uma imagem e retorna a assinatura (descriptor)
 * de cada um. Usa SsdMobilenetv1 (mais preciso que o TinyFaceDetector em
 * foto real — com fundo, ângulo variado, iluminação de rua/praia etc.).
 *
 * Importante: NÃO existe um "plano B" que calcula a assinatura em cima da
 * imagem inteira quando não acha rosto — isso já causou falso positivo em
 * massa (a assinatura de uma foto sem rosto detectado corretamente é lixo,
 * e lixo comparado com lixo pode "bater" com qualquer coisa). Se não achou
 * rosto, o retorno é uma lista vazia — e a foto é reportada como tal.
 */
async function detectarRostos(img: canvas.Image): Promise<Float32Array[]> {
  const deteccoes = await faceapi
    .detectAllFaces(img as unknown as faceapi.TNetInput, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
    .withFaceLandmarks()
    .withFaceDescriptors();
  return deteccoes.map((d) => d.descriptor);
}

/** Descriptor do maior rosto da imagem (heurística pra selfie: o rosto de quem tirou a foto costuma ser o maior/mais central). */
async function detectarRostoPrincipal(img: canvas.Image): Promise<Float32Array | null> {
  const deteccoes = await faceapi
    .detectAllFaces(img as unknown as faceapi.TNetInput, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
    .withFaceLandmarks()
    .withFaceDescriptors();
  if (deteccoes.length === 0) return null;
  const maior = deteccoes.reduce((a, b) =>
    a.detection.box.width * a.detection.box.height > b.detection.box.width * b.detection.box.height ? a : b
  );
  return maior.descriptor;
}

async function carregarModelos() {
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_DIR);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_DIR);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_DIR);
}

async function main() {
  console.log('Carregando modelos de reconhecimento facial...');
  await carregarModelos();

  const arquivosBase = listarImagens(BASE_DIR);
  const arquivosReferencia = listarImagens(REFERENCIA_DIR);

  if (arquivosBase.length === 0) {
    console.error(`Nenhuma foto encontrada em ${BASE_DIR}. Coloque as fotos dos clientes lá.`);
    process.exit(1);
  }
  if (arquivosReferencia.length === 0) {
    console.error(`Nenhuma foto de referência encontrada em ${REFERENCIA_DIR}.`);
    process.exit(1);
  }
  if (arquivosReferencia.length > 1) {
    console.warn(`Mais de uma foto em ${REFERENCIA_DIR} — usando a primeira: ${arquivosReferencia[0]}`);
  }

  console.log(`\nBase: ${arquivosBase.length} foto(s) — ${arquivosBase.join(', ')}`);
  console.log(`Referência: ${arquivosReferencia[0]}\n`);

  // 1. Descriptor da referência (maior rosto da selfie)
  const caminhoReferencia = path.join(REFERENCIA_DIR, arquivosReferencia[0]);
  const imgReferencia = await canvas.loadImage(caminhoReferencia);
  const descritorReferencia = await detectarRostoPrincipal(imgReferencia);
  if (!descritorReferencia) {
    console.error(`Não encontrei nenhum rosto na foto de referência (${arquivosReferencia[0]}). Tente uma foto mais nítida, de frente.`);
    process.exit(1);
  }

  // 2. Pra cada foto da base, acha TODOS os rostos e fica com a melhor distância
  type Comparacao = { arquivo: string; rostos: number; distancia: number | null };
  const comparacoes: Comparacao[] = [];
  for (const arquivo of arquivosBase) {
    const caminho = path.join(BASE_DIR, arquivo);
    const img = await canvas.loadImage(caminho);
    const descritores = await detectarRostos(img);

    if (descritores.length === 0) {
      comparacoes.push({ arquivo, rostos: 0, distancia: null });
      continue;
    }

    const distancias = descritores.map((d) => faceapi.euclideanDistance(descritorReferencia, d));
    comparacoes.push({ arquivo, rostos: descritores.length, distancia: Math.min(...distancias) });
  }

  comparacoes.sort((a, b) => {
    if (a.distancia === null) return 1;
    if (b.distancia === null) return -1;
    return a.distancia - b.distancia;
  });

  console.log('Resultado (menor distância = mais parecido; limiar de match = ' + THRESHOLD + '):\n');
  console.log('arquivo'.padEnd(24) + 'rostos'.padEnd(9) + 'distância'.padEnd(12) + 'match?');
  console.log('-'.repeat(56));

  fs.mkdirSync(RESULTADOS_DIR, { recursive: true });
  // limpa resultados de uma rodada anterior (menos o .gitkeep)
  for (const antigo of fs.readdirSync(RESULTADOS_DIR)) {
    if (antigo === '.gitkeep') continue;
    fs.rmSync(path.join(RESULTADOS_DIR, antigo));
  }

  const encontrados: string[] = [];
  const semRosto: string[] = [];
  for (const c of comparacoes) {
    const distTexto = c.distancia === null ? 'sem rosto' : c.distancia.toFixed(4);
    const isMatch = c.distancia !== null && c.distancia < THRESHOLD;
    console.log(c.arquivo.padEnd(24) + String(c.rostos).padEnd(9) + distTexto.padEnd(12) + (isMatch ? '✅ SIM' : '—'));
    if (isMatch) {
      encontrados.push(c.arquivo);
      fs.copyFileSync(path.join(BASE_DIR, c.arquivo), path.join(RESULTADOS_DIR, c.arquivo));
    }
    if (c.rostos === 0) semRosto.push(c.arquivo);
  }

  console.log('');
  if (encontrados.length > 0) {
    console.log(`✅ Cliente encontrado em ${encontrados.length} foto(s) da base: ${encontrados.join(', ')}`);
    console.log(`   Copiadas para ${RESULTADOS_DIR}`);
  } else {
    console.log('❌ Nenhuma foto da base bateu com a referência dentro do limiar.');
  }
  if (semRosto.length > 0) {
    console.log(`\n⚠️  Não detectei nenhum rosto em: ${semRosto.join(', ')} — essas fotos não entraram na comparação. Se a pessoa aparece nelas, o problema é a foto (iluminação, ângulo, resolução), não o reconhecimento.`);
  }
}

main().catch((err) => {
  console.error('Erro inesperado:', err);
  process.exit(1);
});
