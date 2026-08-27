import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar as StatusBarNativo,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import ClientesScreen from "./src/screens/ClientesScreen";
import ProcessarScreen from "./src/screens/ProcessarScreen";

type Aba = "clientes" | "processar";

export default function App() {
  const [aba, setAba] = useState<Aba>("clientes");

  return (
    <SafeAreaView style={estilos.raiz}>
      <StatusBar style="auto" />
      <View style={estilos.cabecalho}>
        <Text style={estilos.titulo}>Reconec</Text>
      </View>
      <View style={estilos.conteudo}>{aba === "clientes" ? <ClientesScreen /> : <ProcessarScreen />}</View>
      <View style={estilos.tabs}>
        <TouchableOpacity style={estilos.tab} onPress={() => setAba("clientes")}>
          <Text style={[estilos.textoTab, aba === "clientes" && estilos.textoTabAtiva]}>Clientes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={estilos.tab} onPress={() => setAba("processar")}>
          <Text style={[estilos.textoTab, aba === "processar" && estilos.textoTabAtiva]}>
            Processar vídeos
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: "#fff" },
  cabecalho: {
    paddingHorizontal: 16,
    // No Android, o SafeAreaView do React Native não afasta a barra de status
    // sozinho — soma manualmente a altura dela pra não ficar por baixo do relógio.
    paddingTop: (Platform.OS === "android" ? StatusBarNativo.currentHeight ?? 24 : 0) + 8,
    paddingBottom: 4,
  },
  titulo: { fontSize: 22, fontWeight: "700" },
  conteudo: { flex: 1 },
  tabs: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
    // Mesma lógica no rodapé: afasta as abas da barra de gestos/botões do Android.
    paddingBottom: Platform.OS === "android" ? 16 : 0,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  textoTab: { color: "#888", fontWeight: "500" },
  textoTabAtiva: { color: "#2f6fed" },
});
