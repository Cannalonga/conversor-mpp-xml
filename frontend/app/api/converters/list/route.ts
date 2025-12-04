/**
 * GET /api/converters/list - List available converters
 * 
 * Returns a list of all available file converters with their capabilities.
 * This is a public endpoint (no auth required) used by the dashboard.
 */

import { NextResponse } from 'next/server';

// Define available converters
// In production, this could come from a database or external service
const CONVERTERS = [
  {
    id: 'mpp-to-xml',
    name: 'MPP para XML',
    description: 'Converte arquivos do Microsoft Project para XML',
    category: 'Documentos',
    inputFormats: ['mpp'],
    outputFormat: 'xml',
    cost: 1,
    available: true,
  },
  {
    id: 'pdf-to-docx',
    name: 'PDF para Word',
    description: 'Converte arquivos PDF para documentos Word editáveis',
    category: 'Documentos',
    inputFormats: ['pdf'],
    outputFormat: 'docx',
    cost: 1,
    available: true,
  },
  {
    id: 'docx-to-pdf',
    name: 'Word para PDF',
    description: 'Converte documentos Word para PDF',
    category: 'Documentos',
    inputFormats: ['docx', 'doc'],
    outputFormat: 'pdf',
    cost: 1,
    available: true,
  },
  {
    id: 'xlsx-to-csv',
    name: 'Excel para CSV',
    description: 'Converte planilhas Excel para CSV',
    category: 'Documentos',
    inputFormats: ['xlsx', 'xls'],
    outputFormat: 'csv',
    cost: 1,
    available: true,
  },
  {
    id: 'png-to-jpg',
    name: 'PNG para JPG',
    description: 'Converte imagens PNG para formato JPG',
    category: 'Imagens',
    inputFormats: ['png'],
    outputFormat: 'jpg',
    cost: 1,
    available: true,
  },
  {
    id: 'jpg-to-png',
    name: 'JPG para PNG',
    description: 'Converte imagens JPG para formato PNG',
    category: 'Imagens',
    inputFormats: ['jpg', 'jpeg'],
    outputFormat: 'png',
    cost: 1,
    available: true,
  },
  {
    id: 'mp4-to-mp3',
    name: 'Vídeo para MP3',
    description: 'Extrai áudio de vídeos MP4',
    category: 'Mídia',
    inputFormats: ['mp4'],
    outputFormat: 'mp3',
    cost: 2,
    available: true,
  },
];

export async function GET() {
  try {
    // Filter only available converters
    const availableConverters = CONVERTERS.filter(c => c.available);
    
    return NextResponse.json({
      success: true,
      converters: availableConverters,
    });
  } catch (error) {
    console.error('Error fetching converters:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch converters' },
      { status: 500 }
    );
  }
}
