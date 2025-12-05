'use client';

import ConverterTemplate, { converterConfigs } from '@/components/converters/ConverterTemplate';

export default function WordToPdfPage() {
  return <ConverterTemplate config={converterConfigs['word-pdf']} />;
}
