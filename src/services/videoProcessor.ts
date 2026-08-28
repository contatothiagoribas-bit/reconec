import { MediaToolkit } from "react-native-media-toolkit";
import * as VideoThumbnails from "expo-video-thumbnails";
import { File } from "expo-file-system";
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

// Largura máxima do frame extraído — vídeo de drone costuma ser 4K, e não
// precisa dessa resolução toda pra detectar/reconhecer rosto (que depois é
// recortado e reduzido a 112x112 de qualquer forma). Isso reduz bastante o
// tamanho de cada arquivo temporário gerado por frame analisado.
const LARGURA_MAXIMA_FRAME = 1920;

/**
 * Extrai um frame do vídeo num instante específico. Usa o `react-native-media-toolkit`
 * (Jetpack Media3/AVFoundation) como principal — bem mais robusto com codecs
 * incomuns (ex.: HEVC de drone) do que a API antiga (`MediaMetadataRetriever`,
 * usada pelo `expo-video-thumbnails`) — e cai pra essa como reserva, já que num
 * caso raro uma pode funcionar onde a outra falha.
 */
async function extrairFrame(uri: string, timeMs: number): Promise<string> {
  try {
    const resultado = await MediaToolkit.getThumbnail(uri, {
      timeMs,
      quality: 50,
      maxWidth: LARGURA_MAXIMA_FRAME,
    });
    return resultado.uri;
  } catch (erroPrincipal) {
    try {
      // expo-video-thumbnails não tem opção de largura máxima — só usada como
      // reserva num caso raro, então o arquivo maior aqui não é o normal.
      const resultado = await VideoThumbnails.getThumbnailAsync(uri, { time: timeMs, quality: 0.5 });
      return resultado.uri;
    } catch {
      throw erroPrincipal;
    }
  }
}

/**
 * Apaga um arquivo temporário (frame extraído, recorte de rosto) — best-effort,
 * sem interromper o processamento se a limpeza falhar por qualquer motivo.
 * Sem isso, analisar muitos vídeos (até 60 frames cada) enche o armazenamento
 * do celular de arquivos temporários que nunca são reaproveitados.
 */
function apagarArquivoTemporario(uri: string): void {
  try {
    const arquivo = new File(uri);
    if (arquivo.exists) {
      arquivo.delete();
    }
  } catch {
    // best-effort — não deve interromper o processamento
  }
}

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
    let uriFrame: string | null = null;
    try {
      uriFrame = await extrairFrame(video.uri, instantes[i]);
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
        // Recorte 112x112 usado só pra calcular o embedding — não precisa
        // mais dele depois disso (mesma lógica: evitar acumular arquivo
        // temporário à toa por frame analisado).
        if (rosto.recorteUri) {
          apagarArquivoTemporario(rosto.recorteUri);
        }
      }
    } catch (erro) {
      // Um frame ruim isolado (ex.: recorte degenerado num instante específico)
      // não deve derrubar a análise do vídeo inteiro — só pula esse frame, mas
      // guarda o erro pra reportar caso NENHUM frame do vídeo dê certo.
      ultimoErro = erro;
    } finally {
      if (uriFrame) {
        apagarArquivoTemporario(uriFrame);
      }
    }
    onProgresso?.(i + 1, instantes.length);

    if (clientesJaConfirmados.size === clientes.length && clientes.length > 0) {
      break;
    }
  }

  // Se nem um frame sequer pôde ser lido, o problema é o próprio vídeo (arquivo
  // corrompido, formato/codec não suportado pelo extrator, URI inválida etc.).
  // Não trava mais como "erro" (o que deixava o vídeo travado pra sempre, sem
  // nunca ser organizado) — trata como "nao_reconhecido" (vai pro álbum de não
  // reconhecidos), mas com um aviso explicando que o motivo real foi não
  // conseguir ler o vídeo, não "ninguém foi encontrado nos frames".
  if (framesLidosComSucesso === 0) {
    const detalhe = ultimoErro instanceof Error ? ultimoErro.message : String(ultimoErro);
    return {
      video,
      clientesReconhecidos: [],
      status: "nao_reconhecido",
      avisoLeitura: `não foi possível ler nenhum frame deste vídeo (${detalhe}) — formato/codec pode não ser suportado`,
    };
  }

  return {
    video,
    clientesReconhecidos: correspondencias,
    status: correspondencias.length > 0 ? "reconhecido" : "nao_reconhecido",
  };
}
