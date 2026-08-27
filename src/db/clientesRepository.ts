import { getDatabase } from "./database";
import { Cliente } from "../types";

interface LinhaCliente {
  id: number;
  nome: string;
  criado_em: string;
  fotos: string;
  embedding: string;
}

function linhaParaCliente(linha: LinhaCliente): Cliente {
  return {
    id: linha.id,
    nome: linha.nome,
    criadoEm: linha.criado_em,
    fotos: JSON.parse(linha.fotos),
    embedding: JSON.parse(linha.embedding),
  };
}

export async function listarClientes(): Promise<Cliente[]> {
  const db = await getDatabase();
  const linhas = await db.getAllAsync<LinhaCliente>(
    "SELECT * FROM clientes ORDER BY nome COLLATE NOCASE"
  );
  return linhas.map(linhaParaCliente);
}

export async function buscarCliente(id: number): Promise<Cliente | null> {
  const db = await getDatabase();
  const linha = await db.getFirstAsync<LinhaCliente>("SELECT * FROM clientes WHERE id = ?", [id]);
  return linha ? linhaParaCliente(linha) : null;
}

export async function criarCliente(dados: {
  nome: string;
  fotos: string[];
  embedding: number[];
}): Promise<Cliente> {
  const db = await getDatabase();
  const criadoEm = new Date().toISOString();
  const resultado = await db.runAsync(
    "INSERT INTO clientes (nome, criado_em, fotos, embedding) VALUES (?, ?, ?, ?)",
    [dados.nome, criadoEm, JSON.stringify(dados.fotos), JSON.stringify(dados.embedding)]
  );
  return {
    id: resultado.lastInsertRowId,
    nome: dados.nome,
    criadoEm,
    fotos: dados.fotos,
    embedding: dados.embedding,
  };
}

export async function removerCliente(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM clientes WHERE id = ?", [id]);
}

export async function atualizarEmbeddingCliente(
  id: number,
  fotos: string[],
  embedding: number[]
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("UPDATE clientes SET fotos = ?, embedding = ? WHERE id = ?", [
    JSON.stringify(fotos),
    JSON.stringify(embedding),
    id,
  ]);
}
