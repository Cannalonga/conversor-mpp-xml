'use client';

import ConverterTemplate, { converterConfigs } from '@/components/converters/ConverterTemplate';

export default function PdfToJpgPage() {
  return <ConverterTemplate config={converterConfigs['pdf-jpg']} />;
}
