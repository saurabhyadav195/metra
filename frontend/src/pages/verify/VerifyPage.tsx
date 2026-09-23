/**
 * METRA — pages/verify/VerifyPage.tsx
 * Route: /verify/:reportId
 * Public Official Test Report & Certificate Verification Portal.
 * Backed by FastAPI public verification endpoint.
 */

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  Cancel01Icon,
  AlertCircleIcon,
  Building01Icon,
  Calendar01Icon,
  UserCheckIcon,
  DashboardSquare01Icon,
  FileTextIcon,
  ShieldKeyIcon,
} from "@hugeicons/core-free-icons";

interface VerificationData {
  verified: boolean;
  evaluation_id: string;
  laboratory_name: string;
  laboratory_accreditation?: string;
  instrument_manufacturer: string;
  instrument_model: string;
  serial_number: string;
  accuracy_class: string;
  overall_result: string;
  evaluation_status: string;
  evaluator_name: string;
  evaluator_role: string;
  evaluated_at?: string;
  approver_name?: string;
  approver_role?: string;
  approved_at?: string;
  report_number: string;
  oiml_edition: string;
  verification_message: string;
}

export default function VerifyPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const [loading, setLoading] = useState<boolean>(Boolean(reportId));
  const [data, setData] = useState<VerificationData | null>(null);
  const [error, setError] = useState<string | null>(
    reportId ? null : "No report reference ID provided."
  );

  useEffect(() => {
    document.title = "METRA — Report Verification";
    if (!reportId) return;

    let isMounted = true;
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    fetch(`${baseUrl}/api/verify/${reportId}`)
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Report verification failed.");
        }
        return res.json();
      })
      .then((json: VerificationData) => {
        if (isMounted) setData(json);
      })
      .catch((err: Error) => {
        if (isMounted) setError(err.message || "Failed to verify report record.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [reportId]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return " — ";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const isApproved = Boolean(data && (data.verified || data.evaluation_status?.toUpperCase() === "APPROVED"));
  const isPending = Boolean(data && !isApproved && (data.evaluation_status?.toUpperCase() === "PENDING_VERIFICATION" || data.evaluation_status?.toUpperCase() === "PENDING"));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-10 font-sans">
      {/* Header */}
      <header className="max-w-3xl mx-auto w-full flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-base tracking-wider">
            M
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 tracking-wide">METRA</h1>
            <p className="text-[11px] text-slate-400 font-medium">Metrology Evaluation & Test Report Automation</p>
          </div>
        </div>

        <Link
          to="/login"
          className="text-xs font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-md"
        >
          <HugeiconsIcon icon={DashboardSquare01Icon} strokeWidth={2} className="size-3.5" />
          Portal Login
        </Link>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto w-full my-8 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="size-8 border-2 border-slate-800 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-xs text-slate-400 font-medium">Verifying report against METRA laboratory record...</p>
          </div>
        ) : error || !data ? (
          /* Invalid / Verification Failed Card */
          <div className="bg-slate-900/80 border border-rose-500/30 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-5" />
              </div>
              <div>
                <span className="inline-block text-[10px] font-mono font-semibold tracking-wider text-rose-400 uppercase bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  UNVERIFIED / INVALID
                </span>
                <h2 className="text-base font-semibold text-slate-100 mt-1">Report Verification Failed</h2>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3.5 rounded border border-slate-800">
              {error || "The requested report reference could not be verified in the METRA laboratory records."}
            </p>

            <div className="text-xs text-slate-400 pt-2 flex items-center gap-2">
              <HugeiconsIcon icon={ShieldKeyIcon} strokeWidth={2} className="size-3.5 text-slate-400" />
              Reference Key: <span className="font-mono text-slate-300">{reportId}</span>
            </div>
          </div>
        ) : (
          /* Verification Record Found */
          <div className="space-y-5">
            {/* Status Header Banner */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${
                    isApproved
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                      : isPending
                      ? "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                      : "bg-slate-800 border border-slate-700 text-slate-300"
                  }`}>
                    <HugeiconsIcon
                      icon={isApproved ? CheckmarkCircle02Icon : isPending ? AlertCircleIcon : Cancel01Icon}
                      strokeWidth={2}
                      className="size-5"
                    />
                  </div>
                  <div>
                    <span className={`inline-block text-[10px] font-mono font-semibold tracking-wider uppercase px-2 py-0.5 rounded border ${
                      isApproved
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : isPending
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : "bg-slate-800 text-slate-300 border-slate-700"
                    }`}>
                      {isApproved ? "VERIFIED" : isPending ? "PENDING VERIFICATION" : data.evaluation_status.toUpperCase()}
                    </span>
                    <h2 className="text-base font-semibold text-slate-100 mt-1">Official Test Report Record</h2>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[11px] text-slate-400 font-medium">Report No</p>
                  <p className="text-xs font-mono font-semibold text-slate-200">{data.report_number}</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded border border-slate-800">
                {isApproved
                  ? "This report was verified against the METRA laboratory record."
                  : isPending
                  ? "This evaluation report is awaiting official verification from the laboratory."
                  : `This evaluation report has status '${data.evaluation_status}' and has not been approved.`}
              </p>
            </div>

            {/* Grid details: Report, Lab, Instrument */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Report & Laboratory Info */}
              <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-slate-300 font-medium pb-2 border-b border-slate-800">
                  <HugeiconsIcon icon={Building01Icon} strokeWidth={2} className="size-4 text-blue-400" />
                  Laboratory Information
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-slate-400 text-[11px]">Testing Laboratory</p>
                    <p className="font-semibold text-slate-100 text-xs">{data.laboratory_name}</p>
                  </div>
                  {data.laboratory_accreditation && (
                    <div>
                      <p className="text-slate-400 text-[11px]">Accreditation Number</p>
                      <p className="font-mono text-slate-300 text-xs">{data.laboratory_accreditation}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-slate-400 text-[11px]">Standard Reference</p>
                    <p className="text-slate-300 text-xs">OIML R 76-1 ({data.oiml_edition})</p>
                  </div>
                </div>
              </div>

              {/* Instrument Metadata */}
              <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-slate-300 font-medium pb-2 border-b border-slate-800">
                  <HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} className="size-4 text-blue-400" />
                  Instrument Specifications
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <p className="text-slate-400 text-[11px]">Manufacturer</p>
                    <p className="font-medium text-slate-200 text-xs">{data.instrument_manufacturer}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[11px]">Model</p>
                    <p className="font-medium text-slate-200 text-xs">{data.instrument_model}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[11px]">Serial Number</p>
                    <p className="font-mono font-medium text-slate-200 text-xs">{data.serial_number}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[11px]">Accuracy Class</p>
                    <p className="font-medium text-slate-200 text-xs">Class {data.accuracy_class}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Evaluation & Signoff Metadata */}
            <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-slate-300 font-medium text-xs pb-2 border-b border-slate-800">
                <HugeiconsIcon icon={UserCheckIcon} strokeWidth={2} className="size-4 text-blue-400" />
                Evaluation Signoff Metadata
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-400 text-[11px]">Evaluated By (Engineer)</p>
                  <p className="font-medium text-slate-100 text-xs">{data.evaluator_name}</p>
                  <p className="text-slate-400 text-[11px]">{data.evaluator_role}</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-1">Date: {formatDate(data.evaluated_at)}</p>
                </div>

                <div>
                  <p className="text-slate-400 text-[11px]">Approved & Verified By</p>
                  {isApproved ? (
                    <>
                      <p className="font-semibold text-emerald-400 text-xs">{data.approver_name || "Authorized Signatory"}</p>
                      <p className="text-slate-400 text-[11px]">{data.approver_role || "Quality Manager"}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-1">Date: {formatDate(data.approved_at)}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-slate-400 text-xs">Pending Verification</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-1">Date: —</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Verification Notice */}
            <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800 flex items-start gap-3">
              <HugeiconsIcon icon={FileTextIcon} strokeWidth={2} className="size-4 text-slate-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-400 space-y-1">
                <p className="text-slate-300 font-medium">Verification Information</p>
                <p>
                  This page verifies that the QR code and reference URL correspond to an official METRA evaluation report record.
                </p>
                <p className="font-mono text-[11px] text-slate-400">
                  Evaluation ID: {data.evaluation_id}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-3xl mx-auto w-full pt-6 border-t border-slate-800 text-center text-xs text-slate-400">
        <p>METRA — Metrology Evaluation & Test Report Automation</p>
      </footer>
    </div>
  );
}
