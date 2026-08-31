/**
 * Teste local de reconhecimento facial.
 *
 * Fluxo:
 *  1. Lê todas as fotos da pasta `base/` (uma foto por cliente = "nossa base").
 *  2. Lê a foto de `referencia/` (a foto que queremos identificar).
 *  3. Calcula o "descriptor" (assinatura facial) de cada foto.
 *  4. Compara a referência com cada foto da base e mostra a distância —
 *     quanto menor, mais parecido. Abaixo do limiar (THRESHOLD) é considerado
 *     a mesma pessoa.
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
// pelo face-api.js é 0.6 — ajuste aqui se estiver dando muito falso positivo/negativo.
const THRESHOLD = 0.6;

const EXTENSOES_VALIDAS = ['.jpg', '.jpeg', '.png'];

function listarImagens(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => EXTENSOES_VALIDAS.includes(path.extname(f).toLowerCase()))
    .sort();
}

type Resultado = {
  arquivo: string;
  descriptor: Float32Array;
};

async function calcularDescriptor(caminhoArquivo: string): Promise<Float32Array | null> {
  const img = await canvas.loadImage(caminhoArquivo);

  // Caminho normal: detecta o rosto na foto (funciona bem pra foto tirada
  // com celular, com fundo/corpo ao redor) e alinha pelos pontos do rosto.
  const deteccao = await faceapi
    .detectSingleFace(img as unknown as faceapi.TNetInput, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (deteccao) return deteccao.descriptor;

  // Se não achou rosto (comum em fotos já recortadas rente ao rosto, sem
  // fundo/contexto pro detector usar), tenta calcular o descriptor direto
  // em cima da imagem inteira, assumindo que ela já é só o rosto.
  const descriptorDireto = await faceapi.computeFaceDescriptor(img as unknown as faceapi.TNetInput);
  if (!descriptorDireto) return null;
  return Array.isArray(descriptorDireto)
    ? (descriptorDireto[0] as Float32Array)
    : (descriptorDireto as Float32Array);
}

async function carregarModelos() {
  await faceapi.nets.tinyFaceDetector.loadFromDisk(MODELS_DIR);
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

  // 1. Descriptor da referência
  const caminhoReferencia = path.join(REFERENCIA_DIR, arquivosReferencia[0]);
  const descritorReferencia = await calcularDescriptor(caminhoReferencia);
  if (!descritorReferencia) {
    console.error(`Não encontrei nenhum rosto na foto de referência (${arquivosReferencia[0]}).`);
    process.exit(1);
  }

  // 2. Descriptor de cada foto da base
  const resultadosBase: Resultado[] = [];
  for (const arquivo of arquivosBase) {
    const caminho = path.join(BASE_DIR, arquivo);
    const descriptor = await calcularDescriptor(caminho);
    if (!descriptor) {
      console.warn(`⚠️  Nenhum rosto detectado em "${arquivo}" — pulando.`);
      continue;
    }
    resultadosBase.push({ arquivo, descriptor });
  }

  // 3. Compara e ordena por distância (mais parecido primeiro)
  const comparacoes = resultadosBase
    .map((r) => ({
      arquivo: r.arquivo,
      distancia: faceapi.euclideanDistance(descritorReferencia, r.descriptor),
    }))
    .sort((a, b) => a.distancia - b.distancia);

  console.log('Resultado (menor distância = mais parecido; limiar de match = ' + THRESHOLD + '):\n');
  console.log('arquivo'.padEnd(24) + 'distância'.padEnd(12) + 'match?');
  console.log('-'.repeat(48));

  fs.mkdirSync(RESULTADOS_DIR, { recursive: true });
  // limpa resultados de uma rodada anterior
  for (const antigo of fs.readdirSync(RESULTADOS_DIR)) {
    fs.rmSync(path.join(RESULTADOS_DIR, antigo));
  }

  const encontrados: string[] = [];
  for (const c of comparacoes) {
    const isMatch = c.distancia < THRESHOLD;
    console.log(c.arquivo.padEnd(24) + c.distancia.toFixed(4).padEnd(12) + (isMatch ? '✅ SIM' : '—'));
    if (isMatch) {
      encontrados.push(c.arquivo);
      fs.copyFileSync(path.join(BASE_DIR, c.arquivo), path.join(RESULTADOS_DIR, c.arquivo));
    }
  }

  console.log('');
  if (encontrados.length > 0) {
    console.log(`✅ Cliente encontrado em ${encontrados.length} foto(s) da base: ${encontrados.join(', ')}`);
    console.log(`   Copiadas para ${RESULTADOS_DIR}`);
  } else {
    console.log('❌ Nenhuma foto da base bateu com a referência dentro do limiar.');
  }
}

main().catch((err) => {
  console.error('Erro inesperado:', err);
  process.exit(1);
});
