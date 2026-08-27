# Reconec — reconhecimento facial de clientes

App mobile (Expo / React Native) que reconhece clientes a partir de fotos e
organiza automaticamente os vídeos deles em álbuns com o nome de cada um.

## Como funciona

1. **Cadastro**: você tira ou escolhe algumas fotos do rosto de cada cliente,
   dá um nome, e o app calcula o "embedding" facial (a assinatura numérica do
   rosto) e guarda no banco local do aparelho.
2. **Processamento**: você busca os vídeos do celular na aba "Processar
   vídeos" e toca em **Processar**. Para cada vídeo, o app:
   - extrai alguns frames (instantes) do vídeo;
   - detecta rostos nesses frames com o ML Kit (on-device, sem internet);
   - calcula o embedding de cada rosto encontrado e compara com os clientes
     cadastrados;
   - cria (ou reaproveita) um **álbum na Galeria/Fotos do aparelho** com o
     nome de cada cliente reconhecido e coloca o vídeo lá — é o equivalente,
     no celular, a "separar em pastas com o nome do cliente".
   - vídeos sem nenhum cliente reconhecido vão para o álbum `Nao_Reconhecidos`.

Um mesmo vídeo pode ir para mais de um álbum se mais de um cliente cadastrado
aparecer nele (comportamento padrão, configurável — veja abaixo).

## Stack

- **Expo** + **React Native** + **TypeScript**
- `expo-sqlite` — banco local dos clientes (nome, fotos, embedding)
- `expo-image-picker` — tirar/escolher fotos do cliente
- `expo-media-library` — ler os vídeos do aparelho e criar os álbuns
- `expo-video-thumbnails` — extrair frames dos vídeos para análise
- `expo-image-manipulator` — recortar/redimensionar o rosto antes de calcular o embedding
- `@react-native-ml-kit/face-detection` — detecção de rosto (bounding box), on-device
- `react-native-fast-tflite` — roda o modelo de embedding facial (TFLite) no aparelho
- `jpeg-js` / `base64-js` — decodificação do frame recortado em pixels, em JS puro
- **MobileFaceNet** (`assets/models/mobilefacenet.tflite`) — modelo de embedding
  facial já incluído no repositório, open-source, licença BSD-3-Clause (origem e
  detalhes em [`assets/models/README.md`](assets/models/README.md))

## ⚠️ Antes de rodar

Este app usa módulos nativos (ML Kit, TFLite) que **não funcionam no app Expo
Go**. É preciso gerar um *development build* (custom dev client):

```bash
npm install
npx expo prebuild        # gera as pastas android/ e ios/
npx expo run:android     # ou: npx expo run:ios (precisa de macOS)
```

Não tem Android Studio/Xcode instalado — ou só tem o celular? Veja
[`TESTING.md`](TESTING.md): tem um jeito de gerar o `.apk` na nuvem (EAS
Build) e instalar direto no celular sem precisar de terminal nenhum (só
clicando em botões no GitHub).

O modelo de reconhecimento facial (`assets/models/mobilefacenet.tflite`) já vem
incluso no repositório — não é preciso baixar nada à parte. Detalhes de origem,
licença e especificações em [`assets/models/README.md`](assets/models/README.md).

## Cadastrando um cliente

1. Abra a aba **Clientes**.
2. Digite o nome, tire ou escolha de 2 a 5 fotos nítidas do rosto (de frente,
   boa iluminação, sem óculos escuros — quanto mais variadas as fotos, melhor
   o reconhecimento).
3. Toque em **Salvar cliente**.

## Organizando os vídeos

1. Abra a aba **Processar vídeos**.
2. Toque em **Buscar vídeos** (autorize o acesso à galeria).
3. Toque em **Processar**. Acompanhe o status de cada vídeo na lista — ao
   final, ele mostra em qual(is) álbum(ns) o vídeo foi colocado.
4. Abra o app de Galeria/Fotos do aparelho: os álbuns com o nome de cada
   cliente vão aparecer lá.

## Ajustando o reconhecimento

Os parâmetros usados no processamento ficam em
`src/screens/ProcessarScreen.tsx`, na constante `CONFIG_PADRAO`:

| Campo | Efeito |
|---|---|
| `limiarDistancia` | Distância euclidiana máxima entre embeddings para considerar um rosto como pertencente a um cliente. Menor = mais rígido (menos falsos positivos, mais falsos negativos). Padrão: `0.5` (mesmo valor validado no app de referência do modelo). |
| `estrategia` | `"todas_correspondencias"` (padrão, coloca o vídeo em todos os álbuns dos clientes encontrados) ou `"melhor_correspondencia"` (só o cliente mais parecido). |
| `albumNaoReconhecidos` | Nome do álbum para vídeos sem nenhum cliente reconhecido. |

Os instantes do vídeo analisados (em segundos) ficam em
`INSTANTES_AMOSTRA_MS`, em `src/services/videoProcessor.ts`.

## Créditos

O modelo de reconhecimento facial (MobileFaceNet, `.tflite`) vem do repositório
open-source [`MCarlomagno/FaceRecognitionAuth`](https://github.com/MCarlomagno/FaceRecognitionAuth)
(licença BSD-3-Clause — texto completo em
[`assets/models/LICENSE-mobilefacenet.txt`](assets/models/LICENSE-mobilefacenet.txt)).

## Privacidade

Fotos e vídeos de clientes ficam **apenas no aparelho** (banco SQLite local e
Galeria/Fotos nativa) — nada é enviado a nenhum servidor. Nenhum dado desse
tipo faz parte deste repositório.

## Testes

A lógica pura (matemática dos embeddings, decisão de qual álbum usar,
sanitização de nomes) tem testes automatizados que não dependem de módulos
nativos nem de um aparelho real:

```bash
npm test
npm run typecheck
```

A parte que depende de hardware (câmera, ML Kit, TFLite) só pode ser validada
rodando o app de verdade em um device/emulador, via `expo run:android` /
`expo run:ios`.

### O que já foi validado sem device/emulador

- `npx expo prebuild` roda limpo (gera `android/` e `ios/` sem erros) — confirma
  que os plugins de config, permissões e o autolinking dos módulos nativos
  (`expo-media-library`, `expo-image-picker`, `expo-sqlite`, ML Kit,
  `react-native-fast-tflite`) estão corretos.
- As permissões geradas foram conferidas nos dois projetos nativos:
  `AndroidManifest.xml` (`CAMERA`, `READ_MEDIA_VIDEO`, `READ_MEDIA_IMAGES`, etc.)
  e `Info.plist` (`NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`,
  `NSPhotoLibraryAddUsageDescription`).

O que **não** dá para validar sem SDK/emulador reais: compilar de fato o APK/IPA
(`expo run:android`/`run:ios` requer Android SDK + JDK 17 ou Xcode) e o
comportamento em runtime (câmera, detecção/reconhecimento facial, criação dos
álbuns). Isso só é possível rodando o app num Android Studio / Xcode / device
físico.
