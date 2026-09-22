/**
 * METRA — components/reports/PdfReportViewer.tsx
 *
 * Client-Side PDF Renderer using Mozilla PDF.js (pdfjs-dist).
 * Renders actual PDF pages directly onto HTML canvas elements.
 * Completely replaces Chrome/browser native PDF iframe view and toolbars.
 */

import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  Download01Icon,
  ZoomInIcon,
  ZoomOutIcon,
  File02Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/common/EmptyState";

// Configure workerSrc for PDF.js using CDN fallback
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface PdfReportViewerProps {
  signedUrl: string;
  reportNumber?: string;
  version?: number;
  onBack: () => void;
  onError?: (err: any) => void;
}

export function PdfReportViewer({
  signedUrl,
  reportNumber,
  version = 1,
  onBack,
  onError,
}: PdfReportViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.25);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  // 1. Load PDF Document from Signed URL
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const loadingTask = pdfjsLib.getDocument({
      url: signedUrl,
      withCredentials: false,
    });

    loadingTask.promise
      .then((doc) => {
        if (!active) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error("PDF.js loading error:", err);
        setError("Failed to load PDF document from storage.");
        setLoading(false);
        if (onError) onError(err);
      });

    return () => {
      active = false;
      loadingTask.destroy();
    };
  }, [signedUrl, onError]);

  // 2. Render all pages onto Canvas elements whenever PDF doc or scale changes
  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;

    let cancelled = false;

    const renderPages = async () => {
      for (let i = 1; i <= numPages; i++) {
        if (cancelled) break;
        const canvas = canvasRefs.current[i - 1];
        if (!canvas) continue;

        try {
          const page = await pdfDoc.getPage(i);
          if (cancelled) break;

          const pixelRatio = window.devicePixelRatio || 1;
          const viewport = page.getViewport({ scale: scale * pixelRatio });

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          // Display size scaled down for device pixel ratio
          canvas.style.width = `${viewport.width / pixelRatio}px`;
          canvas.style.height = `${viewport.height / pixelRatio}px`;

          const ctx = canvas.getContext("2d");
          if (!ctx) continue;

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const renderContext: any = {
            canvasContext: ctx,
            viewport: viewport,
          };

          await page.render(renderContext).promise;
        } catch (err: any) {
          if (err?.name !== "RenderingCancelledException") {
            console.error(`Error rendering PDF page ${i}:`, err);
          }
        }
      }
    };

    renderPages();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, numPages, scale]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 2.5));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.75));
  };

  const handleResetZoom = () => {
    setScale(1.25);
  };

  if (loading) {
    return <LoadingState message="Rendering official report PDF pages..." />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive space-y-3">
        <p className="font-semibold">{error}</p>
        <Button variant="outline" size="sm" onClick={onBack}>
          Back to Reports
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ── METRA PDF VIEWER TOOLBAR ───────────────────────────────────────── */}
      <div className="sticky top-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/95 p-3 shadow-md backdrop-blur-xs">
        {/* Back Button */}
        <Button variant="outline" size="sm" onClick={onBack} className="gap-1 text-xs">
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-3.5" />
          Back to Reports
        </Button>

        {/* Center PDF Navigation & Zoom Controls */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-muted text-[11px] font-mono font-medium text-foreground">
            <HugeiconsIcon icon={File02Icon} strokeWidth={2} className="size-3 text-primary" />
            {numPages} {numPages === 1 ? "Page" : "Pages"}
          </span>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Zoom Out */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleZoomOut}
            disabled={scale <= 0.75}
            title="Zoom Out"
          >
            <HugeiconsIcon icon={ZoomOutIcon} strokeWidth={2} className="size-3.5" />
          </Button>

          <span
            onClick={handleResetZoom}
            className="cursor-pointer text-xs font-mono font-semibold px-2 py-0.5 rounded hover:bg-muted text-foreground"
            title="Reset Zoom (125%)"
          >
            {Math.round((scale / 1.25) * 100)}%
          </span>

          {/* Zoom In */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleZoomIn}
            disabled={scale >= 2.5}
            title="Zoom In"
          >
            <HugeiconsIcon icon={ZoomInIcon} strokeWidth={2} className="size-3.5" />
          </Button>
        </div>

        {/* Right Download Button */}
        <a
          href={signedUrl}
          target="_blank"
          rel="noopener noreferrer"
          download={reportNumber ? `${reportNumber}.pdf` : `report_v${version}.pdf`}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium transition-colors shadow-xs"
        >
          <HugeiconsIcon icon={Download01Icon} strokeWidth={2} className="size-3.5" />
          Download PDF
        </a>
      </div>

      {/* ── OFFICIAL STORED PDF BADGE ────────────────────────────────────── */}
      <div className="rounded-lg border border-emerald-300 bg-emerald-50/80 p-3 flex items-center justify-between text-xs text-emerald-950">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={File02Icon} strokeWidth={2} className="size-4 text-emerald-700" />
          <div>
            <span className="font-bold">Official Stored Report PDF (v{version})</span>
            {reportNumber && <span className="text-emerald-800 ml-2">• Report No: {reportNumber}</span>}
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-semibold uppercase">
          AUTHENTICATED STORAGE PDF
        </span>
      </div>

      {/* ── STACKED PDF PAGES (CANVAS RENDERED) ──────────────────────────── */}
      <div className="flex flex-col items-center gap-6 py-4">
        {Array.from({ length: numPages }, (_, index) => (
          <div
            key={index}
            className="bg-white rounded-lg border border-slate-300 shadow-md p-2 transition-transform duration-200"
          >
            <canvas
              ref={(el) => {
                canvasRefs.current[index] = el;
              }}
              className="block mx-auto rounded-xs"
            />
            <div className="mt-2 text-center text-[10px] font-mono text-slate-400">
              Page {index + 1} of {numPages}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
