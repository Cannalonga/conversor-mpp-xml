/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy rewrite to avoid HTTPS localhost issues (HSTS bypass)
  // Uses 127.0.0.1 instead of localhost to prevent browser SSL forcing
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_PROXY || 'http://127.0.0.1:3001'}/:path*`,
      },
    ];
  },
  
  // Configurações de imagem
  images: {
    domains: ['localhost', '127.0.0.1'],
  },
  
  // Desabilitar strict mode em dev para evitar double renders
  reactStrictMode: true,
  
  // Configuração de output para produção
  output: 'standalone',
};

module.exports = nextConfig;
