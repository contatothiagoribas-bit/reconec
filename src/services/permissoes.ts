import * as MediaLibrary from "expo-media-library";
import * as ImagePicker from "expo-image-picker";

/** Permissão de leitura/escrita na galeria (ler vídeos e criar álbuns por cliente). */
export async function garantirPermissaoMidia(): Promise<boolean> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === "granted";
}

/** Permissão de câmera (fotografar o cliente na hora do cadastro). */
export async function garantirPermissaoCamera(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === "granted";
}
