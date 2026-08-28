import * as ImageManipulator from "expo-image-manipulator";
import { Image } from "react-native";
import { CaixaRosto } from "./faceDetector";
import { aplicarMargem } from "../utils/caixaRosto";

const TAMANHO_MINIATURA = 200;

/**
 * Gera um recorte (com um pouco de margem ao redor) de um rosto específico
 * de uma foto, só pra exibição — usado na tela de cadastro quando uma foto
 * tem mais de uma pessoa, pra deixar claro pro usuário qual rosto cada opção
 * representa antes de escolher qual delas é o cliente.
 */
export async function gerarMiniaturaRosto(uriImagem: string, caixa: CaixaRosto): Promise<string> {
  const caixaComMargem = await calcularCaixaComMargemParaMiniatura(uriImagem, caixa);
  const recorte = await ImageManipulator.manipulateAsync(
    uriImagem,
    [
      {
        crop: {
          originX: caixaComMargem.x,
          originY: caixaComMargem.y,
          width: caixaComMargem.largura,
          height: caixaComMargem.altura,
        },
      },
      { resize: { width: TAMANHO_MINIATURA, height: TAMANHO_MINIATURA } },
    ],
    { format: ImageManipulator.SaveFormat.JPEG, compress: 0.8 }
  );
  return recorte.uri;
}

function calcularCaixaComMargemParaMiniatura(uri: string, caixa: CaixaRosto): Promise<CaixaRosto> {
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (largura, altura) => resolve(aplicarMargem(caixa, largura, altura)),
      () => resolve(caixa)
    );
  });
}
