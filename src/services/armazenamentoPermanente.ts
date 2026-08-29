import { File, Directory, Paths } from "expo-file-system";

/**
 * Copia um arquivo (foto ou vídeo escolhido no seletor da galeria) pra um
 * diretório permanente do próprio app (`Paths.document/<pasta>`), em vez de
 * guardar a URI que o seletor devolveu.
 *
 * Isso importa porque, no Android, a URI que o `expo-image-picker` devolve
 * costuma apontar pra uma cópia temporária em cache (`cache/ImagePicker/...`)
 * — cache que o sistema pode apagar a qualquer momento (confirmado
 * acontecendo bastante sob pouco espaço livre no aparelho, mesmo minutos
 * depois de selecionado). `Paths.document` é documentado pelo próprio
 * expo-file-system como "seguro contra ser apagado pelo sistema".
 *
 * Tentamos antes resolver a URI "de verdade" do arquivo pelo `assetId` (via
 * expo-media-library), sem precisar copiar nada — mas isso não funcionou de
 * forma confiável neste aparelho (o seletor de galeria de alguns
 * fabricantes/versões do Android não expõe um ID que o expo-media-library
 * consiga usar pra achar o arquivo de volta). Copiar o arquivo é mais lento
 * e usa mais espaço temporariamente, mas não depende de nenhuma API de
 * terceiro cooperando — só precisa conseguir ler o arquivo uma vez, o que já
 * é garantido logo depois de selecionado.
 */
export async function copiarParaArmazenamentoPermanente(uriOrigem: string, pasta: string): Promise<string> {
  const origem = new File(uriOrigem);
  const diretorio = new Directory(Paths.document, pasta);
  if (!diretorio.exists) {
    diretorio.create();
  }

  const nomeUnico = `${Date.now()}-${Math.round(Math.random() * 1e6)}-${origem.name}`;
  const destino = new File(diretorio, nomeUnico);
  await origem.copy(destino);
  return destino.uri;
}

/** Apaga um arquivo copiado por `copiarParaArmazenamentoPermanente` — best-effort. */
export function apagarArquivoPermanente(uri: string): void {
  try {
    const arquivo = new File(uri);
    if (arquivo.exists) {
      arquivo.delete();
    }
  } catch {
    // best-effort — não deve interromper nada se a limpeza falhar
  }
}
