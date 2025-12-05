'use client';

import Link from 'next/link';
import { useState } from 'react';

// 20 ferramentas conforme especificado
const converters = [
  // Documentos
  { id: 'docx-to-pdf', name: 'DOCX → PDF', description: 'Converta Word para PDF mantendo formatação.', category: 'Documentos', icon: 'DOC', color: 'bg-blue-100 text-blue-600' },
  { id: 'pdf-compress', name: 'PDF Compress', description: 'Reduza o tamanho de PDFs sem perder qualidade.', category: 'Documentos', icon: 'PDF', color: 'bg-red-100 text-red-600' },
  { id: 'excel-to-csv', name: 'Excel → CSV', description: 'Converta planilhas Excel para CSV.', category: 'Documentos', icon: 'XLS', color: 'bg-green-100 text-green-600' },
  { id: 'json-to-csv', name: 'JSON → CSV', description: 'Transforme dados JSON em planilhas CSV.', category: 'Documentos', icon: 'JSON', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'mpp-to-xml', name: 'MPP → XML', description: 'Converta projetos MS Project para XML.', category: 'Documentos', icon: 'MPP', color: 'bg-purple-100 text-purple-600' },
  { id: 'xml-to-mpp', name: 'XML → MPP', description: 'Importe XML de volta para MS Project.', category: 'Documentos', icon: 'XML', color: 'bg-indigo-100 text-indigo-600' },
  { id: 'pdf-to-image', name: 'PDF → Imagem', description: 'Extraia páginas de PDF como imagens.', category: 'Documentos', icon: 'IMG', color: 'bg-pink-100 text-pink-600' },
  { id: 'image-to-pdf', name: 'Imagem → PDF', description: 'Combine imagens em um único PDF.', category: 'Documentos', icon: 'PDF', color: 'bg-red-100 text-red-600' },
  
  // Imagens
  { id: 'png-to-jpg', name: 'PNG → JPG', description: 'Converta PNG para JPG com qualidade ajustável.', category: 'Imagens', icon: 'JPG', color: 'bg-amber-100 text-amber-600' },
  { id: 'jpg-to-webp', name: 'JPG → WebP', description: 'Otimize imagens com formato WebP moderno.', category: 'Imagens', icon: 'WEBP', color: 'bg-cyan-100 text-cyan-600' },
  { id: 'image-optimize-whatsapp', name: 'Otimizar WhatsApp', description: 'Comprima imagens para envio no WhatsApp.', category: 'Imagens', icon: 'WPP', color: 'bg-green-100 text-green-600' },
  { id: 'image-resize', name: 'Redimensionar', description: 'Redimensione imagens para qualquer tamanho.', category: 'Imagens', icon: 'SIZE', color: 'bg-teal-100 text-teal-600' },
  
  // Vídeos
  { id: 'video-to-mp4', name: 'Vídeo → MP4', description: 'Converta qualquer vídeo para MP4 universal.', category: 'Vídeos', icon: 'MP4', color: 'bg-violet-100 text-violet-600' },
  { id: 'video-compress-whatsapp', name: 'Vídeo WhatsApp', description: 'Comprima vídeos para status do WhatsApp.', category: 'Vídeos', icon: 'WPP', color: 'bg-green-100 text-green-600' },
  { id: 'video-to-instagram', name: 'Vídeo Instagram', description: 'Otimize vídeos para Reels e Stories.', category: 'Vídeos', icon: 'IG', color: 'bg-gradient-to-br from-purple-100 to-pink-100 text-pink-600' },
  { id: 'video-to-tiktok', name: 'Vídeo TikTok', description: 'Formate vídeos para TikTok (9:16).', category: 'Vídeos', icon: 'TT', color: 'bg-slate-100 text-slate-700' },
  
  // Outros
  { id: 'zip-extract', name: 'Extrair ZIP', description: 'Descompacte arquivos ZIP com facilidade.', category: 'Outros', icon: 'ZIP', color: 'bg-orange-100 text-orange-600' },
  { id: 'zip-to-xml', name: 'ZIP → XML', description: 'Extraia arquivos XML de pacotes ZIP.', category: 'Outros', icon: 'XML', color: 'bg-indigo-100 text-indigo-600' },
  { id: 'ocr-pdf', name: 'OCR em PDF', description: 'Extraia texto de PDFs escaneados.', category: 'Outros', icon: 'OCR', color: 'bg-sky-100 text-sky-600' },
  { id: 'watermark', name: 'Marca d\'água', description: 'Adicione marca d\'água em imagens e PDFs.', category: 'Outros', icon: 'WM', color: 'bg-gray-100 text-gray-600' },
];

const categories = ['Todos', 'Documentos', 'Imagens', 'Vídeos', 'Outros'];

export default function ToolsGrid() {
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConverters = converters.filter(converter => {
    const matchesCategory = activeCategory === 'Todos' || converter.category === activeCategory;
    const matchesSearch = converter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         converter.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <section id="conversores" className="py-16 md:py-24 bg-[#F7F9FB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-10">
          <span className="inline-block px-4 py-1.5 bg-[#FF7A59]/10 text-[#FF7A59] text-sm font-semibold rounded-full mb-4">
            19+ Conversores
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-[#0F1724] mb-4">
            Todas as ferramentas que você precisa
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Escolha o conversor ideal para suas necessidades. Rápido, seguro e fácil de usar.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  activeCategory === category
                    ? 'bg-[#0B5E73] text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Buscar conversor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0B5E73] focus:ring-2 focus:ring-[#0B5E73]/20 outline-none transition-all"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {filteredConverters.map((converter) => (
            <article 
              key={converter.id}
              className="group bg-white rounded-2xl p-5 border border-gray-100 hover:border-[#FF7A59]/40 hover:shadow-xl transition-all duration-300"
            >
              {/* Icon */}
              <div className={`w-14 h-14 ${converter.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <span className="text-sm font-bold">{converter.icon}</span>
              </div>

              {/* Content */}
              <h3 className="text-lg font-bold text-[#0F1724] mb-1 group-hover:text-[#0B5E73] transition-colors">
                {converter.name}
              </h3>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                {converter.description}
              </p>

              {/* CTA */}
              <Link 
                href={`/dashboard?converter=${converter.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B5E73] hover:bg-[#094a5c] text-white text-sm font-medium rounded-lg transition-colors"
              >
                Abrir
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              {/* Category Badge */}
              <span className="absolute top-4 right-4 text-xs text-gray-400 hidden group-hover:block">
                {converter.category}
              </span>
            </article>
          ))}
        </div>

        {/* Empty State */}
        {filteredConverters.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-500">Nenhum conversor encontrado para "{searchQuery}"</p>
          </div>
        )}
      </div>
    </section>
  );
}
