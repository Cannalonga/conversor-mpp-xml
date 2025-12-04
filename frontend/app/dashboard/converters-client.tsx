'use client';

import { Converter } from '@/lib/api';

interface ConvertersClientProps {
  converters: Converter[];
  loading: boolean;
  selectedConverter: Converter | null;
  onSelect: (converter: Converter) => void;
  fileName: string;
}

export default function ConvertersClient({
  converters,
  loading,
  selectedConverter,
  onSelect,
  fileName,
}: ConvertersClientProps) {
  // Get file extension
  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  // Filter compatible converters based on file extension
  const compatibleConverters = converters.filter(
    (c) => c.inputFormats.includes(extension) || c.inputFormats.includes('*')
  );

  // Group by category
  const grouped = compatibleConverters.reduce((acc, converter) => {
    const cat = converter.category || 'Outros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(converter);
    return acc;
  }, {} as Record<string, Converter[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <svg className="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  if (compatibleConverters.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-gray-600">Nenhum conversor compatível com arquivos .{extension}</p>
        <p className="text-sm text-gray-400 mt-2">Tente outro arquivo ou entre em contato para suporte</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([category, categoryConverters]) => (
        <div key={category}>
          <h4 className="text-sm font-medium text-gray-500 mb-3">{category}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categoryConverters.map((converter) => (
              <button
                key={converter.id}
                onClick={() => onSelect(converter)}
                className={`
                  text-left p-4 rounded-lg border-2 transition-all
                  ${selectedConverter?.id === converter.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{converter.name}</p>
                    <p className="text-sm text-gray-500 mt-1">{converter.description}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {converter.inputFormats.join(', ')} → {converter.outputFormat}
                    </p>
                  </div>
                  {selectedConverter?.id === converter.id && (
                    <div className="w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
