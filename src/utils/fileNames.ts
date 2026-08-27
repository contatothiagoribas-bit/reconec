/**
 * Utilitários de nomes de arquivo/álbum. Sem dependências nativas — fáceis de testar.
 */

const CARACTERES_INVALIDOS = /[\\/:*?"<>|]/g;

/** Sanitiza um nome para uso seguro como nome de álbum/pasta, preservando acentos. */
export function sanitizarNomeAlbum(nome: string): string {
  const limpo = nome.trim().replace(CARACTERES_INVALIDOS, "_").replace(/\s+/g, " ");
  return limpo.length > 0 ? limpo : "Sem_Nome";
}

/** Remove espaços duplicados e capitaliza a primeira letra de cada palavra, para exibição. */
export function normalizarNomeCliente(nome: string): string {
  return nome
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((palavra) => palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase())
    .join(" ");
}
