import * as VideoThumbnails from "expo-video-thumbnails";
import {
  Cliente,
  Correspondencia,
  ResultadoProcessamento,
  VideoAsset,
} from "../types";
import { reconhecerRostos } from "./faceRecognition";
import { encontrarMaisProximo, norma } from "../utils/vectorMath";
import { instantesValidos } from "../utils/amostragemVideo";

export type CallbackProgresso = (framesAnalisados: number, totalFrames: number) => void;

/**
 * Analisa um vídeo inteiro (não só o começo): extrai frames espalhados por toda
 * a duração, detecta e reconhece rostos neles, e retorna a lista de clientes
 * cadastrados encontrados (pode ser mais de um, ou nenhum). Pensado pra vídeos
 * longos e com câmera em movimento (ex.: filmagem de drone), onde a pessoa pode
 * aparecer só por um instante em qualquer ponto do vídeo.
 */
export async function processarVideo(
  video: VideoAsset,
  clientes: Cliente[],
  onProgresso?: CallbackProgresso
): Promise<ResultadoProcessamento> {
  const instantes = instantesValidos(video.duracaoMs);
  const correspondencias: Correspondencia[] = [];
  let framesLidosComSucesso = 0;

  for (let i = 0; i < instantes.length; i++) {
    try {
      const { uri: uriFrame } = await VideoThumbnails.getThumbnailAsync(video.uri, {
        time: instantes[i],
      });
      framesLidosComSucesso++;

      const rostos = await reconhecerRostos(uriFrame);
      for (const rosto of rostos) {
        const proximo = clientes.length > 0 ? encontrarMaisProximo(rosto.embedding, clientes) : null;
        if (proximo) {
          correspondencias.push({
            clienteId: proximo.candidato.id,
            nome: proximo.candidato.nome,
            distancia: proximo.distancia,
            normaEmbeddingDetectado: norma(rosto.embedding),
          });
        }
      }
    } catch {
      // Um frame ruim isolado (ex.: recorte degenerado num instante específico)
      // não deve derrubar a análise do vídeo inteiro — só pula esse frame.
    }
    onProgresso?.(i + 1, instantes.length);
  }

  // Se nem um frame sequer pôde ser lido, o problema é o próprio vídeo (arquivo
  // corrompido, URI inválida etc.) — reportar como erro, não como "não reconhecido".
  if (framesLidosComSucesso === 0) {
    return {
      video,
      clientesReconhecidos: [],
      status: "erro",
      mensagemErro: "Não foi possível ler nenhum frame deste vídeo.",
    };
  }

  return {
    video,
    clientesReconhecidos: correspondencias,
    status: correspondencias.length > 0 ? "reconhecido" : "nao_reconhecido",
  };
}
