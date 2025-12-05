'use client';

import ConverterTemplate, { converterConfigs } from '@/components/converters/ConverterTemplate';

export default function VideoToMp4Page() {
  return <ConverterTemplate config={converterConfigs['video-mp4']} />;
}
