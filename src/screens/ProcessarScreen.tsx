import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { VideoAsset, Cliente, ResultadoProcessamento, ConfiguracaoReconhecimento } from "../types";
import { listarClientes } from "../db/clientesRepository";
import { selecionarVideosDoDispositivo } from "../services/biblioteca";
import { processarVideo } from "../services/videoProcessor";
import { organizarVideo } from "../services/organizador";
import { descreverDiagnostico } from "../services/decisao";
import { garantirPermissaoGaleria, garantirPermissaoMidia } from "../services/permissoes";

const CONFIG_PADRAO: ConfiguracaoReconhecimento = {
  // 0.5 era o limiar do app de referência do modelo, mas foi calibrado pra um
  // alinhamento de rosto completo (5 pontos); com o alinhamento pelos 2 olhos
  // que este app usa, matches genuínos e nítidos testados na prática deram
  // 0.65-0.84 de distância — 0.5 rejeitaria até esses. 0.9 mantém folga acima
  // desses matches confirmados e abaixo dos casos de rosto pequeno/borrado/de
  // perfil observados (1.15+), que continuam sendo rejeitados como deveriam.
  limiarDistancia: 0.9,
  albumNaoReconhecidos: "Nao_Reconhecidos",
  estrategia: "todas_correspondencias",
};

interface ItemProcessamento {
  video: VideoAsset;
  status: "pendente" | "processando" | "concluido" | "erro";
  progresso?: { atual: number; total: number };
  /** Presente quando o vídeo foi de fato organizado (movido pro álbum do cliente). */
  albuns?: string[];
  /** Presente no modo teste (sem organizar) — resultado do reconhecimento, sem mover nada. */
  resultadoTeste?: "reconhecido" | "nao_reconhecido";
  diagnostico?: string;
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

  async function selecionarVideos() {
    setCarregandoVideos(true);
    try {
      const permitido = await garantirPermissaoGaleria();
      if (!permitido) {
        Alert.alert("Permissão necessária", "Autorize o acesso à galeria para escolher os vídeos.");
        return;
      }
      const videos = await selecionarVideosDoDispositivo();
      if (videos.length === 0) return;

      // Acumula com o que já tinha sido escolhido antes (dá pra selecionar aos
      // poucos, em várias idas à galeria, em vez de tudo de uma vez só) — sem
      // duplicar um vídeo que já estava na lista.
      setItens((atual) => {
        const idsExistentes = new Set(atual.map((item) => item.video.id));
        const novos = videos
          .filter((video) => !idsExistentes.has(video.id))
          .map((video): ItemProcessamento => ({ video, status: "pendente" }));
        return [...atual, ...novos];
      });
    } finally {
      setCarregandoVideos(false);
    }
  }

  function limparSelecao() {
    setItens([]);
  }

  /**
   * Roda o reconhecimento em todos os vídeos selecionados. No modo teste (`organizar:
   * false`) NADA é movido na Galeria — só mostra o resultado, pra dar pra rodar
   * quantas vezes precisar (ajustando cadastro, limiar etc.) sem precisar
   * reselecionar os vídeos toda vez porque já foram organizados/movidos.
   */
  async function executar(organizar: boolean) {
    if (clientes.length === 0) {
      Alert.alert("Nenhum cliente cadastrado", "Cadastre ao menos um cliente antes de processar vídeos.");
      return;
    }
    if (organizar) {
      // Permissão separada da usada no seletor: essa aqui é a que permite criar
      // os álbuns por cliente na Galeria (escrita), não só ler os vídeos. No modo
      // teste isso não é necessário, já que nada é movido.
      const permitido = await garantirPermissaoMidia();
      if (!permitido) {
        Alert.alert("Permissão necessária", "Autorize o acesso à galeria para criar os álbuns organizados.");
        return;
      }
    }
    setProcessando(true);
    try {
      for (let i = 0; i < itens.length; i++) {
        setItens((atual) =>
          atual.map((item, idx) => (idx === i ? { ...item, status: "processando" } : item))
        );
        try {
          const resultado: ResultadoProcessamento = await processarVideo(
            itens[i].video,
            clientes,
            (atualFrame, totalFrames) => {
              setItens((atual) =>
                atual.map((item, idx) =>
                  idx === i ? { ...item, progresso: { atual: atualFrame, total: totalFrames } } : item
                )
              );
            },
            CONFIG_PADRAO.limiarDistancia
          );
          if (resultado.status === "erro") {
            throw new Error(resultado.mensagemErro ?? "Não foi possível processar o vídeo.");
          }
          // Extraído numa constante à parte: o TypeScript não propaga o estreitamento
          // de `resultado.status` (feito acima) pra dentro dos closures do `setItens` abaixo.
          const statusReconhecimento = resultado.status;
          // Quando nenhum frame pôde ser lido, avisoLeitura já explica o motivo real —
          // melhor que "nenhum rosto detectado nos frames analisados" (que sugeriria
          // que os frames foram analisados e ninguém apareceu, não é o caso).
          const diagnosticoBase = resultado.avisoLeitura ?? descreverDiagnostico(resultado.clientesReconhecidos);
          if (organizar) {
            const { albuns, aviso } = await organizarVideo(resultado, CONFIG_PADRAO);
            const diagnostico = aviso ? `${diagnosticoBase} — atenção: ${aviso}` : diagnosticoBase;
            setItens((atual) =>
              atual.map((item, idx) =>
                idx === i
                  ? { ...item, status: "concluido", albuns, resultadoTeste: undefined, diagnostico }
                  : item
              )
            );
          } else {
            setItens((atual) =>
              atual.map((item, idx) =>
                idx === i
                  ? {
                      ...item,
                      status: "concluido",
                      albuns: undefined,
                      resultadoTeste: statusReconhecimento,
                      diagnostico: diagnosticoBase,
                    }
                  : item
              )
            );
          }
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
        {clientes.length} cliente(s) cadastrado(s). {itens.length} vídeo(s) selecionado(s). Toque em
        "Selecionar vídeos" quantas vezes precisar pra ir juntando os vídeos. "Testar" mostra o
        reconhecimento sem mover nada na Galeria — dá pra rodar quantas vezes precisar nos mesmos
        vídeos. "Processar" faz valer, movendo os vídeos pros álbuns.
      </Text>

      <View style={estilos.linhaBotoes}>
        <TouchableOpacity
          style={estilos.botaoSecundario}
          onPress={selecionarVideos}
          disabled={carregandoVideos || processando}
        >
          <Text style={estilos.textoBotaoSecundario}>
            {carregandoVideos ? "Abrindo..." : "Selecionar vídeos"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[estilos.botaoSecundario, (processando || itens.length === 0) && estilos.botaoDesabilitado]}
          onPress={() => executar(false)}
          disabled={processando || itens.length === 0}
        >
          <Text style={estilos.textoBotaoSecundario}>{processando ? "..." : "Testar"}</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[estilos.botaoPrimario, (processando || itens.length === 0) && estilos.botaoDesabilitado]}
        onPress={() => executar(true)}
        disabled={processando || itens.length === 0}
      >
        <Text style={estilos.textoBotaoPrimario}>
          {processando ? "Processando..." : "Processar (mover pros álbuns)"}
        </Text>
      </TouchableOpacity>

      {itens.length > 0 && !processando && (
        <TouchableOpacity onPress={limparSelecao} style={estilos.linkLimpar}>
          <Text style={estilos.textoLinkLimpar}>Limpar seleção</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={itens}
        keyExtractor={(item) => item.video.id}
        ListEmptyComponent={
          <Text style={estilos.vazio}>Nenhum vídeo selecionado. Toque em "Selecionar vídeos".</Text>
        }
        renderItem={({ item }) => (
          <View style={estilos.linhaVideo}>
            <View style={estilos.linhaPrincipal}>
              <Text style={estilos.nomeVideo} numberOfLines={1}>
                {item.video.nomeArquivo}
              </Text>
              <Text style={estilos.status}>{descreverStatus(item)}</Text>
            </View>
            {item.diagnostico && <Text style={estilos.diagnostico}>{item.diagnostico}</Text>}
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
      return item.progresso
        ? `analisando frame ${item.progresso.atual}/${item.progresso.total}...`
        : "analisando...";
    case "concluido":
      if (item.albuns) {
        return `→ ${item.albuns.join(", ")}`;
      }
      return item.resultadoTeste === "reconhecido"
        ? "teste: reconhecido (nada foi movido)"
        : "teste: não reconhecido (nada foi movido)";
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
  linhaBotoes: { flexDirection: "row", gap: 8, marginBottom: 8 },
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
    backgroundColor: "#2f6fed",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 8,
  },
  botaoDesabilitado: { opacity: 0.5 },
  textoBotaoPrimario: { color: "#fff", fontWeight: "600" },
  linkLimpar: { alignSelf: "flex-end", marginBottom: 8 },
  textoLinkLimpar: { color: "#d33", fontSize: 13 },
  vazio: { color: "#888", fontStyle: "italic", marginTop: 12 },
  linhaVideo: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  linhaPrincipal: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  nomeVideo: { flex: 1 },
  status: { color: "#555" },
  diagnostico: { color: "#999", fontSize: 12, marginTop: 2 },
});
