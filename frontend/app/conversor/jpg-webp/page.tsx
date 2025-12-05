'use client';

import ConverterTemplate, { converterConfigs } from '@/components/converters/ConverterTemplate';

export default function JpgToWebpPage() {
  return <ConverterTemplate config={converterConfigs['jpg-webp']} />;
}
