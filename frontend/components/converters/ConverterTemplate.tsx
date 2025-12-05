'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import NotificationBox from '@/components/ui/NotificationBox';
import FeatureCard from '@/components/ui/FeatureCard';

// =============================================================================
// TEMPLATE BASE PARA TODOS OS CONVERSORES
// =============================================================================
// Como usar:
// 1. Copie este arquivo para frontend/app/conversor/[slug]/page.tsx
// 2. Ou crie páginas individuais importando o ConverterTemplate
// =============================================================================

interface ConverterConfig {
  slug: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  fromFormat: string;
  toFormat: string;
  acceptedTypes: string;
  maxFileSize: number; // em MB
  features: string[];
  apiEndpoint: string;
}

interface ConverterTemplateProps {
  config: ConverterConfig;
}

// Lista dos 20 conversores para sugestões
const allConverters = [
  { slug: 'mpp-xml', title: 'MPP para XML', icon: '📊' },
  { slug: 'xml-mpp', title: 'XML para MPP', icon: '📊' },
  { slug: 'pdf-word', title: 'PDF para Word', icon: '📄' },
  { slug: 'word-pdf', title: 'Word para PDF', icon: '📄' },
  { slug: 'img-pdf', title: 'Imagem para PDF', icon: '🖼️' },
  { slug: 'pdf-img', title: 'PDF para Imagem', icon: '🖼️' },
  { slug: 'excel-csv', title: 'Excel para CSV', icon: '📈' },
  { slug: 'csv-excel', title: 'CSV para Excel', icon: '📈' },
  { slug: 'jpg-png', title: 'JPG para PNG', icon: '🎨' },
  { slug: 'png-jpg', title: 'PNG para JPG', icon: '🎨' },
  { slug: 'jpg-webp', title: 'JPG para WebP', icon: '🌐' },
  { slug: 'video-mp4', title: 'Vídeo para MP4', icon: '🎬' },
  { slug: 'video-gif', title: 'Vídeo para GIF', icon: '🎞️' },
  { slug: 'audio-mp3', title: 'Áudio para MP3', icon: '🎵' },
  { slug: 'compress-pdf', title: 'Comprimir PDF', icon: '📦' },
  { slug: 'compress-img', title: 'Comprimir Imagem', icon: '📦' },
  { slug: 'compress-video', title: 'Comprimir Vídeo', icon: '📦' },
  { slug: 'json-csv', title: 'JSON para CSV', icon: '🔄' },
  { slug: 'zip-extract', title: 'Extrair ZIP', icon: '📁' },
  { slug: 'merge-pdf', title: 'Juntar PDFs', icon: '📚' },
];

export default function ConverterTemplate({ config }: ConverterTemplateProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Outros conversores para sugestões (excluindo o atual)
  const suggestedConverters = allConverters.filter(c => c.slug !== config.slug).slice(0, 6);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  }, []);

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);
    setDownloadUrl(null);

    // Validar tamanho
    if (selectedFile.size > config.maxFileSize * 1024 * 1024) {
      setError(`Arquivo muito grande. Máximo permitido: ${config.maxFileSize}MB`);
      return;
    }

    setFile(selectedFile);
  };

  const handleConvert = async () => {
    if (!file) return;

    setIsConverting(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simular progresso (em produção, usar eventos de progresso reais)
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_PROXY || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}${config.apiEndpoint}`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error('Erro na conversão');
      }

      const data = await response.json();
      setProgress(100);
      setDownloadUrl(data.downloadUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao converter arquivo');
    } finally {
      setIsConverting(false);
    }
  };

  const resetConverter = () => {
    setFile(null);
    setProgress(0);
    setError(null);
    setDownloadUrl(null);
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ============== AD PLACEHOLDER - TOP ============== */}
        <div className="mb-8 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-4 text-center">
          <span className="text-gray-400 text-sm">📢 Espaço para Anúncio - Banner 728x90</span>
        </div>

        {/* Header da Ferramenta */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#0B5E73] to-[#0AC9D2] rounded-2xl text-4xl mb-4 shadow-lg">
            {config.icon}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#0F1724] mb-3">
            {config.title}
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {config.description}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Coluna Principal - Upload e Conversão */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upload Box */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300
                  ${isDragging 
                    ? 'border-[#0AC9D2] bg-[#0AC9D2]/5' 
                    : 'border-gray-300 hover:border-[#0B5E73] hover:bg-gray-50'
                  }
                  ${file ? 'bg-green-50 border-green-300' : ''}
                `}
              >
                <input
                  type="file"
                  accept={config.acceptedTypes}
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isConverting}
                />

                {!file ? (
                  <>
                    <div className="w-16 h-16 bg-gradient-to-br from-[#0B5E73]/10 to-[#0AC9D2]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-[#0B5E73]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium text-gray-700 mb-1">
                      Arraste seu arquivo aqui
                    </p>
                    <p className="text-gray-500 mb-4">
                      ou <span className="text-[#0B5E73] font-medium">clique para selecionar</span>
                    </p>
                    <p className="text-sm text-gray-400">
                      Formatos aceitos: {config.fromFormat} • Máx: {config.maxFileSize}MB
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium text-gray-800 mb-1">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {!isConverting && !downloadUrl && (
                      <button
                        onClick={resetConverter}
                        className="mt-3 text-sm text-red-500 hover:text-red-600"
                      >
                        Remover arquivo
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Progress Bar */}
              {isConverting && (
                <div className="mt-6">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Convertendo...</span>
                    <span className="font-medium text-[#0B5E73]">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-[#0B5E73] to-[#0AC9D2] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <NotificationBox variant="error" className="mt-4">
                  {error}
                </NotificationBox>
              )}

              {/* Download Button */}
              {downloadUrl && (
                <div className="mt-6 text-center">
                  <NotificationBox variant="success" className="mb-4">
                    Arquivo convertido com sucesso!
                  </NotificationBox>
                  <a
                    href={downloadUrl}
                    download
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#16A34A] to-[#22C55E] text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Baixar Arquivo Convertido
                  </a>
                  <button
                    onClick={resetConverter}
                    className="block mx-auto mt-4 text-sm text-[#0B5E73] hover:underline"
                  >
                    Converter outro arquivo
                  </button>
                </div>
              )}

              {/* Convert Button */}
              {file && !isConverting && !downloadUrl && (
                <button
                  onClick={handleConvert}
                  className="w-full mt-6 py-4 bg-gradient-to-r from-[#0B5E73] to-[#0AC9D2] hover:from-[#094a5c] hover:to-[#09b5bd] text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Converter para {config.toFormat}
                </button>
              )}
            </div>

            {/* Features */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-xl font-bold text-[#0F1724] mb-4">Recursos</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {config.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-gray-700">
                    <svg className="w-5 h-5 text-[#16A34A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            {/* ============== AD PLACEHOLDER - MID ============== */}
            <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
              <span className="text-gray-400 text-sm">📢 Espaço para Anúncio - Retângulo 300x250</span>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* ============== AD PLACEHOLDER - SIDEBAR ============== */}
            <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-4 text-center">
              <span className="text-gray-400 text-sm">📢 Anúncio Sidebar</span>
            </div>

            {/* Outros Conversores */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="font-bold text-[#0F1724] mb-4">Outras Ferramentas</h3>
              <div className="space-y-2">
                {suggestedConverters.map((converter) => (
                  <Link
                    key={converter.slug}
                    href={`/conversor/${converter.slug}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <span className="text-2xl">{converter.icon}</span>
                    <span className="text-gray-700 group-hover:text-[#0B5E73] font-medium">
                      {converter.title}
                    </span>
                    <svg className="w-4 h-4 text-gray-400 ml-auto group-hover:text-[#0AC9D2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
              <Link
                href="/#converters"
                className="block text-center text-sm text-[#0B5E73] hover:underline mt-4"
              >
                Ver todos os conversores →
              </Link>
            </div>
          </div>
        </div>

        {/* LGPD & Security Section */}
        <div className="mt-12">
          <NotificationBox variant="lgpd" title="Privacidade e Segurança">
            <ul className="space-y-1 mt-2">
              <li>• Não armazenamos arquivos enviados após a conversão</li>
              <li>• Todos os dados são criptografados em trânsito (TLS 1.3)</li>
              <li>• Arquivos são excluídos automaticamente após 1 hora</li>
              <li>• Em conformidade com a LGPD (Lei Geral de Proteção de Dados)</li>
            </ul>
            <Link href="/privacy" className="text-purple-600 hover:underline text-sm mt-2 inline-block">
              Ler Política de Privacidade →
            </Link>
          </NotificationBox>
        </div>

        {/* ============== AD PLACEHOLDER - FOOTER ============== */}
        <div className="mt-8 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-4 text-center">
          <span className="text-gray-400 text-sm">📢 Espaço para Anúncio - Banner 728x90</span>
        </div>
      </div>
    </AppLayout>
  );
}

// =============================================================================
// EXPORTS DE CONFIGURAÇÕES PRÉ-DEFINIDAS
// =============================================================================

export const converterConfigs: Record<string, ConverterConfig> = {
  'mpp-xml': {
    slug: 'mpp-xml',
    title: 'Converter MPP para XML',
    description: 'Converta arquivos do Microsoft Project (.mpp) para XML de forma rápida e segura. Ideal para integração com outros sistemas.',
    icon: <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    fromFormat: '.mpp',
    toFormat: 'XML',
    acceptedTypes: '.mpp',
    maxFileSize: 50,
    features: [
      'Conversão instantânea',
      'Preserva estrutura do projeto',
      'Mantém tarefas e recursos',
      'Exporta cronograma completo',
      'Compatível com MS Project 2007+',
      'Download imediato',
    ],
    apiEndpoint: '/api/convert/mpp-xml',
  },
  'xml-mpp': {
    slug: 'xml-mpp',
    title: 'Converter XML para MPP',
    description: 'Converta arquivos XML para Microsoft Project (.mpp). Perfeito para importar dados de outros sistemas.',
    icon: <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    fromFormat: '.xml',
    toFormat: 'MPP',
    acceptedTypes: '.xml',
    maxFileSize: 50,
    features: [
      'Importação de XML MS Project',
      'Recria estrutura do projeto',
      'Preserva hierarquia de tarefas',
      'Mantém datas e durações',
      'Suporte a recursos',
      'Gera arquivo MPP válido',
    ],
    apiEndpoint: '/api/convert/xml-mpp',
  },
  'pdf-word': {
    slug: 'pdf-word',
    title: 'Converter PDF para Word',
    description: 'Converta documentos PDF para Word (.docx) mantendo a formatação original. Edite facilmente após a conversão.',
    icon: <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    fromFormat: '.pdf',
    toFormat: 'DOCX',
    acceptedTypes: '.pdf',
    maxFileSize: 100,
    features: [
      'Preserva formatação',
      'Mantém imagens e tabelas',
      'Reconhecimento de texto (OCR)',
      'Fontes preservadas',
      'Edição facilitada',
      'Alta precisão',
    ],
    apiEndpoint: '/api/convert/pdf-word',
  },
  'pdf-jpg': {
    slug: 'pdf-jpg',
    title: 'Converter PDF para JPG',
    description: 'Converta páginas de PDF para imagens JPG de alta qualidade. Ideal para compartilhar e visualizar.',
    icon: <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    fromFormat: '.pdf',
    toFormat: 'JPG',
    acceptedTypes: '.pdf',
    maxFileSize: 100,
    features: ['Alta qualidade', 'Todas as páginas', 'Resolução configurável', 'Download em ZIP', 'Rápido processamento', 'Cores preservadas'],
    apiEndpoint: '/api/convert/pdf-jpg',
  },
  'jpg-pdf': {
    slug: 'jpg-pdf',
    title: 'Converter JPG para PDF',
    description: 'Converta imagens JPG para documentos PDF. Combine várias imagens em um único documento.',
    icon: <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    fromFormat: '.jpg,.jpeg,.png',
    toFormat: 'PDF',
    acceptedTypes: '.jpg,.jpeg,.png',
    maxFileSize: 50,
    features: ['Múltiplas imagens', 'Ordem personalizável', 'Tamanho A4 ou original', 'Alta qualidade', 'Compressão otimizada', 'Rápido'],
    apiEndpoint: '/api/convert/jpg-pdf',
  },
  'png-jpg': {
    slug: 'png-jpg',
    title: 'Converter PNG para JPG',
    description: 'Converta imagens PNG para JPG com compressão otimizada. Reduza o tamanho do arquivo.',
    icon: <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    fromFormat: '.png',
    toFormat: 'JPG',
    acceptedTypes: '.png',
    maxFileSize: 25,
    features: ['Compressão ajustável', 'Remove transparência', 'Cor de fundo configurável', 'Alta qualidade', 'Rápido processamento', 'Lote suportado'],
    apiEndpoint: '/api/convert/png-jpg',
  },
  'jpg-webp': {
    slug: 'jpg-webp',
    title: 'Converter JPG para WebP',
    description: 'Converta JPG para WebP para melhor compressão web. Ideal para sites e aplicativos.',
    icon: <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>,
    fromFormat: '.jpg,.jpeg,.png',
    toFormat: 'WebP',
    acceptedTypes: '.jpg,.jpeg,.png',
    maxFileSize: 25,
    features: ['Compressão superior', 'Transparência suportada', 'Otimizado para web', 'Menor tamanho', 'Alta qualidade', 'SEO otimizado'],
    apiEndpoint: '/api/convert/jpg-webp',
  },
  'video-mp4': {
    slug: 'video-mp4',
    title: 'Converter Vídeo para MP4',
    description: 'Converta vídeos de qualquer formato para MP4. Compatível com todos os dispositivos.',
    icon: <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
    fromFormat: '.avi,.mkv,.mov,.wmv,.flv',
    toFormat: 'MP4',
    acceptedTypes: '.avi,.mkv,.mov,.wmv,.flv,.webm,.m4v',
    maxFileSize: 500,
    features: ['Compatibilidade universal', 'Qualidade preservada', 'Codec H.264', 'Áudio AAC', 'Metadados mantidos', 'Rápido processamento'],
    apiEndpoint: '/api/convert/video-mp4',
  },
  'video-whatsapp': {
    slug: 'video-whatsapp',
    title: 'Otimizar Vídeo para WhatsApp',
    description: 'Comprima e otimize vídeos para envio no WhatsApp. Até 16MB ou menos.',
    icon: <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
    fromFormat: '.mp4,.avi,.mkv,.mov',
    toFormat: 'MP4',
    acceptedTypes: '.mp4,.avi,.mkv,.mov,.webm',
    maxFileSize: 100,
    features: ['Limite 16MB', 'Qualidade otimizada', 'Resolução ajustada', 'Compressão inteligente', 'Preview antes', 'Rápido envio'],
    apiEndpoint: '/api/convert/video-whatsapp',
  },
  'image-whatsapp': {
    slug: 'image-whatsapp',
    title: 'Otimizar Imagem para WhatsApp',
    description: 'Comprima imagens para compartilhar no WhatsApp sem perder qualidade visual.',
    icon: <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
    fromFormat: '.jpg,.jpeg,.png,.webp',
    toFormat: 'JPG',
    acceptedTypes: '.jpg,.jpeg,.png,.webp',
    maxFileSize: 25,
    features: ['Compressão otimizada', 'Qualidade preservada', 'Tamanho reduzido', 'Dimensões ajustadas', 'Cores mantidas', 'Envio rápido'],
    apiEndpoint: '/api/convert/image-whatsapp',
  },
  'pdf-compress': {
    slug: 'pdf-compress',
    title: 'Comprimir PDF',
    description: 'Reduza o tamanho de arquivos PDF mantendo a qualidade. Ideal para e-mail e compartilhamento.',
    icon: <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
    fromFormat: '.pdf',
    toFormat: 'PDF',
    acceptedTypes: '.pdf',
    maxFileSize: 200,
    features: ['Até 90% menor', 'Qualidade preservada', 'Texto legível', 'Imagens otimizadas', 'Links mantidos', 'Múltiplos níveis'],
    apiEndpoint: '/api/convert/pdf-compress',
  },
  'excel-csv': {
    slug: 'excel-csv',
    title: 'Converter Excel para CSV',
    description: 'Converta planilhas Excel (.xlsx, .xls) para formato CSV universal.',
    icon: <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    fromFormat: '.xlsx,.xls',
    toFormat: 'CSV',
    acceptedTypes: '.xlsx,.xls',
    maxFileSize: 50,
    features: ['Todas as abas', 'Encoding UTF-8', 'Delimitador configurável', 'Cabeçalho preservado', 'Dados limpos', 'Download individual'],
    apiEndpoint: '/api/convert/excel-csv',
  },
  'json-csv': {
    slug: 'json-csv',
    title: 'Converter JSON para CSV',
    description: 'Converta arquivos JSON para CSV. Ideal para análise de dados e importação.',
    icon: <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>,
    fromFormat: '.json',
    toFormat: 'CSV',
    acceptedTypes: '.json',
    maxFileSize: 25,
    features: ['Arrays suportados', 'Objetos aninhados', 'Colunas automáticas', 'UTF-8 encoding', 'Preview disponível', 'Dados formatados'],
    apiEndpoint: '/api/convert/json-csv',
  },
  'word-pdf': {
    slug: 'word-pdf',
    title: 'Converter Word para PDF',
    description: 'Converta documentos Word (.docx, .doc) para PDF preservando toda a formatação.',
    icon: <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    fromFormat: '.docx,.doc',
    toFormat: 'PDF',
    acceptedTypes: '.docx,.doc',
    maxFileSize: 100,
    features: ['Formatação mantida', 'Fontes preservadas', 'Imagens incluídas', 'Links funcionais', 'Índice preservado', 'Alta fidelidade'],
    apiEndpoint: '/api/convert/word-pdf',
  },
  'ppt-pdf': {
    slug: 'ppt-pdf',
    title: 'Converter PowerPoint para PDF',
    description: 'Converta apresentações PowerPoint para PDF. Ideal para compartilhamento.',
    icon: <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 13v-1m4 1v-3m4 3V8M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>,
    fromFormat: '.pptx,.ppt',
    toFormat: 'PDF',
    acceptedTypes: '.pptx,.ppt',
    maxFileSize: 100,
    features: ['Slides preservados', 'Animações removidas', 'Notas incluídas', 'Alta resolução', 'Links mantidos', 'Compactado'],
    apiEndpoint: '/api/convert/ppt-pdf',
  },
  'video-reels': {
    slug: 'video-reels',
    title: 'Converter para Reels/Shorts',
    description: 'Otimize vídeos para Instagram Reels e YouTube Shorts. Formato vertical 9:16.',
    icon: <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
    fromFormat: '.mp4,.avi,.mov',
    toFormat: 'MP4',
    acceptedTypes: '.mp4,.avi,.mov,.mkv,.webm',
    maxFileSize: 200,
    features: ['Formato 9:16', 'Até 90 segundos', 'Qualidade HD', 'Corte inteligente', 'Áudio otimizado', 'Preview antes'],
    apiEndpoint: '/api/convert/video-reels',
  },
  'video-tiktok': {
    slug: 'video-tiktok',
    title: 'Converter para TikTok',
    description: 'Otimize vídeos para TikTok. Formato, duração e qualidade ideais.',
    icon: <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>,
    fromFormat: '.mp4,.avi,.mov',
    toFormat: 'MP4',
    acceptedTypes: '.mp4,.avi,.mov,.mkv,.webm',
    maxFileSize: 200,
    features: ['Formato vertical', 'Até 10 minutos', 'Alta qualidade', 'Tamanho otimizado', 'Áudio preservado', 'Marca d\'água livre'],
    apiEndpoint: '/api/convert/video-tiktok',
  },
  'pdf-merge': {
    slug: 'pdf-merge',
    title: 'Juntar PDFs',
    description: 'Combine múltiplos arquivos PDF em um único documento. Organize a ordem facilmente.',
    icon: <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>,
    fromFormat: '.pdf',
    toFormat: 'PDF',
    acceptedTypes: '.pdf',
    maxFileSize: 100,
    features: ['Até 20 arquivos', 'Ordem personalizável', 'Páginas selecionáveis', 'Preview antes', 'Compressão opcional', 'Metadados preservados'],
    apiEndpoint: '/api/convert/pdf-merge',
  },
  'pdf-split': {
    slug: 'pdf-split',
    title: 'Dividir PDF',
    description: 'Divida um PDF em múltiplos arquivos. Extraia páginas específicas.',
    icon: <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>,
    fromFormat: '.pdf',
    toFormat: 'PDF',
    acceptedTypes: '.pdf',
    maxFileSize: 200,
    features: ['Por páginas', 'Por intervalo', 'Extração individual', 'Download em ZIP', 'Preview páginas', 'Rápido processamento'],
    apiEndpoint: '/api/convert/pdf-split',
  },
  'heic-jpg': {
    slug: 'heic-jpg',
    title: 'Converter HEIC para JPG',
    description: 'Converta fotos HEIC do iPhone para JPG universal. Compatível com todos os dispositivos.',
    icon: <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    fromFormat: '.heic,.heif',
    toFormat: 'JPG',
    acceptedTypes: '.heic,.heif',
    maxFileSize: 50,
    features: ['Alta qualidade', 'EXIF preservado', 'Cores mantidas', 'Conversão em lote', 'Compatibilidade universal', 'Rápido processamento'],
    apiEndpoint: '/api/convert/heic-jpg',
  },
};
