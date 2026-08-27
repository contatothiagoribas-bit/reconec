/**
 * Operações vetoriais usadas para comparar embeddings faciais.
 * Mantidas livres de dependências nativas para poderem ser testadas isoladamente.
 */

/** Distância de cosseno entre dois vetores: 0 = idênticos, 2 = opostos. */
export function distanciaCosseno(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vetores de tamanhos diferentes: ${a.length} e ${b.length}`);
  }
  if (a.length === 0) {
    throw new Error("Vetores vazios não podem ser comparados");
  }

  let produtoEscalar = 0;
  let normaA = 0;
  let normaB = 0;
  for (let i = 0; i < a.length; i++) {
    produtoEscalar += a[i] * b[i];
    normaA += a[i] * a[i];
    normaB += b[i] * b[i];
  }

  if (normaA === 0 || normaB === 0) {
    return 2; // vetor nulo não tem direção; trate como o mais distante possível
  }

  const similaridade = produtoEscalar / (Math.sqrt(normaA) * Math.sqrt(normaB));
  // similaridade em [-1, 1] -> distância em [0, 2]
  return 1 - similaridade;
}

/** Média ponto a ponto de vários embeddings (ex.: várias fotos do mesmo cliente). */
export function mediaVetores(vetores: number[][]): number[] {
  if (vetores.length === 0) {
    throw new Error("É preciso ao menos um vetor para calcular a média");
  }
  const tamanho = vetores[0].length;
  const soma = new Array(tamanho).fill(0);
  for (const vetor of vetores) {
    if (vetor.length !== tamanho) {
      throw new Error("Todos os vetores precisam ter o mesmo tamanho");
    }
    for (let i = 0; i < tamanho; i++) {
      soma[i] += vetor[i];
    }
  }
  return soma.map((valor) => valor / vetores.length);
}

/**
 * Encontra, dentre uma lista de clientes com embedding, qual está mais próximo do
 * embedding informado, junto com a distância. Retorna null se a lista estiver vazia.
 */
export function encontrarMaisProximo<T extends { embedding: number[] }>(
  embedding: number[],
  candidatos: T[]
): { candidato: T; distancia: number } | null {
  let melhor: { candidato: T; distancia: number } | null = null;
  for (const candidato of candidatos) {
    const distancia = distanciaCosseno(embedding, candidato.embedding);
    if (!melhor || distancia < melhor.distancia) {
      melhor = { candidato, distancia };
    }
  }
  return melhor;
}
