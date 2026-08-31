import type { NextApiRequest, NextApiResponse } from 'next';
import { estaAutenticado } from '@/lib/auth';
import { listarFotos } from '@/lib/store';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!estaAutenticado(req)) return res.status(401).json({ erro: 'Faça login em /admin.' });
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ erro: 'Método não permitido.' });
  }

  const fotos = listarFotos()
    .map((f) => ({ id: f.id, nomeOriginal: f.nomeOriginal, rostos: f.descritores.length, criadaEm: f.criadaEm }))
    .sort((a, b) => b.criadaEm.localeCompare(a.criadaEm));

  return res.status(200).json({ fotos });
}
