'use client';

import ConverterTemplate, { converterConfigs } from '@/components/converters/ConverterTemplate';

export default function JpgToPdfPage() {
  return <ConverterTemplate config={converterConfigs['jpg-pdf']} />;
}
