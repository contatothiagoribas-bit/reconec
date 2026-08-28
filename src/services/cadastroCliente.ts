import { calcularEmbedding } from "./embeddingModel";
import { mediaVetores, maiorDistanciaEntrePares } from "../utils/vectorMath";
import { normalizarNomeCliente } from "../utils/fileNames";
import { criarCliente } from "../db/clientesRepository";
import { Cliente, FotoRegistro } from "../types";

// Acima disso, a distância entre duas fotos de cadastro provavelmente indica
// pessoas DIFERENTES, não a mesma pessoa em ângulos diferentes — casos
// confirmados de fotos da mesma pessoa (mesmo com ângulo ruim) ficaram
// sempre abaixo de ~0.85; casos de pessoas diferentes ficaram sempre acima
// de 1.0. Ver o comentário de maiorDistanciaEntrePares().
const LIMIAR_FOTOS_DE_PESSOAS_DIFERENTES = 1.0;

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

  // Guarda contra cadastrar sem querer as fotos de PESSOAS DIFERENTES sob um
  // único nome (ex.: um casal, um grupo) — a média dos embeddings só faz
  // sentido pra várias fotos da MESMA pessoa; misturando identidades, o
  // resultado não bate bem com o rosto de nenhuma delas, e o cliente nunca é
  // reconhecido depois, sem nenhum aviso na hora do cadastro.
  const maiorDistancia = maiorDistanciaEntrePares(embeddings);
  if (maiorDistancia > LIMIAR_FOTOS_DE_PESSOAS_DIFERENTES) {
    throw new Error(
      `As fotos enviadas parecem ser de pessoas diferentes (distância entre elas: ${maiorDistancia.toFixed(2)}) ` +
        "— confira se todas são da mesma pessoa. Pra cadastrar mais de uma pessoa (ex.: um casal), " +
        "cadastre cada uma separadamente, com um nome diferente."
    );
  }

  return criarCliente({
    nome: normalizarNomeCliente(nome),
    fotos: fotos.map((foto) => foto.uri),
    embedding: mediaVetores(embeddings),
  });
}
