import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CannaConvert - Conversores de Arquivos Online',
  description: 'Converta arquivos MPP, PDF, vídeos e imagens de forma rápida e profissional. 20+ conversores disponíveis.',
  keywords: ['conversor', 'mpp', 'xml', 'pdf', 'video', 'imagem', 'cannaconvert'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
