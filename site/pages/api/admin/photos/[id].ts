import type { NextApiRequest, NextApiResponse } from 'next';
import { estaAutenticado } from '@/lib/auth';
import { removerFoto } from '@/lib/store';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!estaAutenticado(req)) return res.status(401).json({ erro: 'Faça login em /admin.' });
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return res.status(405).json({ erro: 'Método não permitido.' });
  }

  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ erro: 'ID inválido.' });

  const removida = removerFoto(id);
  if (!removida) return res.status(404).json({ erro: 'Foto não encontrada.' });
  return res.status(200).json({ ok: true });
}
