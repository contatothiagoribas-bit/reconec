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
  const novo = await Album.create(nome, [assetInicial], false);
  return { album: novo, criadoAgora: true };
}

/**
 * Coloca o vídeo já processado no(s) álbum(ns) do(s) cliente(s) reconhecido(s) nele
 * (ou no álbum de "não reconhecidos"), de acordo com a configuração escolhida.
 * Retorna os nomes dos álbuns em que o vídeo foi colocado.
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

  return albuns;
}
