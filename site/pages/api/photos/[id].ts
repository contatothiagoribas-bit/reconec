import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import { caminhoDoArquivo, obterFoto } from '@/lib/store';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).end();

  const foto = obterFoto(id);
  const caminho = caminhoDoArquivo(id);
  if (!foto || !caminho) return res.status(404).json({ erro: 'Foto não encontrada.' });

  const baixar = req.query.download === '1';
  const nomeSeguro = foto.nomeOriginal.replace(/"/g, '');
  res.setHeader('Content-Type', foto.mimeType);
  res.setHeader('Content-Disposition', `${baixar ? 'attachment' : 'inline'}; filename="${nomeSeguro}"`);
  // miniatura/preview e download em alta qualidade usam o mesmo arquivo —
  // não existe versão comprimida à parte.
  fs.createReadStream(caminho).pipe(res);
}
