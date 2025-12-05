'use client';

import ConverterTemplate, { converterConfigs } from '@/components/converters/ConverterTemplate';

export default function PdfMergePage() {
  return <ConverterTemplate config={converterConfigs['pdf-merge']} />;
}
