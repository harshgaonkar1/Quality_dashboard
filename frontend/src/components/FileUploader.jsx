// ============================================================
// File Uploader
// ------------------------------------------------------------
// Drag-and-drop / click-to-browse control for a single Excel file.
// Purely presentational + local file state; the parent page owns
// the actual upload submission.
// ============================================================

import { useRef, useState } from 'react';

export default function FileUploader({ label, file, onFileSelect, accept = '.xlsx,.xls' }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFiles(fileList) {
    const selected = fileList?.[0];
    if (selected) onFileSelect(selected);
  }

  return (
    <div>
      <label className="label-text block mb-2">{label}</label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`cursor-pointer rounded-xl border-2 border-dashed px-5 py-8 text-center transition-colors ${
          dragOver ? 'border-signal bg-signal/5' : 'border-mist-300 hover:border-mist-400 bg-mist-100/60'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {file ? (
          <div className="flex items-center justify-center gap-2 text-ink-800">
            <FileIcon className="w-5 h-5 text-signal-dark shrink-0" />
            <span className="text-sm font-medium truncate max-w-[220px]">{file.name}</span>
          </div>
        ) : (
          <>
            <FileIcon className="w-6 h-6 mx-auto text-mist-400 mb-2" />
            <p className="text-sm text-ink-600">
              <span className="font-semibold text-signal-dark">Click to browse</span> or drag a file here
            </p>
            <p className="text-xs text-ink-400 mt-1">.xlsx or .xls, up to 15MB</p>
          </>
        )}
      </div>
    </div>
  );
}

function FileIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M6 2.5h5L15 6v9.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1Z" />
      <path d="M11 2.5V6h4" />
    </svg>
  );
}
