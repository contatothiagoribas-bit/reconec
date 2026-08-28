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

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Confere se o asset já aparece no álbum esperado, tentando algumas vezes com
 * uma pequena pausa entre elas — o MediaStore do Android pode levar um
 * instante pra refletir uma mudança de álbum recém-feita, então checar uma
 * vez só logo em seguida pode dar falso negativo.
 */
async function confirmarAlbum(asset: Asset, albuns: string[]): Promise<boolean> {
  const TENTATIVAS = 3;
  const PAUSA_MS = 400;
  for (let tentativa = 0; tentativa < TENTATIVAS; tentativa++) {
    const albunsDoAsset = await asset.getAlbums();
    const titulosDoAsset = await Promise.all(albunsDoAsset.map((album) => album.getTitle()));
    if (albuns.some((nomeAlbum) => titulosDoAsset.includes(nomeAlbum))) {
      return true;
    }
    if (tentativa < TENTATIVAS - 1) {
      await esperar(PAUSA_MS);
    }
  }
  return false;
}

export interface ResultadoOrganizacao {
  albuns: string[];
  /** Presente quando não foi possível confirmar a colocação no álbum — não bloqueia, só avisa. */
  aviso?: string;
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
): Promise<ResultadoOrganizacao> {
  const albuns = decidirAlbuns(resultado.clientesReconhecidos, config);

  let asset: Asset;
  try {
    asset = await Asset.create(resultado.video.uri);
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    // ENOENT/FileNotFoundException aqui costuma ser o arquivo temporário do
    // vídeo (cache do seletor da galeria) tendo sido apagado pelo próprio
    // Android nesse meio-tempo — comum sob pouco espaço livre no aparelho.
    // Os frames já tinham sido lidos com sucesso antes disso (senão nem
    // teria chegado aqui) — o problema é só nessa etapa final.
    if (/ENOENT|FileNotFoundException|no such file/i.test(mensagem)) {
      throw new Error(
        "O arquivo temporário desse vídeo não existe mais (provavelmente removido pelo sistema " +
          "por falta de espaço) — selecione esse vídeo de novo pra tentar organizar."
      );
    }
    throw erro;
  }

  for (const nomeAlbum of albuns) {
    const { album, criadoAgora } = await obterOuCriarAlbum(nomeAlbum, asset);
    // `Album.create` já inclui o asset no álbum recém-criado; para um álbum que já
    // existia (ex.: cliente com mais de um vídeo), é preciso adicioná-lo à parte.
    if (!criadoAgora) {
      await album.add(asset);
    }
  }

  // Confere que o vídeo realmente foi parar no(s) álbum(ns) esperado(s) — sem
  // isso, uma falha silenciosa da API nativa apareceria como sucesso. Não
  // bloqueia o processamento se a confirmação falhar (pode ser só o
  // MediaStore demorando a atualizar) — só avisa, pra não travar o app numa
  // situação que provavelmente deu certo.
  const confirmado = await confirmarAlbum(asset, albuns);
  if (!confirmado) {
    return {
      albuns,
      aviso: `não foi possível confirmar que o vídeo entrou no álbum "${albuns.join(", ")}" — confira na Galeria.`,
    };
  }

  return { albuns };
}
