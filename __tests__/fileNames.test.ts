import { sanitizarNomeAlbum, normalizarNomeCliente } from "../src/utils/fileNames";

describe("sanitizarNomeAlbum", () => {
  it("substitui caracteres inválidos por _", () => {
    expect(sanitizarNomeAlbum("João/Silva:Cliente*Vip?")).toBe("João_Silva_Cliente_Vip_");
  });

  it("retorna Sem_Nome para string vazia", () => {
    expect(sanitizarNomeAlbum("   ")).toBe("Sem_Nome");
  });

  it("colapsa espaços repetidos", () => {
    expect(sanitizarNomeAlbum("Maria   Souza")).toBe("Maria Souza");
  });
});

describe("normalizarNomeCliente", () => {
  it("capitaliza cada palavra", () => {
    expect(normalizarNomeCliente("maria DA silva")).toBe("Maria Da Silva");
  });

  it("remove espaços extras nas pontas e no meio", () => {
    expect(normalizarNomeCliente("  joão   souza  ")).toBe("João Souza");
  });
});
