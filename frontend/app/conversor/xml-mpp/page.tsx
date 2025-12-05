'use client';

import ConverterTemplate, { converterConfigs } from '@/components/converters/ConverterTemplate';

export default function XmlToMppPage() {
  return <ConverterTemplate config={converterConfigs['xml-mpp']} />;
}
