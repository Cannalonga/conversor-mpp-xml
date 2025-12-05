'use client';

import ConverterTemplate, { converterConfigs } from '@/components/converters/ConverterTemplate';

export default function ExcelToCsvPage() {
  return <ConverterTemplate config={converterConfigs['excel-csv']} />;
}
