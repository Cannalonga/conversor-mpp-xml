'use client';

import ConverterTemplate, { converterConfigs } from '@/components/converters/ConverterTemplate';

export default function PdfCompressPage() {
  return <ConverterTemplate config={converterConfigs['pdf-compress']} />;
}
