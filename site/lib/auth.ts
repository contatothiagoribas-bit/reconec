/**
 * Sessão simples do dono do site (senha única, sem cadastro de usuário).
 * Suficiente pro objetivo de "só o dono sobe fotos" — pra algo mais robusto
 * (vários funcionários, cada um com login) dá pra trocar depois sem mexer
 * nas páginas, só aqui.
 */
import crypto from 'crypto';
import type { NextApiRequest } from 'next';

export const COOKIE_NAME = 'nds_admin_session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 12; // 12 horas

function segredo(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    throw new Error('SESSION_SECRET não configurado — veja .env.local.example');
  }
  return s;
}

function assinar(payload: string): string {
  return crypto.createHmac('sha256', segredo()).update(payload).digest('hex');
}

export function senhaCorreta(senhaEnviada: string): boolean {
  const senhaEsperada = process.env.ADMIN_PASSWORD;
  if (!senhaEsperada) {
    throw new Error('ADMIN_PASSWORD não configurado — veja .env.local.example');
  }
  const a = Buffer.from(senhaEnviada);
  const b = Buffer.from(senhaEsperada);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function criarTokenSessao(): string {
  const exp = String(Date.now() + SESSION_DURATION_MS);
  return `${exp}.${assinar(exp)}`;
}

export function tokenValido(token: string | undefined | null): boolean {
  if (!token) return false;
  const [exp, assinatura] = token.split('.');
  if (!exp || !assinatura) return false;
  if (assinar(exp) !== assinatura) return false;
  const expNum = Number(exp);
  return Number.isFinite(expNum) && Date.now() < expNum;
}

function lerCookie(req: NextApiRequest, nome: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  const partes = header.split(';').map((p) => p.trim());
  for (const parte of partes) {
    const idx = parte.indexOf('=');
    if (idx === -1) continue;
    if (parte.slice(0, idx) === nome) return decodeURIComponent(parte.slice(idx + 1));
  }
  return undefined;
}

export function estaAutenticado(req: NextApiRequest): boolean {
  return tokenValido(lerCookie(req, COOKIE_NAME));
}
