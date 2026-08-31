/**
 * Armazenamento local (disco) das fotos do evento + índice das assinaturas
 * faciais. Simples de propósito — pra rodar já, local — mas isolado num
 * módulo só, então dá pra trocar depois por S3 + banco de verdade sem
 * mexer nas rotas.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const PHOTOS_DIR = path.join(DATA_DIR, 'photos');
const INDEX_PATH = path.join(DATA_DIR, 'index.json');

export type FotoRegistrada = {
  id: string;
  nomeOriginal: string;
  mimeType: string;
  descritores: number[][];
  criadaEm: string;
};

function garantirPastas() {
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
}

function lerIndice(): FotoRegistrada[] {
  garantirPastas();
  if (!fs.existsSync(INDEX_PATH)) return [];
  const conteudo = fs.readFileSync(INDEX_PATH, 'utf8').trim();
  if (!conteudo) return [];
  return JSON.parse(conteudo) as FotoRegistrada[];
}

function salvarIndice(fotos: FotoRegistrada[]) {
  garantirPastas();
  fs.writeFileSync(INDEX_PATH, JSON.stringify(fotos, null, 2), 'utf8');
}

export function listarFotos(): FotoRegistrada[] {
  return lerIndice();
}

function extensaoParaMime(nomeArquivo: string): string {
  const ext = path.extname(nomeArquivo).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

export function registrarFoto(params: {
  caminhoTemporario: string;
  nomeOriginal: string;
  descritores: number[][];
}): FotoRegistrada {
  garantirPastas();
  const id = crypto.randomUUID();
  const ext = path.extname(params.nomeOriginal) || '.jpg';
  const caminhoFinal = path.join(PHOTOS_DIR, `${id}${ext}`);
  fs.copyFileSync(params.caminhoTemporario, caminhoFinal);
  fs.rmSync(params.caminhoTemporario, { force: true });

  const registro: FotoRegistrada = {
    id,
    nomeOriginal: params.nomeOriginal,
    mimeType: extensaoParaMime(params.nomeOriginal),
    descritores: params.descritores,
    criadaEm: new Date().toISOString(),
  };

  const fotos = lerIndice();
  fotos.push(registro);
  salvarIndice(fotos);
  return registro;
}

export function caminhoDoArquivo(id: string): string | null {
  const fotos = lerIndice();
  const foto = fotos.find((f) => f.id === id);
  if (!foto) return null;
  const ext = path.extname(foto.nomeOriginal) || '.jpg';
  const caminho = path.join(PHOTOS_DIR, `${id}${ext}`);
  return fs.existsSync(caminho) ? caminho : null;
}

export function obterFoto(id: string): FotoRegistrada | null {
  return lerIndice().find((f) => f.id === id) ?? null;
}

export function removerFoto(id: string): boolean {
  const fotos = lerIndice();
  const foto = fotos.find((f) => f.id === id);
  if (!foto) return false;
  const caminho = caminhoDoArquivo(id);
  if (caminho) fs.rmSync(caminho, { force: true });
  salvarIndice(fotos.filter((f) => f.id !== id));
  return true;
}
