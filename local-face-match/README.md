# Teste local de reconhecimento facial

Ferramenta de linha de comando pra testar, na sua máquina, se o
reconhecimento facial encontra a foto certa de um cliente numa base de
fotos — a mesma lógica que o site vai usar depois pra achar as fotos de
cada cliente.

## Como usar

```bash
cd local-face-match
npm install
```

1. Coloque uma foto de cada cliente na pasta `base/` (uma foto por
   arquivo — o nome do arquivo pode ser o nome do cliente, ex:
   `joao.jpg`, `maria.jpg`).
2. Coloque a foto que você quer identificar na pasta `referencia/`
   (só uma foto).
3. Rode:

   ```bash
   npm run match
   ```

O script mostra, pra cada foto da base, a distância até a foto de
referência (quanto menor, mais parecido) e marca quais bateram dentro
do limiar. As fotos que bateram são copiadas pra `resultados/`.

```
arquivo                 distância   match?
------------------------------------------------
joao.jpg                0.5318      ✅ SIM
maria.jpg               0.8596      —

✅ Cliente encontrado em 1 foto(s) da base: joao.jpg
```

## Ajustando o limiar

`THRESHOLD` em `src/matchFaces.ts` (padrão `0.6`, o valor recomendado
pelo modelo). Se estiver aceitando gente diferente como a mesma pessoa,
diminua; se estiver perdendo fotos que deveriam bater, aumente.

## Como funciona

- **Detecção do rosto**: `TinyFaceDetector` (`@vladmandic/face-api`) —
  funciona bem em foto normal, com fundo/corpo ao redor.
- **Assinatura facial**: a rede de reconhecimento converte o rosto
  alinhado num vetor de 128 números (o "descriptor"). Duas fotos da
  mesma pessoa geram vetores próximos; de pessoas diferentes, vetores
  distantes.
- **Comparação**: distância euclidiana entre os vetores.
- Se nenhum rosto é detectado numa foto (ex: já vem recortada bem
  rente ao rosto, sem contexto ao redor), o script tenta calcular a
  assinatura direto em cima da imagem inteira, como plano B.

Tudo roda local, sem internet e sem mandar nenhuma foto pra fora da
sua máquina (os modelos já vêm com o pacote `@vladmandic/face-api`,
baixados no `npm install`).

## Próximo passo

Essa é a mesma lógica (detecção + assinatura facial + distância) que
vai virar a busca "encontre minhas fotos" do site — só muda onde ela
roda (aqui é um script local; no site vai rodar num servidor, com a
base de fotos do evento do dia em vez da pasta `base/`).
