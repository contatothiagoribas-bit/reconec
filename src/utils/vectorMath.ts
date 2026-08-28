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

/**
 * Distância euclidiana entre dois vetores. É a métrica recomendada pelo modelo
 * MobileFaceNet embutido no app (veja `assets/models/README.md`) — quanto menor,
 * mais parecidos os rostos.
 */
export function distanciaEuclidiana(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vetores de tamanhos diferentes: ${a.length} e ${b.length}`);
  }
  if (a.length === 0) {
    throw new Error("Vetores vazios não podem ser comparados");
  }

  let somaQuadrados = 0;
  for (let i = 0; i < a.length; i++) {
    const diferenca = a[i] - b[i];
    somaQuadrados += diferenca * diferenca;
  }
  return Math.sqrt(somaQuadrados);
}

/**
 * Norma euclidiana (magnitude) de um vetor. Útil como diagnóstico: se embeddings
 * de fotos bem diferentes sempre derem normas muito parecidas (ou 0), é sinal de
 * que o modelo não está reagindo ao conteúdo da imagem — não é uma métrica de
 * identidade, só um sinal de "o cálculo está fazendo alguma coisa que varia".
 */
export function norma(v: number[]): number {
  let somaQuadrados = 0;
  for (const x of v) {
    somaQuadrados += x * x;
  }
  return Math.sqrt(somaQuadrados);
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
 * Maior distância euclidiana entre qualquer par de vetores da lista. Serve pra
 * detectar fotos de cadastro que na verdade são de PESSOAS DIFERENTES: a média
 * de embeddings (ver `mediaVetores`) só faz sentido pra várias fotos da MESMA
 * pessoa em ângulos/iluminações diferentes — se as fotos forem de pessoas
 * diferentes, a média vira uma mistura que não bate bem com o rosto de
 * nenhuma delas. Retorna 0 se a lista tiver 0 ou 1 vetor (nada a comparar).
 */
export function maiorDistanciaEntrePares(vetores: number[][]): number {
  let maior = 0;
  for (let i = 0; i < vetores.length; i++) {
    for (let j = i + 1; j < vetores.length; j++) {
      const distancia = distanciaEuclidiana(vetores[i], vetores[j]);
      if (distancia > maior) {
        maior = distancia;
      }
    }
  }
  return maior;
}

/**
 * Encontra, dentre uma lista de clientes com embedding, qual está mais próximo do
 * embedding informado, junto com a distância. Retorna null se a lista estiver vazia.
 * Usa distância euclidiana por padrão (a métrica do modelo embutido no app), mas
 * aceita outra função de distância caso o modelo seja trocado.
 */
export function encontrarMaisProximo<T extends { embedding: number[] }>(
  embedding: number[],
  candidatos: T[],
  distancia: (a: number[], b: number[]) => number = distanciaEuclidiana
): { candidato: T; distancia: number } | null {
  let melhor: { candidato: T; distancia: number } | null = null;
  for (const candidato of candidatos) {
    const d = distancia(embedding, candidato.embedding);
    if (!melhor || d < melhor.distancia) {
      melhor = { candidato, distancia: d };
    }
  }
  return melhor;
}
