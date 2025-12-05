'use client';

import ConverterTemplate, { converterConfigs } from '@/components/converters/ConverterTemplate';

export default function PngToJpgPage() {
  return <ConverterTemplate config={converterConfigs['png-jpg']} />;
}
