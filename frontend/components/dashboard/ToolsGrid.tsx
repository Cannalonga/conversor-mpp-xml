'use client';

import Link from 'next/link';
import { memo } from 'react';

// Lista das 20 ferramentas com ícones SVG inline (leve, sem dependências)
const tools = [
  { slug: 'mpp-xml', name: 'MPP → XML', icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2', color: 'from-blue-500 to-cyan-500' },
  { slug: 'xml-mpp', name: 'XML → MPP', icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2', color: 'from-cyan-500 to-blue-500' },
  { slug: 'pdf-word', name: 'PDF → Word', icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z', color: 'from-red-500 to-orange-500' },
  { slug: 'word-pdf', name: 'Word → PDF', icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z', color: 'from-blue-600 to-red-500' },
  { slug: 'img-pdf', name: 'IMG → PDF', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', color: 'from-green-500 to-red-500' },
  { slug: 'pdf-img', name: 'PDF → IMG', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', color: 'from-red-500 to-green-500' },
  { slug: 'excel-csv', name: 'Excel → CSV', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'from-green-600 to-emerald-500' },
  { slug: 'csv-excel', name: 'CSV → Excel', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'from-emerald-500 to-green-600' },
  { slug: 'jpg-png', name: 'JPG → PNG', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', color: 'from-yellow-500 to-purple-500' },
  { slug: 'png-jpg', name: 'PNG → JPG', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', color: 'from-purple-500 to-yellow-500' },
  { slug: 'jpg-webp', name: 'JPG → WebP', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', color: 'from-yellow-500 to-teal-500' },
  { slug: 'video-mp4', name: 'Video → MP4', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z', color: 'from-purple-600 to-pink-500' },
  { slug: 'video-gif', name: 'Video → GIF', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z', color: 'from-pink-500 to-orange-500' },
  { slug: 'audio-mp3', name: 'Audio → MP3', icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3', color: 'from-indigo-500 to-purple-600' },
  { slug: 'compress-pdf', name: 'Comprimir PDF', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', color: 'from-red-600 to-red-400' },
  { slug: 'compress-img', name: 'Comprimir IMG', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', color: 'from-green-600 to-green-400' },
  { slug: 'compress-video', name: 'Comprimir Vídeo', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', color: 'from-purple-600 to-purple-400' },
  { slug: 'json-csv', name: 'JSON → CSV', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4', color: 'from-amber-500 to-orange-500' },
  { slug: 'zip-extract', name: 'Extrair ZIP', icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4', color: 'from-slate-600 to-slate-400' },
  { slug: 'merge-pdf', name: 'Juntar PDFs', icon: 'M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'from-red-500 to-rose-600' },
];

interface ToolsGridProps {
  limit?: number;
  showAll?: boolean;
}

function ToolsGrid({ limit = 20, showAll = true }: ToolsGridProps) {
  const displayTools = limit ? tools.slice(0, limit) : tools;

  return (
    <div className="space-y-4">
      {/* Header da seção */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-[#0B5E73]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          Ferramentas de Conversão
        </h2>
        {showAll && (
          <Link 
            href="/#converters" 
            className="text-sm text-[#0B5E73] hover:text-[#0AC9D2] font-medium transition-colors"
          >
            Ver todas →
          </Link>
        )}
      </div>

      {/* Grid de ferramentas */}
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
        {displayTools.map((tool) => (
          <Link
            key={tool.slug}
            href={`/conversor/${tool.slug}`}
            className="group flex flex-col items-center p-3 bg-white rounded-xl border border-gray-200 hover:border-[#0AC9D2] hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
            title={tool.name}
          >
            {/* Ícone com gradiente */}
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tool.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={tool.icon} />
              </svg>
            </div>
            {/* Nome curto */}
            <span className="text-xs text-gray-600 group-hover:text-[#0B5E73] font-medium text-center leading-tight truncate w-full">
              {tool.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Memo para evitar re-renders desnecessários
export default memo(ToolsGrid);

// Export da lista para uso em outros componentes
export { tools };
