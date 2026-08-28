import { instantesValidos } from "../src/utils/amostragemVideo";

describe("instantesValidos", () => {
  it("cobre um vídeo curto amostrando a cada 2 segundos", () => {
    const instantes = instantesValidos(10000); // 10s
    expect(instantes[0]).toBe(1000);
    expect(instantes[instantes.length - 1]).toBeLessThan(10000);
    // ~2s de intervalo: espera uns 5 pontos num vídeo de 10s.
    expect(instantes.length).toBeGreaterThanOrEqual(4);
    expect(instantes.length).toBeLessThanOrEqual(6);
  });

  it("cobre um vídeo longo (drone) do início ao fim, sem passar de ~60 amostras", () => {
    const duracaoMs = 10 * 60 * 1000; // 10 minutos
    const instantes = instantesValidos(duracaoMs);

    expect(instantes.length).toBeLessThanOrEqual(60);
    expect(instantes[0]).toBeLessThan(duracaoMs * 0.05); // começa logo no início
    expect(instantes[instantes.length - 1]).toBeGreaterThan(duracaoMs * 0.85); // chega perto do fim
  });

  it("nunca amostra além da duração do vídeo", () => {
    const duracaoMs = 7000;
    const instantes = instantesValidos(duracaoMs);
    for (const t of instantes) {
      expect(t).toBeLessThan(duracaoMs);
    }
  });

  it("retorna ao menos um instante mesmo para vídeos muito curtos", () => {
    expect(instantesValidos(500).length).toBeGreaterThanOrEqual(1);
    expect(instantesValidos(0).length).toBeGreaterThanOrEqual(1);
  });
});
