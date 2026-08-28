import { aplicarMargem, calcularCaixaAlinhada } from "../src/utils/caixaRosto";

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

describe("calcularCaixaAlinhada", () => {
  it("centraliza o recorte no ponto médio entre os olhos, escalado pela distância entre eles", () => {
    const olhoEsquerdo = { x: 400, y: 300 };
    const olhoDireito = { x: 500, y: 300 };
    const resultado = calcularCaixaAlinhada(olhoEsquerdo, olhoDireito, 2000, 2000);
    // distância entre olhos = 100 -> lado = 220
    expect(resultado.largura).toBe(220);
    expect(resultado.altura).toBe(220);
    // centro horizontal do recorte deve coincidir com o centro dos olhos (450)
    expect(resultado.x + resultado.largura / 2).toBeCloseTo(450, 0);
  });

  it("dá o mesmo tamanho de recorte pra a mesma pessoa em fotos com enquadramento diferente", () => {
    // Mesma distância entre os olhos (mesma pessoa/zoom), só que deslocada na imagem.
    const fotoA = calcularCaixaAlinhada({ x: 100, y: 100 }, { x: 180, y: 100 }, 1000, 1000);
    const fotoB = calcularCaixaAlinhada({ x: 600, y: 400 }, { x: 680, y: 400 }, 1000, 1000);
    expect(fotoA.largura).toBe(fotoB.largura);
    expect(fotoA.altura).toBe(fotoB.altura);
  });

  it("não deixa a origem ficar negativa quando os olhos estão perto da borda", () => {
    const resultado = calcularCaixaAlinhada({ x: 5, y: 5 }, { x: 25, y: 5 }, 1000, 1000);
    expect(resultado.x).toBeGreaterThanOrEqual(0);
    expect(resultado.y).toBeGreaterThanOrEqual(0);
  });

  it("não deixa o recorte ultrapassar os limites da imagem", () => {
    const resultado = calcularCaixaAlinhada({ x: 950, y: 950 }, { x: 990, y: 950 }, 1000, 1000);
    expect(resultado.x + resultado.largura).toBeLessThanOrEqual(1000);
    expect(resultado.y + resultado.altura).toBeLessThanOrEqual(1000);
  });

  it("nunca retorna largura/altura menor que 1, mesmo em imagens minúsculas", () => {
    const resultado = calcularCaixaAlinhada({ x: 0, y: 0 }, { x: 1, y: 0 }, 1, 1);
    expect(resultado.largura).toBeGreaterThanOrEqual(1);
    expect(resultado.altura).toBeGreaterThanOrEqual(1);
  });
});
