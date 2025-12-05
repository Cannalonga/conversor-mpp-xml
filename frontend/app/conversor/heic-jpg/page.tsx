'use client';

import ConverterTemplate, { converterConfigs } from '@/components/converters/ConverterTemplate';

export default function HeicToJpgPage() {
  return <ConverterTemplate config={converterConfigs['heic-jpg']} />;
}
