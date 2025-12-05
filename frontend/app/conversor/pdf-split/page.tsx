'use client';

import ConverterTemplate, { converterConfigs } from '@/components/converters/ConverterTemplate';

export default function PdfSplitPage() {
  return <ConverterTemplate config={converterConfigs['pdf-split']} />;
}
