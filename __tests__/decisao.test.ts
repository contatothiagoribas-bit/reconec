import { decidirAlbuns, descreverDiagnostico } from "../src/services/decisao";
import { ConfiguracaoReconhecimento, Correspondencia } from "../src/types";

function config(overrides: Partial<ConfiguracaoReconhecimento> = {}): ConfiguracaoReconhecimento {
  return {
    limiarDistancia: 0.4,
    albumNaoReconhecidos: "Nao_Reconhecidos",
    estrategia: "todas_correspondencias",
    ...overrides,
  };
}

describe("decidirAlbuns", () => {
  it("retorna o álbum de não reconhecidos quando não há correspondências", () => {
    expect(decidirAlbuns([], config())).toEqual(["Nao_Reconhecidos"]);
  });

  it("ignora correspondências acima do limiar de distância", () => {
    const correspondencias: Correspondencia[] = [{ clienteId: 1, nome: "Maria", distancia: 0.9 }];
    expect(decidirAlbuns(correspondencias, config({ limiarDistancia: 0.4 }))).toEqual([
      "Nao_Reconhecidos",
    ]);
  });

  it("retorna todos os clientes reconhecidos, ordenados, na estratégia todas_correspondencias", () => {
    const correspondencias: Correspondencia[] = [
      { clienteId: 2, nome: "Joao", distancia: 0.2 },
      { clienteId: 1, nome: "Ana", distancia: 0.3 },
    ];
    expect(decidirAlbuns(correspondencias, config())).toEqual(["Ana", "Joao"]);
  });

  it("deduplica o mesmo cliente aparecendo em vários frames, mantendo a menor distância", () => {
    const correspondencias: Correspondencia[] = [
      { clienteId: 1, nome: "Ana", distancia: 0.35 },
      { clienteId: 1, nome: "Ana", distancia: 0.1 },
    ];
    expect(
      decidirAlbuns(correspondencias, config({ estrategia: "melhor_correspondencia" }))
    ).toEqual(["Ana"]);
  });

  it("retorna só o melhor cliente na estratégia melhor_correspondencia", () => {
    const correspondencias: Correspondencia[] = [
      { clienteId: 1, nome: "Ana", distancia: 0.3 },
      { clienteId: 2, nome: "Joao", distancia: 0.1 },
    ];
    expect(
      decidirAlbuns(correspondencias, config({ estrategia: "melhor_correspondencia" }))
    ).toEqual(["Joao"]);
  });

  it("sanitiza o nome do cliente para uso como nome de álbum", () => {
    const correspondencias: Correspondencia[] = [{ clienteId: 1, nome: "Cliente/Vip", distancia: 0.1 }];
    expect(decidirAlbuns(correspondencias, config())).toEqual(["Cliente_Vip"]);
  });
});

describe("descreverDiagnostico", () => {
  it("indica que nenhum rosto foi detectado quando a lista está vazia", () => {
    expect(descreverDiagnostico([])).toBe("nenhum rosto detectado nos frames analisados");
  });

  it("mostra o cliente e a distância mais próxima encontrada, mesmo acima do limiar", () => {
    const correspondencias: Correspondencia[] = [
      { clienteId: 1, nome: "Ana", distancia: 0.9 },
      { clienteId: 2, nome: "Joao", distancia: 1.4 },
    ];
    expect(descreverDiagnostico(correspondencias)).toBe("mais parecido: Ana (distância 0.90)");
  });
});
