import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Cliente, FotoRegistro } from "../types";
import { listarClientes, removerCliente } from "../db/clientesRepository";
import { cadastrarCliente } from "../services/cadastroCliente";
import { garantirPermissaoCamera } from "../services/permissoes";
import { norma, encontrarMaisProximo } from "../utils/vectorMath";
import { reconhecerRostos } from "../services/faceRecognition";
import { detectarRostos, CaixaRosto } from "../services/faceDetector";
import { gerarMiniaturaRosto } from "../services/miniaturaRosto";
import { copiarParaArmazenamentoPermanente } from "../services/armazenamentoPermanente";

interface OpcaoRosto {
  caixa: CaixaRosto;
  miniaturaUri: string;
}

interface EscolhaPendente {
  uri: string;
  opcoes: OpcaoRosto[];
}

export default function ClientesScreen() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [nome, setNome] = useState("");
  const [fotos, setFotos] = useState<FotoRegistro[]>([]);
  const [processandoFotos, setProcessandoFotos] = useState(false);
  const [escolhaPendente, setEscolhaPendente] = useState<EscolhaPendente | null>(null);
  const resolverEscolhaRef = useRef<((caixa: CaixaRosto | null) => void) | null>(null);
  const [testando, setTestando] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState<string | null>(null);
  const [rostosTeste, setRostosTeste] = useState<{ recorteUri?: string; texto: string }[]>([]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      setClientes(await listarClientes());
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  /**
   * Detecta os rostos da foto recém-adicionada. Se tiver só um, usa ele direto.
   * Se tiver mais de um (ex.: outra pessoa aparece atrás/do lado), pede pro
   * usuário escolher qual é o cliente antes de adicionar — sem isso, o cálculo
   * do embedding podia acabar pegando o rosto errado (o de maior destaque na
   * foto, não necessariamente o do cliente sendo cadastrado).
   */
  async function processarFotoAdicionada(uriOriginal: string): Promise<void> {
    // Copia pra um diretório permanente do app ANTES de mais nada: a URI que
    // vem do seletor costuma apontar pra um cache temporário que o Android
    // pode apagar sozinho (ex.: sob pouco espaço livre) — sem essa cópia, a
    // miniatura do cliente cadastrado "sumia" ao reabrir o app.
    let uri = uriOriginal;
    try {
      uri = await copiarParaArmazenamentoPermanente(uriOriginal, "clientes");
    } catch {
      // se a cópia falhar, segue com a URI original — mais seguro tentar
      // usar mesmo assim do que descartar a foto inteira por causa disso.
    }

    let caixas: CaixaRosto[] = [];
    try {
      caixas = await detectarRostos(uri);
    } catch {
      // segue com lista vazia -> tratado abaixo como "nenhum rosto"
    }

    if (caixas.length === 0) {
      Alert.alert("Nenhum rosto encontrado", "Essa foto não tem um rosto detectável e não foi adicionada.");
      return;
    }

    if (caixas.length === 1) {
      setFotos((atual) => [...atual, { uri, caixa: caixas[0] }]);
      return;
    }

    const opcoes = await Promise.all(
      caixas.map(async (caixa): Promise<OpcaoRosto> => ({
        caixa,
        miniaturaUri: await gerarMiniaturaRosto(uri, caixa),
      }))
    );
    const escolhida = await new Promise<CaixaRosto | null>((resolve) => {
      resolverEscolhaRef.current = resolve;
      setEscolhaPendente({ uri, opcoes });
    });
    if (escolhida) {
      setFotos((atual) => [...atual, { uri, caixa: escolhida }]);
    }
  }

  function escolherRostoPendente(caixa: CaixaRosto | null) {
    resolverEscolhaRef.current?.(caixa);
    resolverEscolhaRef.current = null;
    setEscolhaPendente(null);
  }

  async function escolherFotoDaGaleria() {
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });
    if (resultado.canceled) return;
    setProcessandoFotos(true);
    try {
      for (const asset of resultado.assets) {
        await processarFotoAdicionada(asset.uri);
      }
    } finally {
      setProcessandoFotos(false);
    }
  }

  async function tirarFoto() {
    const permitido = await garantirPermissaoCamera();
    if (!permitido) {
      Alert.alert("Permissão necessária", "Autorize o uso da câmera para tirar a foto do cliente.");
      return;
    }
    const resultado = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (resultado.canceled) return;
    setProcessandoFotos(true);
    try {
      await processarFotoAdicionada(resultado.assets[0].uri);
    } finally {
      setProcessandoFotos(false);
    }
  }

  async function salvar() {
    if (!nome.trim()) {
      Alert.alert("Nome obrigatório", "Digite o nome do cliente.");
      return;
    }
    if (fotos.length === 0) {
      Alert.alert("Foto obrigatória", "Adicione ao menos uma foto do rosto do cliente.");
      return;
    }
    setSalvando(true);
    try {
      await cadastrarCliente(nome, fotos);
      setNome("");
      setFotos([]);
      await carregar();
    } catch (erro) {
      Alert.alert("Não foi possível cadastrar", erro instanceof Error ? erro.message : String(erro));
    } finally {
      setSalvando(false);
    }
  }

  /**
   * Testa o reconhecimento com uma única foto, sem precisar processar um vídeo
   * inteiro (nem criar álbum nenhum) — serve pra descobrir rapidamente se o
   * problema é o cálculo do reconhecimento em si, ou só a dificuldade de achar
   * um bom frame num vídeo específico (drone, ângulo ruim, etc.).
   */
  async function testarComFoto() {
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (resultado.canceled) return;

    setTestando(true);
    setResultadoTeste(null);
    setRostosTeste([]);
    try {
      const rostos = await reconhecerRostos(resultado.assets[0].uri);
      if (rostos.length === 0) {
        setResultadoTeste("Nenhum rosto detectado nessa foto.");
        return;
      }
      const itens = rostos.map((rosto, indice) => {
        const proximo = clientes.length > 0 ? encontrarMaisProximo(rosto.embedding, clientes) : null;
        const alinhamento = rosto.alinhadoPorOlhos ? "alinhado pelos olhos" : "caixa bruta, sem os 2 olhos";
        const texto = !proximo
          ? `Rosto ${indice + 1}: nenhum cliente cadastrado pra comparar. (${alinhamento})`
          : `Rosto ${indice + 1}: mais parecido com ${proximo.candidato.nome} — distância ${proximo.distancia.toFixed(2)} (${alinhamento})`;
        return { recorteUri: rosto.recorteUri, texto };
      });
      setRostosTeste(itens);
    } catch (erro) {
      setResultadoTeste(`Erro: ${erro instanceof Error ? erro.message : String(erro)}`);
    } finally {
      setTestando(false);
    }
  }

  function confirmarExclusao(cliente: Cliente) {
    Alert.alert("Remover cliente", `Remover "${cliente.nome}" da lista?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: async () => {
          await removerCliente(cliente.id);
          await carregar();
        },
      },
    ]);
  }

  return (
    <View style={estilos.container}>
      <Text style={estilos.titulo}>Cadastrar cliente</Text>
      <TextInput
        style={estilos.input}
        placeholder="Nome do cliente"
        value={nome}
        onChangeText={setNome}
      />
      <View style={estilos.linhaBotoes}>
        <TouchableOpacity style={estilos.botaoSecundario} onPress={tirarFoto}>
          <Text style={estilos.textoBotaoSecundario}>Tirar foto</Text>
        </TouchableOpacity>
        <TouchableOpacity style={estilos.botaoSecundario} onPress={escolherFotoDaGaleria}>
          <Text style={estilos.textoBotaoSecundario}>Escolher da galeria</Text>
        </TouchableOpacity>
      </View>

      {processandoFotos && (
        <View style={estilos.linhaProcessandoFotos}>
          <ActivityIndicator size="small" />
          <Text style={estilos.textoProcessandoFotos}>Detectando rosto na foto...</Text>
        </View>
      )}

      {fotos.length > 0 && (
        <FlatList
          horizontal
          data={fotos}
          keyExtractor={(foto) => foto.uri}
          style={estilos.listaFotos}
          renderItem={({ item }) => <Image source={{ uri: item.uri }} style={estilos.miniatura} />}
        />
      )}

      <TouchableOpacity
        style={[estilos.botaoPrimario, (salvando || processandoFotos) && estilos.botaoDesabilitado]}
        onPress={salvar}
        disabled={salvando || processandoFotos}
      >
        {salvando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={estilos.textoBotaoPrimario}>Salvar cliente</Text>
        )}
      </TouchableOpacity>

      <Text style={estilos.subtitulo}>Clientes cadastrados</Text>
      {carregando ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={clientes}
          keyExtractor={(c) => String(c.id)}
          ListEmptyComponent={<Text style={estilos.vazio}>Nenhum cliente cadastrado ainda.</Text>}
          renderItem={({ item }) => (
            <View style={estilos.linhaCliente}>
              {item.fotos[0] && <Image source={{ uri: item.fotos[0] }} style={estilos.avatar} />}
              <View style={estilos.infoCliente}>
                <Text style={estilos.nomeCliente}>{item.nome}</Text>
                <Text style={estilos.normaCliente}>assinatura: norma {norma(item.embedding).toFixed(2)}</Text>
              </View>
              <TouchableOpacity onPress={() => confirmarExclusao(item)}>
                <Text style={estilos.linkRemover}>Remover</Text>
              </TouchableOpacity>
            </View>
          )}
          ListFooterComponent={
            <View style={estilos.blocoTeste}>
              <Text style={estilos.subtitulo}>Testar reconhecimento com uma foto</Text>
              <Text style={estilos.ajudaTeste}>
                Escolha uma foto (não precisa ser um vídeo) pra ver rapidinho a distância calculada
                até cada cliente cadastrado — útil pra descobrir se o problema é o cálculo em si, ou
                só achar um bom frame dentro de um vídeo específico. A miniatura mostra exatamente o
                recorte de rosto que foi usado pra calcular cada distância — confira se é mesmo o
                rosto da pessoa certa antes de desconfiar do número.
              </Text>
              <TouchableOpacity
                style={[estilos.botaoSecundario, testando && estilos.botaoDesabilitado]}
                onPress={testarComFoto}
                disabled={testando}
              >
                <Text style={estilos.textoBotaoSecundario}>
                  {testando ? "Analisando..." : "Escolher foto pra testar"}
                </Text>
              </TouchableOpacity>
              {resultadoTeste && <Text style={estilos.resultadoTeste}>{resultadoTeste}</Text>}
              {rostosTeste.map((item, indice) => (
                <View key={indice} style={estilos.linhaResultadoRosto}>
                  {item.recorteUri && <Image source={{ uri: item.recorteUri }} style={estilos.miniaturaRecorte} />}
                  <Text style={estilos.textoResultadoRosto}>{item.texto}</Text>
                </View>
              ))}
            </View>
          }
        />
      )}

      <Modal visible={escolhaPendente !== null} transparent animationType="fade">
        <View style={estilos.fundoModal}>
          <View style={estilos.caixaModal}>
            <Text style={estilos.tituloModal}>Essa foto tem mais de uma pessoa</Text>
            <Text style={estilos.ajudaModal}>Toque no rosto do cliente que está sendo cadastrado.</Text>
            <View style={estilos.grudeOpcoes}>
              {escolhaPendente?.opcoes.map((opcao, indice) => (
                <TouchableOpacity key={indice} onPress={() => escolherRostoPendente(opcao.caixa)}>
                  <Image source={{ uri: opcao.miniaturaUri }} style={estilos.miniaturaOpcao} />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => escolherRostoPendente(null)} style={estilos.linkCancelarModal}>
              <Text style={estilos.textoLinkCancelarModal}>Nenhuma dessas — não usar essa foto</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  titulo: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  subtitulo: { fontSize: 16, fontWeight: "600", marginTop: 20, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  linhaBotoes: { flexDirection: "row", gap: 8, marginBottom: 12 },
  botaoSecundario: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#4a4a4a",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  textoBotaoSecundario: { color: "#4a4a4a", fontWeight: "500" },
  listaFotos: { marginBottom: 12 },
  miniatura: { width: 64, height: 64, borderRadius: 8, marginRight: 8 },
  botaoPrimario: {
    backgroundColor: "#2f6fed",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  botaoDesabilitado: { opacity: 0.6 },
  textoBotaoPrimario: { color: "#fff", fontWeight: "600" },
  vazio: { color: "#888", fontStyle: "italic" },
  linhaCliente: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
    gap: 10,
  },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  infoCliente: { flex: 1 },
  nomeCliente: { fontSize: 15 },
  normaCliente: { fontSize: 11, color: "#999" },
  linkRemover: { color: "#d33", fontWeight: "500" },
  blocoTeste: { marginTop: 24, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#ddd" },
  ajudaTeste: { color: "#666", fontSize: 13, marginBottom: 10 },
  resultadoTeste: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
    color: "#333",
    fontSize: 13,
  },
  linhaResultadoRosto: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    padding: 8,
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
  },
  miniaturaRecorte: { width: 56, height: 56, borderRadius: 8, backgroundColor: "#ddd" },
  textoResultadoRosto: { flex: 1, color: "#333", fontSize: 13 },
  linhaProcessandoFotos: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  textoProcessandoFotos: { color: "#666", fontSize: 13 },
  fundoModal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  caixaModal: { backgroundColor: "#fff", borderRadius: 12, padding: 20, width: "100%" },
  tituloModal: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  ajudaModal: { color: "#666", fontSize: 13, marginBottom: 16 },
  grudeOpcoes: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  miniaturaOpcao: { width: 90, height: 90, borderRadius: 8, backgroundColor: "#ddd" },
  linkCancelarModal: { alignSelf: "center" },
  textoLinkCancelarModal: { color: "#d33", fontSize: 13 },
});
