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

1. Coloque as fotos do evento na pasta `base/` (pode ter mais de uma
   pessoa em cada foto — o script detecta todos os rostos).
2. Coloque a selfie da pessoa que você quer achar na pasta
   `referencia/` (só uma foto).
3. Rode:

   ```bash
   npm run match
   ```

O script mostra, pra cada foto da base, quantos rostos achou e a
distância até a selfie de referência (quanto menor, mais parecido —
usa o rosto mais parecido da foto, caso tenha mais de uma pessoa) e
marca quais bateram dentro do limiar. As fotos que bateram são
copiadas pra `resultados/`.

```
arquivo                 rostos   distância   match?
--------------------------------------------------------
grupo4.jpg              6        0.4161      ✅ SIM
grupo3.jpg              5        0.4914      ✅ SIM
outra_foto.jpg          1        0.7342      —

✅ Cliente encontrado em 2 foto(s) da base: grupo4.jpg, grupo3.jpg
```

## Ajustando o limiar

`THRESHOLD` em `src/matchFaces.ts` (padrão `0.6`, o valor recomendado
pelo modelo). Se estiver aceitando gente diferente como a mesma pessoa,
diminua; se estiver perdendo fotos que deveriam bater, aumente.

## Como funciona

- **Detecção do rosto**: `SsdMobilenetv1` (`@vladmandic/face-api`) —
  mais confiável que o `TinyFaceDetector` em foto real (fundo, ângulo
  variado, iluminação de rua/praia). Detecta **todos** os rostos da
  foto, não só um — importante porque uma foto de evento costuma ter
  mais de uma pessoa.
- **Assinatura facial**: a rede de reconhecimento converte cada rosto
  alinhado num vetor de 128 números (o "descriptor"). Duas fotos da
  mesma pessoa geram vetores próximos; de pessoas diferentes, vetores
  distantes.
- **Comparação**: distância euclidiana entre os vetores. Quando a foto
  da base tem mais de um rosto, usa a menor distância entre eles (o
  mais parecido com a referência).
- Se **nenhum** rosto é detectado numa foto, ela é reportada como tal
  e **não entra na comparação** — antes o script tentava calcular a
  assinatura em cima da imagem inteira como plano B nesse caso, o que
  causava falso positivo em massa com foto real (a assinatura de uma
  imagem sem rosto detectado direito não tem significado, e comparações
  sem significado podem "bater" com qualquer coisa). Se uma pessoa que
  devia aparecer numa foto está sendo reportada como "0 rostos", o
  problema é a foto (iluminação, ângulo, resolução) — tente outra.

Tudo roda local, sem internet e sem mandar nenhuma foto pra fora da
sua máquina (os modelos já vêm com o pacote `@vladmandic/face-api`,
baixados no `npm install`).

## Próximo passo

Essa é a mesma lógica (detecção + assinatura facial + distância) que
vai virar a busca "encontre minhas fotos" do site — só muda onde ela
roda (aqui é um script local; no site vai rodar num servidor, com a
base de fotos do evento do dia em vez da pasta `base/`).
