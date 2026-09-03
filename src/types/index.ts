/**
 * Tipos compartilhados do app.
 */

import { CaixaRosto } from "../services/faceDetector";

/**
 * Uma foto de referência escolhida no cadastro, junto com qual rosto dela usar
 * (a pessoa que está sendo cadastrada) — necessário quando a foto tem mais de
 * uma pessoa, pra não acabar calculando o embedding da pessoa errada.
 */
export interface FotoRegistro {
  uri: string;
  caixa: CaixaRosto;
}

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
  /**
   * URI de conteúdo (`content://...`) do asset ORIGINAL na Galeria, reconstruída a
   * partir do `assetId` que o seletor devolve — permite mover o vídeo de verdade
   * (organizador.ts) em vez de criar uma cópia nova a partir da cópia temporária
   * (`uri`). Ausente quando o seletor não devolveu um ID (ex.: acesso limitado à
   * galeria) — nesse caso o organizador cai pro comportamento antigo (cria cópia).
   */
  assetContentUri?: string;
}

/** Resultado do reconhecimento facial em um frame/foto. */
export interface RostoDetectado {
  embedding: number[];
  caixa: { x: number; y: number; largura: number; altura: number };
  /** URI do recorte 112x112 realmente usado pra calcular o embedding — só pra diagnóstico visual. */
  recorteUri?: string;
  /** Se o recorte foi alinhado pela posição dos olhos ou caiu pro método antigo (caixa bruta) — só diagnóstico. */
  alinhadoPorOlhos?: boolean;
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
  /**
   * Presente quando NENHUM frame do vídeo pôde ser lido (formato/codec não
   * suportado pelo extrator, arquivo corrompido etc.) — o vídeo ainda é
   * tratado como "nao_reconhecido" (vai pro álbum de não reconhecidos em vez
   * de ficar travado como erro), mas com esse aviso explicando o motivo real,
   * diferente de "ninguém foi reconhecido nos frames".
   */
  avisoLeitura?: string;
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
