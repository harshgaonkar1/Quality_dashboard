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
import { syncPartGroupingLookup } from '../services/partReplacementService';

export default function UploadPage() {
  const [productFile, setProductFile] = useState(null);
  const [partFile, setPartFile] = useState(null);
  const [groupingFile, setGroupingFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const canSubmit = (productFile || partFile || groupingFile) && !uploading;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!productFile && !partFile && !groupingFile) return;

    setUploading(true);
    setError(null);
    setResult(null);
    setProgress(0);

    try {
      const response = await uploadExcelFiles(
        {
          productReplacement: productFile || undefined,
          partReplacement: partFile || undefined,
          partGrouping: groupingFile || undefined,
        },
        setProgress
      );
      setResult(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleManualSync() {
    setSyncing(true);
    setSyncStatus(null);
    try {
      const res = await syncPartGroupingLookup();
      setSyncStatus({
        success: true,
        message: `Sync complete! Updated ${res.data?.data?.updatedCount || 0} part replacement records based on ${res.data?.data?.mappingsCount || 0} part_grouping mappings.`,
      });
    } catch (err) {
      setSyncStatus({
        success: false,
        message: `Sync failed: ${err.message}`,
      });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink-950 dark:text-mist-100">Upload Data</h2>
          <p className="text-sm text-ink-500 dark:text-mist-400 mt-1">
            Upload raw data files and Part Grouping lookup masters to populate and enrich the quality analytics dashboards.
          </p>
        </div>
        <button
          type="button"
          onClick={handleManualSync}
          disabled={syncing}
          className="btn-secondary self-start sm:self-auto text-xs py-2 px-3 flex items-center gap-1.5 shrink-0"
          title="Re-run QA lookup mapping between part_replacement and part_grouping tables"
        >
          <span>🔄</span> {syncing ? 'Syncing Mappings…' : 'Sync Part Grouping Lookup'}
        </button>
      </div>

      {syncStatus && (
        <div className={`panel p-3 text-xs font-semibold rounded-lg ${syncStatus.success ? 'bg-signal/15 text-signal-dark dark:text-signal-light border border-signal/30' : 'bg-danger/10 text-danger border border-danger/30'}`}>
          {syncStatus.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="panel p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <FileUploader label="Product Replacement File" file={productFile} onFileSelect={setProductFile} />
          <FileUploader label="Part Replacement File" file={partFile} onFileSelect={setPartFile} />
          <FileUploader label="Part Grouping Lookup Master" file={groupingFile} onFileSelect={setGroupingFile} />
        </div>

        {/* <p className="text-xs text-ink-400 dark:text-mist-500 bg-mist-100 dark:bg-ink-900/60 p-3 rounded-lg border border-mist-200 dark:border-ink-800">
          💡 <strong>QA Lookup Engine:</strong> Uploading the Part Grouping master maps <code>Item Code</code> / <code>Part Code</code> &rarr; <code>Part Grouping</code> name and automatically updates the <code>part_grouping</code> column in <code>part_replacement</code>.
        </p> */}


        {uploading && (
          <div>
            <div className="h-1.5 rounded-full bg-mist-200 dark:bg-ink-800 overflow-hidden">
              <div
                className="h-full bg-signal transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-ink-500 dark:text-mist-400 mt-1.5">Uploading… {progress}%</p>
          </div>
        )}

        <button type="submit" disabled={!canSubmit} className="btn-primary">
          {uploading ? 'Processing…' : 'Upload & Process'}
        </button>
      </form>

      {error && (
        <div className="panel border-danger/30 bg-danger/5 dark:bg-danger/10 p-5">
          <p className="text-sm font-semibold text-ink-900 dark:text-mist-100">Upload failed</p>
          <p className="text-sm text-ink-600 dark:text-mist-300 mt-0.5">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {Object.entries(result).map(([key, summary]) => (
            <div key={key} className="panel p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-ink-950 dark:text-mist-100">{summary.fileName}</h3>
                <StatusBadge status={summary.status} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <Stat label="Total Rows" value={summary.totalRows} />
                <Stat label="Inserted" value={summary.insertedRows} accent="text-signal-dark dark:text-signal-light" />
                <Stat label="Duplicates" value={summary.duplicateRows} accent="text-amber dark:text-amber-400" />
                <Stat label="Skipped/Errors" value={summary.skippedRows} accent="text-danger dark:text-red-400" />
              </div>

              {summary.skippedDetails?.length > 0 && (
                <details className="mt-4">
                  <summary className="text-xs font-semibold text-ink-500 dark:text-mist-400 cursor-pointer">
                    View skipped row details (sample)
                  </summary>
                  <ul className="mt-2 space-y-1 text-xs text-ink-500 dark:text-mist-400 max-h-40 overflow-y-auto">
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

function Stat({ label, value, accent = 'text-ink-900 dark:text-mist-100' }) {
  return (
    <div>
      <p className="text-xs text-ink-500 dark:text-mist-400">{label}</p>
      <p className={`text-lg font-display font-bold tabular-nums ${accent}`}>{value.toLocaleString()}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    SUCCESS: 'bg-signal/10 text-signal-dark dark:bg-signal/20 dark:text-signal-light',
    PARTIAL: 'bg-amber/15 text-amber dark:bg-amber-500/20 dark:text-amber-400',
    FAILED: 'bg-danger/10 text-danger dark:bg-danger/20 dark:text-red-400',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${styles[status] || 'bg-mist-200 dark:bg-ink-800 text-ink-600 dark:text-mist-300'}`}>
      {status}
    </span>
  );
}
