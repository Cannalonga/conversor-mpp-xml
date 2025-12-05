'use client';

import ConverterTemplate, { converterConfigs } from '@/components/converters/ConverterTemplate';

export default function PdfToWordPage() {
  return <ConverterTemplate config={converterConfigs['pdf-word']} />;
}
