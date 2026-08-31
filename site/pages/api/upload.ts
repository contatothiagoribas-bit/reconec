import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { estaAutenticado } from '@/lib/auth';
import { registrarFoto } from '@/lib/store';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ erro: 'Método não permitido.' });
  }

  if (!estaAutenticado(req)) {
    return res.status(401).json({ erro: 'Só o dono do site pode subir fotos. Faça login em /admin.' });
  }

  const form = formidable({ maxFileSize: 30 * 1024 * 1024 });

  let fields: formidable.Fields;
  let files: formidable.Files;
  try {
    [fields, files] = await form.parse(req);
  } catch (e) {
    console.error(e);
    return res.status(400).json({ erro: 'Não consegui ler o upload (arquivo grande demais ou corrompido).' });
  }

  const arquivo = Array.isArray(files.foto) ? files.foto[0] : files.foto;
  const descritoresTexto = Array.isArray(fields.descritores) ? fields.descritores[0] : fields.descritores;

  if (!arquivo) {
    return res.status(400).json({ erro: 'Nenhuma foto enviada.' });
  }
  if (!descritoresTexto) {
    return res.status(400).json({ erro: 'Faltou a assinatura facial calculada no navegador.' });
  }

  let descritores: number[][];
  try {
    descritores = JSON.parse(descritoresTexto);
    if (!Array.isArray(descritores)) throw new Error('formato inválido');
  } catch (e) {
    return res.status(400).json({ erro: 'Assinatura facial em formato inválido.' });
  }

  const registro = registrarFoto({
    caminhoTemporario: arquivo.filepath,
    nomeOriginal: arquivo.originalFilename || 'foto.jpg',
    descritores,
  });

  return res.status(200).json({
    id: registro.id,
    nomeOriginal: registro.nomeOriginal,
    rostos: registro.descritores.length,
  });
}
