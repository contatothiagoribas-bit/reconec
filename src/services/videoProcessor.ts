import * as VideoThumbnails from "expo-video-thumbnails";
import {
  Cliente,
  Correspondencia,
  ResultadoProcessamento,
  VideoAsset,
} from "../types";
import { reconhecerRostos } from "./faceRecognition";
import { encontrarMaisProximo, norma } from "../utils/vectorMath";

// Momentos do vídeo (em ms, a partir do início) de onde extraímos frames para analisar.
// Amostrar mais de um instante aumenta a chance de pegar um rosto de frente e bem iluminado.
const INSTANTES_AMOSTRA_MS = [1000, 3000, 6000];

/**
 * Analisa um vídeo: extrai alguns frames, detecta e reconhece rostos neles, e
 * retorna a lista de clientes cadastrados encontrados (pode ser mais de um, ou nenhum).
 */
export async function processarVideo(
  video: VideoAsset,
  clientes: Cliente[]
): Promise<ResultadoProcessamento> {
  try {
    const correspondencias: Correspondencia[] = [];

    for (const instanteMs of instantesValidos(video.duracaoMs)) {
      const { uri: uriFrame } = await VideoThumbnails.getThumbnailAsync(video.uri, {
        time: instanteMs,
      });

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
    }

    return {
      video,
      clientesReconhecidos: correspondencias,
      status: correspondencias.length > 0 ? "reconhecido" : "nao_reconhecido",
    };
  } catch (erro) {
    return {
      video,
      clientesReconhecidos: [],
      status: "erro",
      mensagemErro: erro instanceof Error ? erro.message : String(erro),
    };
  }
}

/** Evita amostrar instantes além da duração do vídeo (vídeos curtos). */
function instantesValidos(duracaoMs: number): number[] {
  const validos = INSTANTES_AMOSTRA_MS.filter((t) => t < duracaoMs);
  return validos.length > 0 ? validos : [Math.floor(duracaoMs / 2)];
}
