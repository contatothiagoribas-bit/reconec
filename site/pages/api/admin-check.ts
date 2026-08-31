import type { NextApiRequest, NextApiResponse } from 'next';
import { estaAutenticado } from '@/lib/auth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return res.status(200).json({ autenticado: estaAutenticado(req) });
}
