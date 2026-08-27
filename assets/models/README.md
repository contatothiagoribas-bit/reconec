# Modelo de reconhecimento facial

O app precisa de um arquivo `mobilefacenet.tflite` nesta pasta para calcular o
"embedding" (a assinatura numérica) de cada rosto. Esse arquivo **não** é
distribuído neste repositório por dois motivos: o tamanho (alguns MB de pesos
binários) e a licença do modelo, que deve ser conferida por quem for publicar
o app.

## O que colocar aqui

Um modelo de embedding facial no formato TFLite, com:
- entrada: imagem RGB `112x112x3`, normalizada para o intervalo `[-1, 1]`;
- saída: um vetor de embedding (128 ou 192 valores `float32`), comparável via
  distância de cosseno.

O padrão mais usado para isso é o **MobileFaceNet**. Duas formas de obter o
`.tflite`:

1. **Converter você mesmo** a partir de um checkpoint público (ex.:
   [`sirius-ai/MobileFaceNet_TF`](https://github.com/sirius-ai/MobileFaceNet_TF))
   usando o conversor do TensorFlow (`tf.lite.TFLiteConverter`).
2. **Usar um `.tflite` já convertido** de uma fonte confiável — vários projetos
   open-source de reconhecimento facial em Android/iOS publicam o arquivo pronto
   junto com a licença de uso. Confira sempre a licença antes de usar em produção.

## Onde colocar

```
assets/models/mobilefacenet.tflite
```

O `metro.config.js` já está configurado para empacotar arquivos `.tflite` como
asset binário, e `src/services/embeddingModel.ts` já carrega o modelo a partir
deste caminho.

## Trocando de modelo

Se usar um modelo diferente (outro tamanho de entrada, outro formato de
normalização, embeddings de outro tamanho), ajuste as constantes no topo de
`src/services/embeddingModel.ts` (`TAMANHO_ENTRADA` e a normalização de pixels).
