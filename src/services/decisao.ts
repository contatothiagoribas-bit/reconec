import { Correspondencia, ConfiguracaoReconhecimento } from "../types";
import { sanitizarNomeAlbum } from "../utils/fileNames";

/**
 * Decide em quais álbuns um vídeo deve entrar, a partir das correspondências
 * encontradas nos rostos detectados nele. Lógica pura (sem I/O), fácil de testar.
 */
export function decidirAlbuns(
  correspondencias: Correspondencia[],
  config: ConfiguracaoReconhecimento
): string[] {
  const validas = correspondencias.filter((c) => c.distancia <= config.limiarDistancia);

  if (validas.length === 0) {
    return [config.albumNaoReconhecidos];
  }

  // Um mesmo cliente pode aparecer mais de uma vez (vários frames); fica só a melhor distância.
  const melhorPorCliente = new Map<number, Correspondencia>();
  for (const c of validas) {
    const atual = melhorPorCliente.get(c.clienteId);
    if (!atual || c.distancia < atual.distancia) {
      melhorPorCliente.set(c.clienteId, c);
    }
  }
  const unicas = [...melhorPorCliente.values()];

  if (config.estrategia === "melhor_correspondencia") {
    const melhor = unicas.reduce((a, b) => (a.distancia <= b.distancia ? a : b));
    return [sanitizarNomeAlbum(melhor.nome)];
  }

  return unicas
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .map((c) => sanitizarNomeAlbum(c.nome));
}

/**
 * Descreve, em uma frase curta, o que foi encontrado ao processar um vídeo —
 * mesmo quando nenhuma correspondência passou no limiar. Serve pra diagnosticar
 * se o problema é "não detectou nenhum rosto" ou "detectou, mas achou parecido
 * demais/diferente demais de todo mundo cadastrado".
 */
export function descreverDiagnostico(correspondencias: Correspondencia[]): string {
  if (correspondencias.length === 0) {
    return "nenhum rosto detectado nos frames analisados";
  }

  const maisProximo = correspondencias.reduce((a, b) => (a.distancia <= b.distancia ? a : b));
  return `mais parecido: ${maisProximo.nome} (distância ${maisProximo.distancia.toFixed(2)})`;
}
