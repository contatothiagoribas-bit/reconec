import { calcularEmbeddingPrincipal } from "./faceRecognition";
import { mediaVetores } from "../utils/vectorMath";
import { normalizarNomeCliente } from "../utils/fileNames";
import { criarCliente } from "../db/clientesRepository";
import { Cliente } from "../types";

/**
 * Cadastra um novo cliente: calcula o embedding facial de cada foto enviada e
 * salva a média deles (mais robusta a ângulo/iluminação de uma foto isolada).
 */
export async function cadastrarCliente(nome: string, fotos: string[]): Promise<Cliente> {
  if (!nome.trim()) {
    throw new Error("Digite o nome do cliente");
  }
  if (fotos.length === 0) {
    throw new Error("Adicione ao menos uma foto do rosto do cliente");
  }

  const embeddings: number[][] = [];
  let fotosSemRosto = 0;

  for (const foto of fotos) {
    const embedding = await calcularEmbeddingPrincipal(foto);
    if (embedding) {
      embeddings.push(embedding);
    } else {
      fotosSemRosto++;
    }
  }

  if (embeddings.length === 0) {
    throw new Error("Não foi possível encontrar um rosto em nenhuma das fotos enviadas");
  }

  if (fotosSemRosto > 0) {
    console.warn(`${fotosSemRosto} foto(s) ignorada(s) por não conter rosto detectável.`);
  }

  return criarCliente({
    nome: normalizarNomeCliente(nome),
    fotos,
    embedding: mediaVetores(embeddings),
  });
}
