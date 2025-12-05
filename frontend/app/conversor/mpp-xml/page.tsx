'use client';

import ConverterTemplate, { converterConfigs } from '@/components/converters/ConverterTemplate';

export default function MppToXmlPage() {
  return <ConverterTemplate config={converterConfigs['mpp-xml']} />;
}
