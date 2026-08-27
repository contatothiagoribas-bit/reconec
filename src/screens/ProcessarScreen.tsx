import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { VideoAsset, Cliente, ResultadoProcessamento, ConfiguracaoReconhecimento } from "../types";
import { listarClientes } from "../db/clientesRepository";
import { listarVideosDoDispositivo } from "../services/biblioteca";
import { processarVideo } from "../services/videoProcessor";
import { organizarVideo } from "../services/organizador";
import { garantirPermissaoMidia } from "../services/permissoes";

const CONFIG_PADRAO: ConfiguracaoReconhecimento = {
  // 0.5 = mesmo limiar validado no app de referência do modelo (distância euclidiana).
  limiarDistancia: 0.5,
  albumNaoReconhecidos: "Nao_Reconhecidos",
  estrategia: "todas_correspondencias",
};

interface ItemProcessamento {
  video: VideoAsset;
  status: "pendente" | "processando" | "concluido" | "erro";
  albuns?: string[];
  mensagemErro?: string;
}

export default function ProcessarScreen() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [itens, setItens] = useState<ItemProcessamento[]>([]);
  const [carregandoVideos, setCarregandoVideos] = useState(false);
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    listarClientes().then(setClientes);
  }, []);

  async function buscarVideos() {
    setCarregandoVideos(true);
    try {
      const permitido = await garantirPermissaoMidia();
      if (!permitido) {
        Alert.alert("Permissão necessária", "Autorize o acesso à galeria para ler os vídeos.");
        return;
      }
      const videos = await listarVideosDoDispositivo();
      setItens(videos.map((video) => ({ video, status: "pendente" })));
    } finally {
      setCarregandoVideos(false);
    }
  }

  async function processarTodos() {
    if (clientes.length === 0) {
      Alert.alert("Nenhum cliente cadastrado", "Cadastre ao menos um cliente antes de processar vídeos.");
      return;
    }
    setProcessando(true);
    try {
      for (let i = 0; i < itens.length; i++) {
        setItens((atual) =>
          atual.map((item, idx) => (idx === i ? { ...item, status: "processando" } : item))
        );
        try {
          const resultado: ResultadoProcessamento = await processarVideo(itens[i].video, clientes);
          const albuns = await organizarVideo(resultado, CONFIG_PADRAO);
          setItens((atual) =>
            atual.map((item, idx) => (idx === i ? { ...item, status: "concluido", albuns } : item))
          );
        } catch (erro) {
          setItens((atual) =>
            atual.map((item, idx) =>
              idx === i
                ? {
                    ...item,
                    status: "erro",
                    mensagemErro: erro instanceof Error ? erro.message : String(erro),
                  }
                : item
            )
          );
        }
      }
    } finally {
      setProcessando(false);
    }
  }

  return (
    <View style={estilos.container}>
      <Text style={estilos.titulo}>Organizar vídeos por cliente</Text>
      <Text style={estilos.ajuda}>
        {clientes.length} cliente(s) cadastrado(s). Busque os vídeos do celular e depois toque em
        "Processar" para separá-los em álbuns com o nome de cada cliente reconhecido.
      </Text>

      <View style={estilos.linhaBotoes}>
        <TouchableOpacity style={estilos.botaoSecundario} onPress={buscarVideos} disabled={carregandoVideos}>
          <Text style={estilos.textoBotaoSecundario}>
            {carregandoVideos ? "Buscando..." : "Buscar vídeos"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[estilos.botaoPrimario, (processando || itens.length === 0) && estilos.botaoDesabilitado]}
          onPress={processarTodos}
          disabled={processando || itens.length === 0}
        >
          <Text style={estilos.textoBotaoPrimario}>{processando ? "Processando..." : "Processar"}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={itens}
        keyExtractor={(item) => item.video.id}
        ListEmptyComponent={
          <Text style={estilos.vazio}>Nenhum vídeo carregado. Toque em "Buscar vídeos".</Text>
        }
        renderItem={({ item }) => (
          <View style={estilos.linhaVideo}>
            <Text style={estilos.nomeVideo} numberOfLines={1}>
              {item.video.nomeArquivo}
            </Text>
            <Text style={estilos.status}>{descreverStatus(item)}</Text>
          </View>
        )}
      />
    </View>
  );
}

function descreverStatus(item: ItemProcessamento): string {
  switch (item.status) {
    case "pendente":
      return "aguardando";
    case "processando":
      return "analisando...";
    case "concluido":
      return `→ ${item.albuns?.join(", ")}`;
    case "erro":
      return `erro: ${item.mensagemErro}`;
    default:
      return "";
  }
}

const estilos = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  titulo: { fontSize: 18, fontWeight: "600", marginBottom: 4 },
  ajuda: { color: "#666", marginBottom: 12 },
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
  botaoPrimario: {
    flex: 1,
    backgroundColor: "#2f6fed",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  botaoDesabilitado: { opacity: 0.5 },
  textoBotaoPrimario: { color: "#fff", fontWeight: "600" },
  vazio: { color: "#888", fontStyle: "italic", marginTop: 12 },
  linhaVideo: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
    gap: 8,
  },
  nomeVideo: { flex: 1 },
  status: { color: "#555" },
});
