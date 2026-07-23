// ============================================================
// Upload Page
// ------------------------------------------------------------
// Initial data-loading UI: lets an operator upload the Product
// Replacement and/or Part Replacement Excel files. This page (and
// its backing /api/upload route) can be removed later without any
// impact on the dashboard, since the dashboard always reads MySQL.
// ============================================================

import { useState } from 'react';
import FileUploader from '../components/FileUploader';
import { uploadExcelFiles } from '../services/uploadService';

export default function UploadPage() {
  const [productFile, setProductFile] = useState(null);
  const [partFile, setPartFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const canSubmit = (productFile || partFile) && !uploading;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!productFile && !partFile) return;

    setUploading(true);
    setError(null);
    setResult(null);
    setProgress(0);

    try {
      const response = await uploadExcelFiles(
        { productReplacement: productFile || undefined, partReplacement: partFile || undefined },
        setProgress
      );
      setResult(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-ink-950">Upload Data</h2>
        <p className="text-sm text-ink-500 mt-1">
          Parses uploaded Excel files using <strong>ZMAC ID</strong> (Complaint Number) and <strong>Product Description</strong> (Model).
          Filters automatically for <strong>mat cat</strong> (WM, WD) and <strong>machine status</strong> (SW, SUW).
        </p>
      </div>

      <form onSubmit={handleSubmit} className="panel p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <FileUploader label="Product Replacement File" file={productFile} onFileSelect={setProductFile} />
          <FileUploader label="Part Replacement File" file={partFile} onFileSelect={setPartFile} />
        </div>

        {uploading && (
          <div>
            <div className="h-1.5 rounded-full bg-mist-200 overflow-hidden">
              <div
                className="h-full bg-signal transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-ink-500 mt-1.5">Uploading… {progress}%</p>
          </div>
        )}

        <button type="submit" disabled={!canSubmit} className="btn-primary">
          {uploading ? 'Processing…' : 'Upload & Process'}
        </button>
      </form>

      {error && (
        <div className="panel border-danger/30 bg-danger/5 p-5">
          <p className="text-sm font-semibold text-ink-900">Upload failed</p>
          <p className="text-sm text-ink-600 mt-0.5">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {Object.entries(result).map(([key, summary]) => (
            <div key={key} className="panel p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-ink-950">{summary.fileName}</h3>
                <StatusBadge status={summary.status} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <Stat label="Total Rows" value={summary.totalRows} />
                <Stat label="Inserted" value={summary.insertedRows} accent="text-signal-dark" />
                <Stat label="Duplicates" value={summary.duplicateRows} accent="text-amber" />
                <Stat label="Skipped/Errors" value={summary.skippedRows} accent="text-danger" />
              </div>

              {summary.skippedDetails?.length > 0 && (
                <details className="mt-4">
                  <summary className="text-xs font-semibold text-ink-500 cursor-pointer">
                    View skipped row details (sample)
                  </summary>
                  <ul className="mt-2 space-y-1 text-xs text-ink-500 max-h-40 overflow-y-auto">
                    {summary.skippedDetails.map((d, i) => (
                      <li key={i}>
                        Row {d.rowNumber}: {d.reason} {d.complaintNumber ? `(${d.complaintNumber})` : ''}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent = 'text-ink-900' }) {
  return (
    <div>
      <p className="text-xs text-ink-500">{label}</p>
      <p className={`text-lg font-display font-bold tabular-nums ${accent}`}>{value.toLocaleString()}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    SUCCESS: 'bg-signal/10 text-signal-dark',
    PARTIAL: 'bg-amber/15 text-amber',
    FAILED: 'bg-danger/10 text-danger',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${styles[status] || 'bg-mist-200 text-ink-600'}`}>
      {status}
    </span>
  );
}
