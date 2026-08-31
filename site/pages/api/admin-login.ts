import type { NextApiRequest, NextApiResponse } from 'next';
import { COOKIE_NAME, criarTokenSessao, senhaCorreta } from '@/lib/auth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ erro: 'Método não permitido.' });
  }

  const { senha } = req.body ?? {};
  if (typeof senha !== 'string' || senha.length === 0) {
    return res.status(400).json({ erro: 'Informe a senha.' });
  }

  let confere: boolean;
  try {
    confere = senhaCorreta(senha);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: 'Servidor não configurado (ADMIN_PASSWORD/SESSION_SECRET ausentes).' });
  }

  if (!confere) {
    return res.status(401).json({ erro: 'Senha incorreta.' });
  }

  const token = criarTokenSessao();
  const maxAgeSegundos = 12 * 60 * 60;
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSegundos}`
  );
  return res.status(200).json({ ok: true });
}
