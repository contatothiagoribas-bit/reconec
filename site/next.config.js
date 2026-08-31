/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      // @vladmandic/face-api só roda no navegador (reconhecimento facial é
      // client-side, o servidor só guarda arquivo + faz conta de distância).
      // A build "main" do pacote puxa @tensorflow/tfjs-node, que não
      // instalamos de propósito (evita dependência nativa no servidor).
      config.externals = [...(config.externals || []), '@vladmandic/face-api'];
    }
    return config;
  },
};

module.exports = nextConfig;
