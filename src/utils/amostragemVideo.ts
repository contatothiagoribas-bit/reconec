// De quanto em quanto tempo (ms) extraímos um frame do vídeo pra analisar.
export const INTERVALO_AMOSTRA_MS = 2000;

// Limite de frames analisados por vídeo. Sem um teto, um vídeo de drone de
// vários minutos levaria tempo demais pra processar no celular — quando a
// duração exige mais amostras que isso, o intervalo entre elas aumenta (ver
// `instantesValidos`) pra continuar cobrindo o vídeo inteiro, só que mais
// espaçado.
export const MAX_AMOSTRAS_POR_VIDEO = 60;

/**
 * Gera os instantes (em ms) a amostrar ao longo de todo o vídeo, não só no
 * início — a cada `INTERVALO_AMOSTRA_MS`, respeitando um teto de
 * `MAX_AMOSTRAS_POR_VIDEO` (espaçando mais as amostras em vídeos bem longos
 * pra continuar cobrindo do começo ao fim dentro desse teto). Pensado pra
 * vídeos longos e com câmera em movimento (ex.: filmagem de drone), onde a
 * pessoa pode aparecer só por um instante em qualquer ponto do vídeo.
 */
export function instantesValidos(duracaoMs: number): number[] {
  if (duracaoMs <= 0) {
    return [0];
  }

  const passoMs = Math.max(INTERVALO_AMOSTRA_MS, Math.ceil(duracaoMs / MAX_AMOSTRAS_POR_VIDEO));
  const instantes: number[] = [];
  for (let t = Math.min(1000, Math.floor(duracaoMs / 2)); t < duracaoMs; t += passoMs) {
    instantes.push(t);
  }

  return instantes.length > 0 ? instantes : [Math.floor(duracaoMs / 2)];
}
