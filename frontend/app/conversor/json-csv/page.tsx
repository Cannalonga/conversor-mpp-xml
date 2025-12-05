'use client';

import ConverterTemplate, { converterConfigs } from '@/components/converters/ConverterTemplate';

export default function JsonToCsvPage() {
  return <ConverterTemplate config={converterConfigs['json-csv']} />;
}
