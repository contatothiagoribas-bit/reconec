# Como testar o Reconec de verdade

Este app usa módulos nativos (ML Kit, TFLite) que **não funcionam no Expo Go**.
Tem duas formas de testar num celular de verdade — escolha a que for mais
prática pra você.

## Opção A — Build na nuvem com EAS (recomendado, não precisa Android Studio/Xcode)

Você gera o `.apk` na nuvem da Expo e instala direto no seu Android. Roda tudo
no seu computador normal (sem precisar de SDK Android instalado).

1. Crie uma conta gratuita em https://expo.dev, se ainda não tiver.
2. Baixe este branch (`claude/app-reconhecimento-aac9gp`) no seu computador e,
   dentro da pasta do projeto:
   ```bash
   npm install
   npx eas-cli login
   npx eas-cli init          # associa o projeto à sua conta Expo (gera um ID)
   ```
3. Gere o build de desenvolvimento (já configurado em `eas.json`):
   ```bash
   npx eas-cli build --profile development --platform android
   ```
   Isso enfileira o build nos servidores da Expo (grátis, mas pode levar de
   10 a 20 minutos na fila do plano gratuito). Ao terminar, o terminal mostra
   um link/QR code para baixar o `.apk`.
4. No celular Android, abra esse link e instale o `.apk` (o Android pode pedir
   pra liberar "instalar de fontes desconhecidas" — normal para builds fora da
   Play Store).
5. De volta no computador, na pasta do projeto:
   ```bash
   npm start
   ```
   Isso roda `expo start --dev-client`. Abra o app **Reconec** que você acabou
   de instalar no celular (não é o Expo Go) — ele conecta sozinho ao bundler
   (celular e computador precisam estar na mesma rede Wi-Fi).
6. A partir daqui, qualquer mudança de código (JS/TS) aparece na hora, sem
   gerar um `.apk` novo. Só é preciso rodar o `eas build` de novo se algum
   módulo **nativo** for adicionado/trocado (ex.: outra lib de câmera).

> iOS: o mesmo fluxo funciona com `--platform ios`, mas exige uma conta Apple
> Developer (paga) para gerar o certificado — o Android é o caminho mais
> simples pra um primeiro teste.

## Opção B — Build local (se você já tem Android Studio ou Xcode)

```bash
npm install
npx expo prebuild        # gera android/ e ios/ — já validei que roda limpo
npx expo run:android     # ou: npx expo run:ios (precisa de macOS)
```

Compila e instala direto num emulador ou num device conectado por USB (com
depuração USB ativada no Android, ou confiando no computador no iOS).

## Antes de testar: coloque o app pra reconhecer alguém

O modelo de reconhecimento já vem incluso (`assets/models/mobilefacenet.tflite`)
— não precisa configurar nada extra além dos passos acima.

## Roteiro de teste sugerido

1. **Aba Clientes**: cadastre 1 ou 2 pessoas, com 2 a 3 fotos nítidas do rosto
   cada (de frente, boa iluminação).
2. **Aba Processar vídeos**: toque em "Buscar vídeos" (autorize o acesso à
   galeria) e depois em "Processar".
3. Acompanhe a lista — cada vídeo mostra em qual(is) álbum(ns) foi colocado.
4. Abra o app de **Galeria/Fotos** do celular: devem aparecer álbuns com o
   nome de cada cliente cadastrado, contendo os vídeos em que ele apareceu.
   Vídeos sem ninguém reconhecido vão para o álbum `Nao_Reconhecidos`.

## Se algo der errado

Me manda:
- a mensagem de erro completa (print de tela ou texto do terminal), e
- em qual passo aconteceu (build, `npm start`, cadastro de cliente, ou
  processamento de vídeo).

A partir disso eu ajusto o código e você só precisa dar `git pull` (mais um
novo `eas build` só se for erro de módulo nativo — erro de lógica/tela é só
recarregar o app com o bundler rodando).
