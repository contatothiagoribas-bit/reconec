const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// O modelo de reconhecimento facial (.tflite) precisa ser tratado como asset
// binário pelo Metro, assim como imagens e fontes. Exigido pelo react-native-fast-tflite.
config.resolver.assetExts.push("tflite");

module.exports = config;
