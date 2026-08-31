# Nascer do Sol Copacabana — site

Site funcional (Next.js) com os dois papéis separados:

- **`/`** — página pública do cliente. Só dá pra subir uma selfie, buscar
  e baixar as fotos encontradas. Não tem nenhuma opção de subir fotos do
  evento aqui.
- **`/admin`** — área do dono do site, atrás de senha. É onde as fotos do
  evento são publicadas (e removidas, se precisar).

## Como rodar local

```bash
cd site
npm install
cp .env.local.example .env.local   # e edite a senha/segredo
npm run dev
```

Abre em `http://localhost:3000`. A área do dono é `http://localhost:3000/admin`
(senha = o que você colocou em `ADMIN_PASSWORD` no `.env.local`).

## Como funciona (importante pra entender o que está rodando onde)

O reconhecimento facial roda **no navegador de quem está usando a
página** — tanto na hora de subir foto (`/admin`) quanto na hora de
buscar (`/`). O servidor:

- nunca recebe a foto crua pra "olhar o rosto" — só recebe a **assinatura
  facial** já calculada (um vetor de números) e o arquivo da foto em si
  (pra guardar e servir de volta no download);
- na busca, só faz uma conta matemática simples (distância entre dois
  vetores) — não roda nenhum modelo de IA.

Isso foi proposital: mantém a mesma lógica já testada e validada em
`../local-face-match/`, e evita depender de bibliotecas nativas (`canvas`,
`@tensorflow/tfjs-node`) no servidor — que dão trabalho pra rodar em
hospedagens sem suporte a binário nativo (ex: funções serverless).

## Onde ficam os dados

`data/photos/` (arquivos das fotos) e `data/index.json` (nome do
arquivo + assinaturas faciais de cada rosto encontrado nela) — tudo em
disco, local, não versionado no git. Suficiente pra rodar/testar agora;
na hora de hospedar de verdade, num servidor que reinicia ou tem vários
processos, isso precisa virar armazenamento de arquivo (S3 ou
equivalente) + um banco de verdade — a troca fica isolada em
`lib/store.ts`, sem precisar mexer nas páginas nem nas rotas.

## Segurança da área do dono

Senha única (`ADMIN_PASSWORD`), sessão por cookie assinado
(`SESSION_SECRET`), 12h de validade. Suficiente pro objetivo — "só o
dono sobe foto" — mas é uma senha só, sem usuário/log de quem fez o quê.
Se mais de uma pessoa vai subir fotos (mais de um funcionário), ou
precisa de histórico de quem fez o quê, isso merece virar login de
verdade (usuário + senha por pessoa) antes de ir pro ar.

Os links de download das fotos encontradas (`/api/photos/:id`) não têm
senha — funcionam pra qualquer um que tenha o ID (um UUID, então não dá
pra adivinhar). É assim que o cliente consegue baixar sem precisar criar
conta. Se quiser algo mais restrito (link expira, por exemplo), dá pra
adicionar depois.

## Antes de colocar no ar de verdade

- `npm audit` acusa vulnerabilidades conhecidas do Next.js 14.x (a versão
  usada aqui) — a maioria é em recursos que este site não usa (App
  Router, Server Actions, middleware, otimização de imagem). Vale
  atualizar pra uma versão mais nova do Next antes de expor publicamente;
  não fiz agora porque é uma migração maior (Next 15/16), fora do escopo
  desse ajuste.
- Trocar `data/photos/` + `data/index.json` por armazenamento e banco de
  verdade (ver seção acima).
- Reforçar a autenticação do dono se mais de uma pessoa for subir fotos.

## Testado

Fluxo completo validado com Playwright antes de entregar: login errado
rejeitado, login certo funciona, upload de fotos com detecção de vários
rostos por foto, busca (em navegador sem login nenhum, simulando o
cliente) batendo com as distâncias já conhecidas do `local-face-match/`,
download batendo byte a byte com o arquivo original, e exclusão de foto
pelo dono removendo ela da lista.
