import { Query, AssetField, MediaType, Asset } from "expo-media-library";
import * as ImagePicker from "expo-image-picker";
import { VideoAsset } from "../types";

/** Lista os vídeos do dispositivo disponíveis para processar (do mais recente ao mais antigo). */
export async function listarVideosDoDispositivo(limite = 100): Promise<VideoAsset[]> {
  const assets = await new Query()
    .eq(AssetField.MEDIA_TYPE, MediaType.VIDEO)
    .orderBy(AssetField.CREATION_TIME)
    .limit(limite)
    .exe();

  return Promise.all(assets.map(paraVideoAsset));
}

// Limite de vídeos por ida à galeria. Vídeo de drone costuma ser um arquivo
// grande (4K) — pedir pro seletor nativo carregar muitos de uma vez pode
// sobrecarregar a galeria do aparelho (trava ou fecha sem selecionar nada).
// A tela de processar já permite repetir a seleção várias vezes, acumulando
// os vídeos, então esse limite não reduz quantos vídeos dá pra processar no
// total — só quantos de uma vez só.
const LIMITE_VIDEOS_POR_SELECAO = 10;

/**
 * Abre o seletor nativo de mídia da galeria pra o usuário escolher manualmente
 * quais vídeos processar, em vez de listar todos os vídeos do aparelho. Retorna
 * uma lista vazia se o usuário cancelar a seleção.
 */
export async function selecionarVideosDoDispositivo(): Promise<VideoAsset[]> {
  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["videos"],
    allowsMultipleSelection: true,
    selectionLimit: LIMITE_VIDEOS_POR_SELECAO,
  });

  if (resultado.canceled) {
    return [];
  }

  return Promise.all(
    resultado.assets.map(async (asset, indice) => ({
      id: asset.assetId ?? `${asset.uri}-${indice}`,
      uri: await resolverUriPersistente(asset),
      nomeArquivo: asset.fileName ?? asset.uri.split("/").pop() ?? `video-${indice + 1}`,
      duracaoMs: asset.duration ?? 0,
    }))
  );
}

/**
 * Resolve a URI de verdade do arquivo, salva na pasta de vídeos do aparelho,
 * em vez da URI que o seletor devolve por padrão no Android (`asset.uri`) —
 * essa costuma apontar pra uma CÓPIA temporária em `cache/ImagePicker/...`,
 * que o próprio Android pode apagar a qualquer momento (confirmado
 * acontecendo bastante sob pouco espaço livre no aparelho: os frames que já
 * tinham sido lidos com sucesso passavam a dar erro de arquivo não
 * encontrado minutos depois). A URI resolvida pelo `assetId` (via
 * expo-media-library) aponta pro arquivo real e persistente na galeria, não
 * pra essa cópia temporária — não sofre esse problema.
 */
async function resolverUriPersistente(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  if (!asset.assetId) {
    return asset.uri;
  }
  try {
    return await new Asset(asset.assetId).getUri();
  } catch {
    return asset.uri;
  }
}

async function paraVideoAsset(asset: Asset): Promise<VideoAsset> {
  const [uri, nomeArquivo, duracaoMs] = await Promise.all([
    asset.getUri(),
    asset.getFilename(),
    asset.getDuration(),
  ]);
  return {
    id: asset.id,
    uri,
    nomeArquivo,
    duracaoMs: duracaoMs ?? 0,
  };
}
