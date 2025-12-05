'use client';

import ConverterTemplate, { converterConfigs } from '@/components/converters/ConverterTemplate';

export default function PptToPdfPage() {
  return <ConverterTemplate config={converterConfigs['ppt-pdf']} />;
}
