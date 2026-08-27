import {
  distanciaCosseno,
  distanciaEuclidiana,
  mediaVetores,
  encontrarMaisProximo,
  norma,
} from "../src/utils/vectorMath";

describe("distanciaCosseno", () => {
  it("retorna 0 para vetores idênticos", () => {
    expect(distanciaCosseno([1, 0, 0], [1, 0, 0])).toBeCloseTo(0);
  });

  it("retorna 2 para vetores opostos", () => {
    expect(distanciaCosseno([1, 0], [-1, 0])).toBeCloseTo(2);
  });

  it("retorna 1 para vetores ortogonais", () => {
    expect(distanciaCosseno([1, 0], [0, 1])).toBeCloseTo(1);
  });

  it("lança erro para vetores de tamanhos diferentes", () => {
    expect(() => distanciaCosseno([1, 0], [1, 0, 0])).toThrow();
  });

  it("lança erro para vetores vazios", () => {
    expect(() => distanciaCosseno([], [])).toThrow();
  });

  it("trata vetor nulo como o mais distante possível", () => {
    expect(distanciaCosseno([0, 0], [1, 1])).toBe(2);
  });
});

describe("distanciaEuclidiana", () => {
  it("retorna 0 para vetores idênticos", () => {
    expect(distanciaEuclidiana([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it("calcula a distância corretamente", () => {
    expect(distanciaEuclidiana([0, 0], [3, 4])).toBe(5);
  });

  it("lança erro para vetores de tamanhos diferentes", () => {
    expect(() => distanciaEuclidiana([1, 0], [1, 0, 0])).toThrow();
  });

  it("lança erro para vetores vazios", () => {
    expect(() => distanciaEuclidiana([], [])).toThrow();
  });
});

describe("norma", () => {
  it("calcula a magnitude do vetor", () => {
    expect(norma([3, 4])).toBe(5);
  });

  it("retorna 0 para o vetor nulo", () => {
    expect(norma([0, 0, 0])).toBe(0);
  });
});

describe("mediaVetores", () => {
  it("calcula a média ponto a ponto", () => {
    expect(mediaVetores([[1, 2], [3, 4]])).toEqual([2, 3]);
  });

  it("lança erro para lista vazia", () => {
    expect(() => mediaVetores([])).toThrow();
  });

  it("lança erro para vetores de tamanhos diferentes", () => {
    expect(() => mediaVetores([[1, 2], [1, 2, 3]])).toThrow();
  });
});

describe("encontrarMaisProximo", () => {
  const candidatos = [
    { id: 1, embedding: [1, 0] },
    { id: 2, embedding: [0, 1] },
  ];

  it("retorna o candidato com menor distância (euclidiana por padrão)", () => {
    const resultado = encontrarMaisProximo([0.9, 0.1], candidatos);
    expect(resultado?.candidato.id).toBe(1);
    expect(resultado?.distancia).toBeCloseTo(distanciaEuclidiana([0.9, 0.1], [1, 0]));
  });

  it("retorna null para lista vazia de candidatos", () => {
    expect(encontrarMaisProximo([1, 0], [])).toBeNull();
  });

  it("aceita uma métrica de distância customizada", () => {
    const resultado = encontrarMaisProximo([0.9, 0.1], candidatos, distanciaCosseno);
    expect(resultado?.candidato.id).toBe(1);
  });
});
