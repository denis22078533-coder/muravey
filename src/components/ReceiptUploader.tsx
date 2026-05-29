import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface ReceiptUploaderProps {
  onImageReady: (base64: string) => void;
}

export default function ReceiptUploader({ onImageReady }: ReceiptUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const processFile = useCallback(
    (file: File) => {
      // Мгновенное локальное превью через createObjectURL
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
      setLoading(true);

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        onImageReady(base64);
        setLoading(false);
      };
      reader.readAsDataURL(file);
    },
    [onImageReady],
  );

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) processFile(accepted[0]);
    },
    [processFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.heic'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      // fallback to file input
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) processFile(file);
    };
    input.click();
  };

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-cyan-400 bg-cyan-400/10'
            : 'border-slate-600 hover:border-slate-400 bg-slate-800/50'
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-slate-300 text-sm">
          {isDragActive ? '📥 Отпустите файл сюда' : '📎 Перетащите чек сюда или нажмите для выбора'}
        </p>
        <p className="text-slate-500 text-xs mt-1">PNG, JPG, WebP до 10 МБ</p>
      </div>

      <button
        type="button"
        onClick={handleCamera}
        className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors"
      >
        📷 Снять фото чека
      </button>

      {preview && (
        <div className="relative rounded-xl overflow-hidden border border-slate-600">
          <img
            src={preview}
            alt="Превью чека"
            className="w-full max-h-64 object-contain bg-slate-900"
          />
          {loading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-cyan-400 animate-pulse">Обработка...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}