'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { UploadBox } from '@/components/UploadBox';

interface UploadClientProps {
  onFileUploaded: (fileId: string, file: File) => void;
}

export default function UploadClient({ onFileUploaded }: UploadClientProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const response = await api.uploadFile(file, (p) => setProgress(p));
      onFileUploaded(response.fileId, file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro no upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <UploadBox
        onFileSelect={handleFileSelect}
        uploading={uploading}
        uploadProgress={progress}
        maxSize={100}
      />
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
