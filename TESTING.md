# Como testar o Reconec de verdade

Este app usa módulos nativos (ML Kit, TFLite) que **não funcionam no Expo Go**.
Tem quatro formas de testar num celular de verdade. Se você só tem o celular
(sem computador) e não quer usar terminal nenhum, vá direto pra **Opção D**.

## Opção D — Só tenho celular, sem digitar comando nenhum (GitHub Actions)

Aqui você só clica em botões na própria página do GitHub, pelo navegador do
celular. Nada de terminal, nada de digitar comando.

1. Gere um token na Expo: abra https://expo.dev/settings/access-tokens
   (logado na sua conta), toque em **"Create token"**, dê um nome qualquer
   (ex.: "github-actions") e copie o valor gerado.

   > ⚠️ Se você já tinha criado um token antes e mandou ele em algum chat,
   > revogue o antigo primeiro (botão de lixeira ao lado dele nessa mesma
   > página) e use um novo aqui.

2. Guarde esse token **só no GitHub**, nunca em chat: abra
   `https://github.com/contatothiagoribas-bit/reconec/settings/secrets/actions`
   → **"New repository secret"** → em "Name" coloque exatamente `EXPO_TOKEN` →
   em "Secret" cole o token → **"Add secret"**.

3. Vá em `https://github.com/contatothiagoribas-bit/reconec/actions/workflows/eas-build.yml`
   → toque em **"Run workflow"** → confira se o branch selecionado é
   `claude/app-reconhecimento-aac9gp` → deixe "profile" em `development` e
   "platform" em `android` → toque em **"Run workflow"** de novo pra
   confirmar.

4. Toque no card que aparece (a execução em andamento) pra acompanhar o log.
   Demora uns 15-20 minutos. Quando terminar com um ✅ verde, o link do
   `.apk` aparece no final do log da etapa **"Rodar build na nuvem da
   Expo"** — ou você acha o build pronto direto em
   `https://expo.dev` (na sua conta → o projeto **reconec** → aba "Builds").

5. Abra esse link **no navegador do celular** → botão pra baixar/instalar o
   `.apk` (autorize "instalar de fontes desconhecidas" se o Android pedir).

6. Pronto — abra o app **Reconec** que apareceu no celular e siga o
   [roteiro de teste](#roteiro-de-teste-sugerido) mais abaixo.

> Esse workflow já está configurado no repositório
> (`.github/workflows/eas-build.yml`) — você só precisa fazer os passos 1-3
> uma vez. Da próxima vez que eu avisar que preparei uma atualização, é só
> repetir o passo 3 em diante.

## Opção C — Só tenho celular, mas topo digitar uns comandos (GitHub Codespaces)

Aqui você usa um "computador na nuvem" gratuito, direto pelo navegador do
próprio celular — não precisa instalar nada, nem ter um PC.

1. No navegador do celular, abra https://github.com/contatothiagoribas-bit/reconec
   e faça login na sua conta do GitHub (a mesma que já criou esse repositório).
2. Toque no seletor de branch (o botão que hoje mostra "main" ou o nome de
   outra branch, geralmente perto do canto superior esquerdo da lista de
   arquivos) e escolha `claude/app-reconhecimento-aac9gp`.
3. Toque no botão verde **"Code"**.
4. Na aba **"Codespaces"** (dentro desse mesmo menu), toque em
   **"Create codespace on claude/app-reconhecimento-aac9gp"**.
5. Espera 1–2 minutos carregando. Vai abrir uma tela parecida com um editor de
   código, com um **terminal** (uma caixa preta de texto) na parte de baixo —
   é lá que você vai digitar os comandos. Se não aparecer sozinho, procure um
   ícone de menu (☰) e toque em algo como "Terminal → New Terminal".
6. No terminal, cole (um comando de cada vez, apertando Enter depois de cada
   um):
   ```bash
   npx eas-cli login
   ```
   Isso mostra um link. Toque nele (ou copie e abra em outra aba) pra fazer
   login normalmente na Expo, depois volte pro terminal.
   ```bash
   npx eas-cli init --id 0ded84c0-9796-4094-9f49-4a371a6f4a1d
   npm run build:dev
   ```
7. O último comando demora de 10 a 20 minutos (roda na nuvem da Expo — dá pra
   trocar de aba/sair e voltar depois, ele continua rodando). No final aparece
   um link parecido com:
   ```
   https://expo.dev/accounts/.../projects/reconec/builds/xxxxx
   ```
8. Abre esse link **no navegador do celular** (não precisa mais estar no
   Codespaces) — lá tem um botão pra baixar e instalar o `.apk`. O Android vai
   pedir pra liberar "instalar de fontes desconhecidas" — é normal, autorize.
9. Depois de instalado, abra o app **Reconec** no celular. Ele já funciona
   sozinho a partir daí — não precisa mais do Codespaces pros testes do dia a
   dia (só se eu mudar algo que exija gerar um `.apk` novo).

> Guarda o link do passo 7 — é por ele que você baixa o app de novo se
> desinstalar, ou se eu avisar que preparei uma nova versão.

## Opção A — Build na nuvem com EAS, no seu próprio computador

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
