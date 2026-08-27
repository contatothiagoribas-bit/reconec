# Modelo de reconhecimento facial

Este app já vem com um modelo de embedding facial pronto:
[`mobilefacenet.tflite`](./mobilefacenet.tflite) (~5 MB).

## Origem e licença

Obtido do repositório open-source
[`MCarlomagno/FaceRecognitionAuth`](https://github.com/MCarlomagno/FaceRecognitionAuth/blob/master/assets/mobilefacenet.tflite),
distribuído sob **licença BSD-3-Clause**. O texto completo da licença e o aviso
de copyright exigido para redistribuição estão em
[`LICENSE-mobilefacenet.txt`](./LICENSE-mobilefacenet.txt).

A arquitetura é a **MobileFaceNet** (ver
[`sirius-ai/MobileFaceNet_TF`](https://github.com/sirius-ai/MobileFaceNet_TF)),
treinada para gerar embeddings faciais compactos e rápidos o bastante para rodar
em celular. Conferido diretamente no arquivo (nomes dos tensores/operações
embutidos no `.tflite`): tensor de entrada `input`, tensor de saída
`embeddings`, blocos `Conv2d_*` / `InvResBlock_*` / `Logits/SeparableConv2d`
condizentes com essa arquitetura.

## Especificações usadas pelo app

Essas são as mesmas specs usadas pelo `FaceRecognitionAuth` original (conferidas
no código-fonte dele) e são o que `src/services/embeddingModel.ts` implementa:

| | |
|---|---|
| Entrada | RGB `112x112x3` |
| Normalização de pixel | `(valor - 128) / 128` → aproximadamente `[-1, 1]` |
| Saída | vetor de embedding com 192 valores `float32` |
| Métrica de comparação | distância euclidiana entre embeddings (não cosseno) |
| Limiar sugerido | `0.5` (mesmo valor usado no app de referência) |

Se algum dia trocar de modelo, ajuste essas mesmas constantes em
`src/services/embeddingModel.ts` (`TAMANHO_ENTRADA` e a normalização de pixels)
e o limiar/métrica em `src/utils/vectorMath.ts` / `ProcessarScreen.tsx`.
