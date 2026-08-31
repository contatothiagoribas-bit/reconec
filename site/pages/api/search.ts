import type { NextApiRequest, NextApiResponse } from 'next';
import { listarFotos } from '@/lib/store';

// Distância euclidiana entre dois vetores (mesmo cálculo do
// faceapi.euclideanDistance, refeito aqui pra não precisar do
// @vladmandic/face-api no servidor — aqui é só matemática, sem
// processamento de imagem nenhum).
function distanciaEuclidiana(a: number[], b: number[]): number {
  let soma = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    soma += diff * diff;
  }
  return Math.sqrt(soma);
}

// Corte generoso — bem mais solto que o limiar de match (0.6, ajustável
// até 0.75 no controle de sensibilidade). Só existe pra não devolver o
// ID de fotos completamente sem relação com quem está buscando.
const CORTE_MAXIMO = 0.85;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ erro: 'Método não permitido.' });
  }

  const { descriptor } = req.body ?? {};
  if (!Array.isArray(descriptor) || descriptor.some((n) => typeof n !== 'number')) {
    return res.status(400).json({ erro: 'Assinatura facial em formato inválido.' });
  }

  const fotos = listarFotos();
  const resultados = fotos
    .map((foto) => {
      if (foto.descritores.length === 0) return null;
      const distancia = Math.min(...foto.descritores.map((d) => distanciaEuclidiana(descriptor, d)));
      return { id: foto.id, distancia };
    })
    .filter((r): r is { id: string; distancia: number } => r !== null && r.distancia < CORTE_MAXIMO)
    .sort((a, b) => a.distancia - b.distancia);

  return res.status(200).json({ resultados, totalFotosNaBase: fotos.length });
}
