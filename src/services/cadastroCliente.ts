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
  let fotosComErro = 0;

  for (const foto of fotos) {
    try {
      const { embedding } = await calcularEmbedding(foto.uri, foto.caixa);
      embeddings.push(embedding);
    } catch {
      fotosComErro++;
    }
  }

  if (embeddings.length === 0) {
    throw new Error("Não foi possível calcular o embedding de nenhuma das fotos enviadas");
  }

  if (fotosComErro > 0) {
    console.warn(`${fotosComErro} foto(s) ignorada(s) por erro ao calcular o embedding.`);
  }

  return criarCliente({
    nome: normalizarNomeCliente(nome),
    fotos: fotos.map((foto) => foto.uri),
    embedding: mediaVetores(embeddings),
  });
}
