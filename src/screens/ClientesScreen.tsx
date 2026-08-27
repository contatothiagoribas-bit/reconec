import React, { useCallback, useEffect, useState } from "react";
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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Cliente } from "../types";
import { listarClientes, removerCliente } from "../db/clientesRepository";
import { cadastrarCliente } from "../services/cadastroCliente";
import { garantirPermissaoCamera } from "../services/permissoes";

export default function ClientesScreen() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [nome, setNome] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);

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

  async function escolherFotoDaGaleria() {
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });
    if (!resultado.canceled) {
      setFotos((atual) => [...atual, ...resultado.assets.map((a) => a.uri)]);
    }
  }

  async function tirarFoto() {
    const permitido = await garantirPermissaoCamera();
    if (!permitido) {
      Alert.alert("Permissão necessária", "Autorize o uso da câmera para tirar a foto do cliente.");
      return;
    }
    const resultado = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (!resultado.canceled) {
      setFotos((atual) => [...atual, resultado.assets[0].uri]);
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

      {fotos.length > 0 && (
        <FlatList
          horizontal
          data={fotos}
          keyExtractor={(uri) => uri}
          style={estilos.listaFotos}
          renderItem={({ item }) => <Image source={{ uri: item }} style={estilos.miniatura} />}
        />
      )}

      <TouchableOpacity
        style={[estilos.botaoPrimario, salvando && estilos.botaoDesabilitado]}
        onPress={salvar}
        disabled={salvando}
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
              <Text style={estilos.nomeCliente}>{item.nome}</Text>
              <TouchableOpacity onPress={() => confirmarExclusao(item)}>
                <Text style={estilos.linkRemover}>Remover</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
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
  nomeCliente: { flex: 1, fontSize: 15 },
  linkRemover: { color: "#d33", fontWeight: "500" },
});
