// ============================================================
// Upload Page
// ------------------------------------------------------------
// 2-Step Excel Inspection & Upload Workflow:
// Step 1: Select files -> Click 'Inspect & Validate Files'
// Step 2: Preview file contents & inspect cell errors (dates,
//         missing values, duplicates) in interactive spreadsheet grid
// Step 3: Press 'Confirm & Upload to Database' to insert valid rows
// ============================================================

import { useState } from 'react';
import FileUploader from '../components/FileUploader';
import ExcelErrorHandler from '../components/ExcelErrorHandler';
import { validateExcelFiles, commitExcelUpload } from '../services/uploadService';
import { syncPartGroupingLookup } from '../services/partReplacementService';

export default function UploadPage() {
  const [productFile, setProductFile] = useState(null);
  const [partFile, setPartFile] = useState(null);
  const [groupingFile, setGroupingFile] = useState(null);

  const [validating, setValidating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [isCommitted, setIsCommitted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [commitError, setCommitError] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const hasFiles = Boolean(productFile || partFile || groupingFile);
  const canInspect = hasFiles && !validating && !committing;

  // Step 1: Validate and inspect files without inserting into database
  async function handleInspect(e) {
    if (e) e.preventDefault();
    if (!hasFiles) return;

    setValidating(true);
    setError(null);
    setCommitError(null);
    setResult(null);
    setIsCommitted(false);
    setProgress(0);

    try {
      const response = await validateExcelFiles(
        {
          productReplacement: productFile || undefined,
          partReplacement: partFile || undefined,
          partGrouping: groupingFile || undefined,
        },
        setProgress
      );
      setResult(response.data?.data || response.data);
    } catch (err) {
      setError(err.message || 'Validation failed');
      if (err.data?.data) {
        setResult(err.data.data);
      }
    } finally {
      setValidating(false);
    }
  }

  // Step 2: Commit previously validated session(s) into database
  async function handleCommit() {
    if (!result || committing) return;

    // Extract session tokens from validation result
    const sessionTokens = {};
    Object.entries(result).forEach(([key, data]) => {
      if (data.sessionToken) {
        sessionTokens[key] = data.sessionToken;
      }
    });

    if (Object.keys(sessionTokens).length === 0) {
      setCommitError('No active session token found. Please re-validate the file.');
      return;
    }

    setCommitting(true);
    setCommitError(null);

    try {
      const response = await commitExcelUpload(sessionTokens);
      const commitData = response.data?.data || response.data;

      // Merge committed status into current result to keep previews and cell errors visible
      const updated = { ...result };
      Object.entries(commitData).forEach(([key, res]) => {
        if (updated[key]) {
          updated[key] = {
            ...updated[key],
            ...res,
            validationOnly: false,
            insertedRows: res.insertedRows,
            status: res.status,
          };
        } else {
          updated[key] = res;
        }
      });

      setResult(updated);
      setIsCommitted(true);
    } catch (err) {
      setCommitError(err.message || 'Failed to save data into database.');
    } finally {
      setCommitting(false);
    }
  }

  // Reset form to upload another file
  function handleReset() {
    setProductFile(null);
    setPartFile(null);
    setGroupingFile(null);
    setResult(null);
    setError(null);
    setCommitError(null);
    setIsCommitted(false);
    setProgress(0);
  }

  // Manual trigger for QA Part Grouping lookup synchronization
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
    <div className="max-w-6xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink-950 dark:text-mist-100">Upload & Inspect Data</h2>
          <p className="text-sm text-ink-500 dark:text-mist-400 mt-1">
            2-step data loader: inspect spreadsheets and pinpoint cell-level errors before committing to the database.
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

      {/* Sync Status Banner */}
      {syncStatus && (
        <div
          className={`panel p-3 text-xs font-semibold rounded-lg ${
            syncStatus.success
              ? 'bg-signal/15 text-signal-dark dark:text-signal-light border border-signal/30'
              : 'bg-danger/10 text-danger border border-danger/30'
          }`}
        >
          {syncStatus.message}
        </div>
      )}

      {/* Commit Error Banner */}
      {commitError && (
        <div className="panel p-3.5 text-xs font-semibold rounded-xl bg-danger/10 text-danger border border-danger/30 flex items-center gap-2">
          <span>⚠️</span>
          <span>{commitError}</span>
        </div>
      )}

      {/* Workflow Step Indicator */}
      <div className="panel p-4 bg-mist-50/60 dark:bg-ink-900/60 border border-mist-200 dark:border-ink-800">
        <div className="flex items-center justify-between gap-2 max-w-2xl mx-auto text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                !result ? 'bg-signal-dark text-white' : 'bg-signal/20 text-signal-dark dark:text-signal-light'
              }`}
            >
              1
            </span>
            <span className={!result ? 'text-ink-900 dark:text-mist-100 font-bold' : 'text-ink-500 dark:text-mist-400'}>
              Select & Inspect
            </span>
          </div>

          <div className="h-0.5 flex-1 bg-mist-200 dark:bg-ink-700 mx-2" />

          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                result && !isCommitted
                  ? 'bg-amber-600 text-white'
                  : isCommitted
                  ? 'bg-signal/20 text-signal-dark dark:text-signal-light'
                  : 'bg-mist-200 dark:bg-ink-800 text-ink-500'
              }`}
            >
              2
            </span>
            <span
              className={
                result && !isCommitted
                  ? 'text-amber-700 dark:text-amber-400 font-bold'
                  : 'text-ink-500 dark:text-mist-400'
              }
            >
              Review Cell Errors
            </span>
          </div>

          <div className="h-0.5 flex-1 bg-mist-200 dark:bg-ink-700 mx-2" />

          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                isCommitted
                  ? 'bg-signal-dark text-white'
                  : 'bg-mist-200 dark:bg-ink-800 text-ink-500'
              }`}
            >
              3
            </span>
            <span className={isCommitted ? 'text-signal-dark dark:text-signal-light font-bold' : 'text-ink-500 dark:text-mist-400'}>
              Confirmed in Database
            </span>
          </div>
        </div>
      </div>

      {/* File Upload Selection Form */}
      <form onSubmit={handleInspect} className="panel p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <FileUploader label="Product Replacement File" file={productFile} onFileSelect={setProductFile} />
          <FileUploader label="Part Replacement File" file={partFile} onFileSelect={setPartFile} />
          <FileUploader label="Part Grouping Lookup Master" file={groupingFile} onFileSelect={setGroupingFile} />
        </div>

        {validating && (
          <div>
            <div className="h-1.5 rounded-full bg-mist-200 dark:bg-ink-800 overflow-hidden">
              <div
                className="h-full bg-signal transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-ink-500 dark:text-mist-400 mt-1.5">
              Inspecting file headers, coordinates, and date formats… {progress}%
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="submit"
            disabled={!canInspect}
            className="btn-primary flex items-center gap-2"
          >
            <span>{validating ? '⏳ Inspecting…' : '🔍 Inspect & Validate Files'}</span>
          </button>

          {(result || error) && (
            <button
              type="button"
              onClick={handleReset}
              disabled={validating || committing}
              className="btn-secondary text-xs py-2 px-3"
            >
              🔄 Reset & Choose New Files
            </button>
          )}
        </div>
      </form>

      {/* Comprehensive Excel Error & Spreadsheet Preview Inspector */}
      {(result || error) && (
        <ExcelErrorHandler
          result={result}
          error={error}
          onCommit={handleCommit}
          isCommitting={committing}
          isCommitted={isCommitted}
          onRetry={handleInspect}
          onClose={handleReset}
        />
      )}
    </div>
  );
}


