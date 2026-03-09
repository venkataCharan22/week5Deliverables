import { useRef } from 'react';
import { Camera, Upload, Package } from 'lucide-react';

function compressImage(file, maxSize = 200 * 1024) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (file.size <= maxSize) {
        resolve(e.target.result);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, Math.sqrt(maxSize / file.size));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function ImageUpload({ value, onChange }) {
  const cameraRef = useRef(null);
  const uploadRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUri = await compressImage(file);
    onChange(dataUri);
    e.target.value = '';
  };

  const isEmoji = value && !value.startsWith('data:') && !value.startsWith('http') && value.length <= 4;
  const isImage = value && (value.startsWith('data:') || value.startsWith('http'));

  return (
    <div className="flex items-center gap-3">
      {/* Preview */}
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-800">
        {isImage ? (
          <img src={value} alt="Product" className="h-full w-full object-cover" />
        ) : isEmoji ? (
          <span className="text-3xl">{value}</span>
        ) : (
          <Package size={22} className="text-gray-500" />
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="flex items-center gap-1.5 rounded-lg bg-gray-800 px-3 py-2 text-xs text-gray-400 hover:text-gray-200"
        >
          <Camera size={14} />
          Camera
        </button>
        <button
          type="button"
          onClick={() => uploadRef.current?.click()}
          className="flex items-center gap-1.5 rounded-lg bg-gray-800 px-3 py-2 text-xs text-gray-400 hover:text-gray-200"
        >
          <Upload size={14} />
          Upload
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="rounded-lg bg-gray-800 px-2.5 py-2 text-xs text-red-400 hover:text-red-300"
          >
            Clear
          </button>
        )}
      </div>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}
