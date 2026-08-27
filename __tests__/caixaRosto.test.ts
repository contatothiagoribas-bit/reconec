import { aplicarMargem } from "../src/utils/caixaRosto";

describe("aplicarMargem", () => {
  it("expande a caixa em 20% pra cada lado quando há espaço sobrando", () => {
    const caixa = { x: 100, y: 100, largura: 100, altura: 100 };
    const resultado = aplicarMargem(caixa, 1000, 1000);
    expect(resultado).toEqual({ x: 80, y: 80, largura: 140, altura: 140 });
  });

  it("não deixa a origem ficar negativa quando o rosto está perto da borda esquerda/topo", () => {
    const caixa = { x: 5, y: 5, largura: 100, altura: 100 };
    const resultado = aplicarMargem(caixa, 1000, 1000);
    expect(resultado.x).toBe(0);
    expect(resultado.y).toBe(0);
  });

  it("não deixa o recorte ultrapassar a largura/altura da imagem", () => {
    const caixa = { x: 900, y: 900, largura: 100, altura: 100 };
    const resultado = aplicarMargem(caixa, 1000, 1000);
    expect(resultado.x + resultado.largura).toBeLessThanOrEqual(1000);
    expect(resultado.y + resultado.altura).toBeLessThanOrEqual(1000);
  });

  it("nunca retorna largura/altura menor que 1, mesmo em imagens minúsculas", () => {
    const caixa = { x: 0, y: 0, largura: 100, altura: 100 };
    const resultado = aplicarMargem(caixa, 1, 1);
    expect(resultado.largura).toBeGreaterThanOrEqual(1);
    expect(resultado.altura).toBeGreaterThanOrEqual(1);
  });
});
