import { calcularEmbedding } from "./embeddingModel";
import { mediaVetores } from "../utils/vectorMath";
import { normalizarNomeCliente } from "../utils/fileNames";
import { criarCliente } from "../db/clientesRepository";
import { Cliente, FotoRegistro } from "../types";

/**
 * Cadastra um novo cliente: calcula o embedding facial de cada foto enviada e
 * salva a média deles (mais robusta a ângulo/iluminação de uma foto isolada).
 *
 * Cada foto já vem com o rosto certo indicado (`FotoRegistro.caixa`, escolhido
 * na tela de cadastro no momento de adicionar a foto) — importante quando a
 * foto tem mais de uma pessoa: sem isso, pegar "o maior rosto da foto"
 * automaticamente pode acabar calculando o embedding da pessoa errada, se ela
 * aparecer maior/mais perto da câmera do que o cliente sendo cadastrado.
 */
export async function cadastrarCliente(nome: string, fotos: FotoRegistro[]): Promise<Cliente> {
  if (!nome.trim()) {
    throw new Error("Digite o nome do cliente");
  }
  if (fotos.length === 0) {
    throw new Error("Adicione ao menos uma foto do rosto do cliente");
  }

  const embeddings: number[][] = [];
  const errosPorFoto: string[] = [];

  for (const foto of fotos) {
    try {
      const { embedding } = await calcularEmbedding(foto.uri, foto.caixa);
      embeddings.push(embedding);
    } catch (erro) {
      errosPorFoto.push(erro instanceof Error ? erro.message : String(erro));
    }
  }

  if (embeddings.length === 0) {
    // Mostra o motivo de verdade (ex.: "recorte pequeno demais") em vez de uma
    // mensagem genérica — sem isso, com uma única foto que falha, o usuário só
    // via "não foi possível" sem nenhuma pista do porquê.
    throw new Error(
      `Não foi possível calcular o embedding de nenhuma das fotos enviadas. Detalhe: ${errosPorFoto.join("; ")}`
    );
  }

  if (errosPorFoto.length > 0) {
    console.warn(`${errosPorFoto.length} foto(s) ignorada(s): ${errosPorFoto.join("; ")}`);
  }

  return criarCliente({
    nome: normalizarNomeCliente(nome),
    fotos: fotos.map((foto) => foto.uri),
    embedding: mediaVetores(embeddings),
  });
}
