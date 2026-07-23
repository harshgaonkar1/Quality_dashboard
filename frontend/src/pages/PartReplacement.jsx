// ============================================================
// Part Replacement Page
// ------------------------------------------------------------
// The spec only fully defines the Product Replacement module for
// this phase. This page is scaffolded with the same architecture
// (backend table, model, and API convention already exist as
// part_replacement / PART_REPLACEMENT) so it can be built out by
// mirroring productReplacementService.js / Controller / Model and
// the ProductReplacement + ProductReplacementDetails pages.
// ============================================================

export default function PartReplacement() {
  return (
    <div className="max-w-3xl">
      <h2 className="font-display text-xl font-bold text-ink-950">Part Replacement</h2>
      <p className="text-sm text-ink-500 mt-1">
        Data model and upload pipeline are already in place (see part_replacement table).
      </p>

      <div className="panel p-8 mt-6 text-center">
        <div className="w-11 h-11 rounded-xl bg-ink-900/5 text-ink-700 flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
            <circle cx="10" cy="10" r="2.6" />
            <path d="M10 3v1.6M10 15.4V17M17 10h-1.6M4.6 10H3M14.9 5.1l-1.1 1.1M6.2 13.7l-1.1 1.1M14.9 14.9l-1.1-1.1M6.2 6.2 5.1 5.1" />
          </svg>
        </div>
        <h3 className="font-display font-semibold text-ink-900">Dashboard coming next</h3>
        <p className="text-sm text-ink-500 mt-1.5 max-w-sm mx-auto">
          Summary cards, ageing chart, and details table for Part Replacement will follow the
          same pattern as Product Replacement once its filter rules are confirmed.
        </p>
      </div>
    </div>
  );
}
