import { Album, Asset } from "expo-media-library";
import { ResultadoProcessamento, ConfiguracaoReconhecimento } from "../types";
import { decidirAlbuns } from "./decisao";

/**
 * Garante que exista um álbum com o nome informado. No Android/iOS um "álbum" é o
 * equivalente a uma pasta dentro do app de Galeria/Fotos do aparelho.
 */
async function obterOuCriarAlbum(
  nome: string,
  assetInicial: Asset
): Promise<{ album: Album; criadoAgora: boolean }> {
  const existente = await Album.get(nome);
  if (existente) {
    return { album: existente, criadoAgora: false };
  }
  // `moveAssets: true` MOVE o vídeo pra dentro do álbum (em vez de copiar) —
  // além de combinar com a ideia de "separar" os vídeos, evita duplicar
  // arquivos de vídeo de drone (grandes) na galeria.
  const novo = await Album.create(nome, [assetInicial], true);
  return { album: novo, criadoAgora: true };
}

/**
 * Coloca o vídeo já processado no(s) álbum(ns) do(s) cliente(s) reconhecido(s) nele
 * (ou no álbum de "não reconhecidos"), de acordo com a configuração escolhida.
 * Retorna os nomes dos álbuns em que o vídeo foi colocado.
 *
 * NOTA: no Android, um vídeo só pode estar fisicamente numa pasta por vez —
 * então se a estratégia "todas_correspondencias" reconhecer mais de um
 * cliente no mesmo vídeo, ele acaba ficando só no ÚLTIMO álbum processado
 * (cada `add` move o arquivo de fato, tirando ele do álbum anterior). Isso é
 * uma limitação do sistema de arquivos do Android, não desta função.
 */
export async function organizarVideo(
  resultado: ResultadoProcessamento,
  config: ConfiguracaoReconhecimento
): Promise<string[]> {
  const albuns = decidirAlbuns(resultado.clientesReconhecidos, config);
  const asset = await Asset.create(resultado.video.uri);

  for (const nomeAlbum of albuns) {
    const { album, criadoAgora } = await obterOuCriarAlbum(nomeAlbum, asset);
    // `Album.create` já inclui o asset no álbum recém-criado; para um álbum que já
    // existia (ex.: cliente com mais de um vídeo), é preciso adicioná-lo à parte.
    if (!criadoAgora) {
      await album.add(asset);
    }
  }

  // Confere que o vídeo realmente foi parar no(s) álbum(ns) esperado(s) —
  // sem isso, uma falha silenciosa da API nativa apareceria como sucesso.
  const albunsDoAsset = await asset.getAlbums();
  const titulosDoAsset = await Promise.all(albunsDoAsset.map((album) => album.getTitle()));
  const nenhumAlbumEsperadoConfirmado = !albuns.some((nomeAlbum) => titulosDoAsset.includes(nomeAlbum));
  if (nenhumAlbumEsperadoConfirmado) {
    throw new Error(
      `O vídeo foi processado, mas não foi possível confirmar que ele entrou no álbum "${albuns.join(", ")}" — ` +
        "confira manualmente na Galeria."
    );
  }

  return albuns;
}
