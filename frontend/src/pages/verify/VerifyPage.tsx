/**
 * METRA — pages/verify/VerifyPage.tsx
 * Route: /verify/:reportId
 * Public Official Test Report & Certificate Verification Portal.
 * Uses METRA light theme visual language.
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-6 md:p-10 font-sans">
      {/* Light Header */}
      <header className="max-w-3xl mx-auto w-full flex items-center justify-between pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-blue-600 border border-blue-700 flex items-center justify-center text-white font-bold text-base tracking-wider shadow-xs">
            M
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-wide">METRA</h1>
            <p className="text-xs text-slate-500 font-normal">Metrology Evaluation & Test Report Automation</p>
          </div>
        </div>

        <Link
          to="/login"
          className="text-xs font-medium text-slate-700 hover:text-slate-900 transition-colors flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-100 px-3 py-1.5 rounded-md shadow-xs"
        >
          <HugeiconsIcon icon={DashboardSquare01Icon} strokeWidth={2} className="size-3.5 text-slate-500" />
          Portal Login
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="max-w-3xl mx-auto w-full my-8 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="size-8 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Verifying report against METRA laboratory record...</p>
          </div>
        ) : error || !data ? (
          /* Invalid / Verification Failed Card */
          <div className="bg-white border border-rose-200 rounded-lg p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-5" />
              </div>
              <div>
                <span className="inline-block text-[10px] font-mono font-semibold tracking-wider text-rose-700 uppercase bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  UNVERIFIED / INVALID
                </span>
                <h2 className="text-base font-semibold text-slate-900 mt-1">Report Verification Failed</h2>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded border border-slate-200">
              {error || "The requested report reference could not be verified in the METRA laboratory records."}
            </p>

            <div className="text-xs text-slate-500 pt-2 flex items-center gap-2">
              <HugeiconsIcon icon={ShieldKeyIcon} strokeWidth={2} className="size-3.5 text-slate-400" />
              Reference Key: <span className="font-mono text-slate-700">{reportId}</span>
            </div>
          </div>
        ) : (
          /* Verification Record Found */
          <div className="space-y-5">
            {/* Status Header Banner Card */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${
                    isApproved
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-600"
                      : isPending
                      ? "bg-amber-50 border border-amber-200 text-amber-600"
                      : "bg-slate-100 border border-slate-200 text-slate-600"
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
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : isPending
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}>
                      {isApproved ? "VERIFIED" : isPending ? "PENDING VERIFICATION" : data.evaluation_status.toUpperCase()}
                    </span>
                    <h2 className="text-base font-semibold text-slate-900 mt-1">Official Test Report Record</h2>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[11px] text-slate-500 font-medium">Report No</p>
                  <p className="text-xs font-mono font-semibold text-slate-900">{data.report_number}</p>
                </div>
              </div>

              <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded border border-slate-200">
                {isApproved
                  ? "This report was verified against the METRA laboratory record."
                  : isPending
                  ? "This evaluation report is awaiting official verification from the laboratory."
                  : `This evaluation report has status '${data.evaluation_status}' and has not been approved.`}
              </p>
            </div>

            {/* Grid details: Laboratory Info + Instrument Specs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Laboratory Info */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-medium pb-2 border-b border-slate-100">
                  <HugeiconsIcon icon={Building01Icon} strokeWidth={2} className="size-4 text-blue-600" />
                  Laboratory Information
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-slate-500 text-[11px]">Testing Laboratory</p>
                    <p className="font-semibold text-slate-900 text-xs">{data.laboratory_name}</p>
                  </div>
                  {data.laboratory_accreditation && (
                    <div>
                      <p className="text-slate-500 text-[11px]">Accreditation Number</p>
                      <p className="font-mono text-slate-700 text-xs">{data.laboratory_accreditation}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-slate-500 text-[11px]">Standard Reference</p>
                    <p className="text-slate-700 text-xs">OIML R 76-1 ({data.oiml_edition})</p>
                  </div>
                </div>
              </div>

              {/* Instrument Specifications */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-medium pb-2 border-b border-slate-100">
                  <HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} className="size-4 text-blue-600" />
                  Instrument Specifications
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <p className="text-slate-500 text-[11px]">Manufacturer</p>
                    <p className="font-medium text-slate-900 text-xs">{data.instrument_manufacturer}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-[11px]">Model</p>
                    <p className="font-medium text-slate-900 text-xs">{data.instrument_model}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-[11px]">Serial Number</p>
                    <p className="font-mono font-medium text-slate-900 text-xs">{data.serial_number}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-[11px]">Accuracy Class</p>
                    <p className="font-medium text-slate-900 text-xs">Class {data.accuracy_class}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Evaluation & Signoff Metadata */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-medium text-xs pb-2 border-b border-slate-100">
                <HugeiconsIcon icon={UserCheckIcon} strokeWidth={2} className="size-4 text-blue-600" />
                Evaluation Signoff Metadata
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-500 text-[11px]">Evaluated By (Engineer)</p>
                  <p className="font-medium text-slate-900 text-xs">{data.evaluator_name}</p>
                  <p className="text-slate-500 text-[11px]">{data.evaluator_role}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-1">Date: {formatDate(data.evaluated_at)}</p>
                </div>

                <div>
                  <p className="text-slate-500 text-[11px]">Approved & Verified By</p>
                  {isApproved ? (
                    <>
                      <p className="font-semibold text-emerald-700 text-xs">{data.approver_name || "Authorized Signatory"}</p>
                      <p className="text-slate-500 text-[11px]">{data.approver_role || "Quality Manager"}</p>
                      <p className="text-[11px] text-slate-500 font-mono mt-1">Date: {formatDate(data.approved_at)}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-slate-500 text-xs">Pending Verification</p>
                      <p className="text-[11px] text-slate-500 font-mono mt-1">Date: —</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Clean Light Footer */}
      <footer className="max-w-3xl mx-auto w-full pt-6 border-t border-slate-200 text-center text-xs text-slate-500">
        <p>METRA — Metrology Evaluation & Test Report Automation</p>
      </footer>
    </div>
  );
}
