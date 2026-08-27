import { Query, AssetField, MediaType, Asset } from "expo-media-library";
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
