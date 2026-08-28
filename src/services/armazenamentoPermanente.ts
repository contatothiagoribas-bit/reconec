import { File, Directory, Paths } from "expo-file-system";

const NOME_PASTA = "clientes";

/**
 * Copia um arquivo (foto escolhida na galeria ou tirada na câmera) pra um
 * diretório permanente do próprio app (`Paths.document`), em vez de guardar a
 * URI que o seletor devolveu.
 *
 * Isso importa porque, no Android, a URI que o `expo-image-picker` devolve
 * costuma apontar pra uma cópia temporária em cache (`cache/ImagePicker/...`)
 * — cache que o sistema pode apagar a qualquer momento (por exemplo, sob
 * pressão de pouco espaço livre, como já aconteceu aqui). Se o app guarda só
 * essa URI (ex.: na foto de referência de um cliente cadastrado), a foto
 * "some" (deixa de existir) assim que o Android limpa esse cache — mesmo sem
 * o usuário ter feito nada. `Paths.document` é documentado pelo próprio
 * expo-file-system como "seguro contra ser apagado pelo sistema".
 */
export async function copiarParaArmazenamentoPermanente(uriOrigem: string): Promise<string> {
  const origem = new File(uriOrigem);
  const pasta = new Directory(Paths.document, NOME_PASTA);
  if (!pasta.exists) {
    pasta.create();
  }

  const nomeUnico = `${Date.now()}-${Math.round(Math.random() * 1e6)}-${origem.name}`;
  const destino = new File(pasta, nomeUnico);
  await origem.copy(destino);
  return destino.uri;
}
