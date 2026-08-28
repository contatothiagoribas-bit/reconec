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

// Qualidade do thumbnail extraído de cada frame (0-1). Não reduz a resolução
// (a lib não permite controlar isso), só a compressão JPEG — mas isso já
// ajuda um pouco na velocidade de decodificação/recorte que vem depois.
const QUALIDADE_THUMBNAIL = 0.5;

/**
 * Analisa um vídeo inteiro (não só o começo): extrai frames espalhados por toda
 * a duração, detecta e reconhece rostos neles, e retorna a lista de clientes
 * cadastrados encontrados (pode ser mais de um, ou nenhum). Pensado pra vídeos
 * longos e com câmera em movimento (ex.: filmagem de drone), onde a pessoa pode
 * aparecer só por um instante em qualquer ponto do vídeo.
 *
 * Pra pesar menos, a detecção de rosto roda em modo "fast" (bem mais rápido
 * que o "accurate" usado no cadastro/teste com foto, que só roda uma vez) —
 * aqui roda uma vez por frame amostrado, então a diferença de velocidade
 * importa bastante. Além disso, quando `limiarParaPararCedo` é informado, a
 * análise para assim que já encontrou, com distância aceitável, TODOS os
 * clientes cadastrados — não precisa continuar amostrando o resto do vídeo
 * só pra confirmar de novo quem já foi encontrado.
 */
export async function processarVideo(
  video: VideoAsset,
  clientes: Cliente[],
  onProgresso?: CallbackProgresso,
  limiarParaPararCedo?: number
): Promise<ResultadoProcessamento> {
  const instantes = instantesValidos(video.duracaoMs);
  const correspondencias: Correspondencia[] = [];
  const clientesJaConfirmados = new Set<number>();
  let framesLidosComSucesso = 0;
  let ultimoErro: unknown = null;

  for (let i = 0; i < instantes.length; i++) {
    try {
      const { uri: uriFrame } = await VideoThumbnails.getThumbnailAsync(video.uri, {
        time: instantes[i],
        quality: QUALIDADE_THUMBNAIL,
      });
      framesLidosComSucesso++;

      const rostos = await reconhecerRostos(uriFrame, "fast");
      for (const rosto of rostos) {
        const proximo = clientes.length > 0 ? encontrarMaisProximo(rosto.embedding, clientes) : null;
        if (proximo) {
          correspondencias.push({
            clienteId: proximo.candidato.id,
            nome: proximo.candidato.nome,
            distancia: proximo.distancia,
            normaEmbeddingDetectado: norma(rosto.embedding),
          });
          if (limiarParaPararCedo !== undefined && proximo.distancia <= limiarParaPararCedo) {
            clientesJaConfirmados.add(proximo.candidato.id);
          }
        }
      }
    } catch (erro) {
      // Um frame ruim isolado (ex.: recorte degenerado num instante específico)
      // não deve derrubar a análise do vídeo inteiro — só pula esse frame, mas
      // guarda o erro pra reportar caso NENHUM frame do vídeo dê certo.
      ultimoErro = erro;
    }
    onProgresso?.(i + 1, instantes.length);

    if (clientesJaConfirmados.size === clientes.length && clientes.length > 0) {
      break;
    }
  }

  // Se nem um frame sequer pôde ser lido, o problema é o próprio vídeo (arquivo
  // corrompido, formato não suportado pelo extrator, URI inválida etc.) —
  // reportar como erro, não como "não reconhecido".
  if (framesLidosComSucesso === 0) {
    const detalhe = ultimoErro instanceof Error ? ultimoErro.message : String(ultimoErro);
    return {
      video,
      clientesReconhecidos: [],
      status: "erro",
      mensagemErro: `Não foi possível ler nenhum frame deste vídeo. (${detalhe})`,
    };
  }

  return {
    video,
    clientesReconhecidos: correspondencias,
    status: correspondencias.length > 0 ? "reconhecido" : "nao_reconhecido",
  };
}
