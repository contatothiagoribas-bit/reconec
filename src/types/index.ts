/**
 * Tipos compartilhados do app.
 */

/** Cliente cadastrado, com o vetor facial calculado a partir das fotos de referência. */
export interface Cliente {
  id: number;
  nome: string;
  criadoEm: string; // ISO date
  /** Caminhos locais das fotos de referência usadas para calcular o(s) embedding(s). */
  fotos: string[];
  /** Embedding facial (vetor numérico) calculado a partir das fotos. Média dos embeddings quando há mais de uma foto. */
  embedding: number[];
}

/** Um vídeo do dispositivo, antes de ser processado. */
export interface VideoAsset {
  id: string;
  uri: string;
  nomeArquivo: string;
  duracaoMs: number;
}

/** Resultado do reconhecimento facial em um frame/foto. */
export interface RostoDetectado {
  embedding: number[];
  caixa: { x: number; y: number; largura: number; altura: number };
}

/** Resultado da comparação de um rosto com a base de clientes cadastrados. */
export interface Correspondencia {
  clienteId: number;
  nome: string;
  distancia: number;
  /** Magnitude do embedding detectado no vídeo — só pra diagnóstico (ver descreverDiagnostico). */
  normaEmbeddingDetectado?: number;
}

/** Resultado do processamento de um vídeo: quais clientes foram reconhecidos nele. */
export interface ResultadoProcessamento {
  video: VideoAsset;
  clientesReconhecidos: Correspondencia[];
  status: "reconhecido" | "nao_reconhecido" | "erro";
  mensagemErro?: string;
}

/** Estratégia usada para decidir em quais álbuns um vídeo deve ser colocado. */
export type EstrategiaOrganizacao = "todas_correspondencias" | "melhor_correspondencia";

/** Configuração ajustável do reconhecimento e da organização. */
export interface ConfiguracaoReconhecimento {
  /**
   * Distância euclidiana máxima entre embeddings para considerar um rosto como
   * pertencente a um cliente (métrica do modelo MobileFaceNet embutido — veja
   * `assets/models/README.md`). Menor = mais rígido. Padrão recomendado: `0.5`.
   */
  limiarDistancia: number;
  /** Nome do álbum onde vídeos sem nenhum cliente reconhecido são colocados. */
  albumNaoReconhecidos: string;
  estrategia: EstrategiaOrganizacao;
}
