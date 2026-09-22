/**
 * METRA Frontend — pages/verify/VerifyPage.tsx
 * Route: /verify/:reportId
 * Public Anti-Counterfeit Certificate Verification Portal (No Authentication Required).
 */

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  Cancel01Icon,
  AlertCircleIcon,
  ShieldKeyIcon,
  Building01Icon,
  Calendar01Icon,
  UserCheckIcon,
  DashboardSquare01Icon,
} from "@hugeicons/core-free-icons";

interface VerificationData {
  verified: boolean;
  evaluation_id: string;
  certificate_number: string;
  evaluation_status: string;
  overall_result: string;
  laboratory_name: string;
  laboratory_accreditation: string;
  instrument_model: string;
  instrument_manufacturer: string;
  serial_number: string;
  accuracy_class: string;
  max_capacity: string;
  evaluated_by: string;
  evaluated_at: string;
  approved_by: string;
  approved_at: string;
  verification_message: string;
  issued_at: string;
}

export default function VerifyPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VerificationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "METRA — Certificate Verification";
    if (!reportId) {
      setError("No evaluation or certificate reference ID provided.");
      setLoading(false);
      return;
    }

    const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    fetch(`${baseUrl}/api/verify/${reportId}`)
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Certificate verification failed.");
        }
        return res.json();
      })
      .then((json: VerificationData) => {
        setData(json);
      })
      .catch((err: any) => {
        setError(err.message || "Failed to verify certificate.");
      })
      .finally(() => setLoading(false));
  }, [reportId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-10 font-sans">
      {/* Top Brand Header */}
      <header className="max-w-3xl mx-auto w-full flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg">
            M
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 tracking-wide">METRA</h1>
            <p className="text-[11px] text-slate-400 font-medium">Metrology Evaluation & Verification Registry</p>
          </div>
        </div>

        <Link
          to="/login"
          className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-md"
        >
          <HugeiconsIcon icon={DashboardSquare01Icon} strokeWidth={2} className="size-3.5" />
          Portal Login
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="max-w-3xl mx-auto w-full my-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="size-10 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-xs text-slate-400 font-medium">Verifying OIML Type Evaluation Certificate digital signature...</p>
          </div>
        ) : error || !data ? (
          /* Verification Failed / Counterfeit Warning */
          <div className="bg-slate-900/90 border border-rose-500/40 rounded-xl p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0">
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2.5} className="size-8" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold tracking-widest text-rose-400 uppercase bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/20">
                  UNVERIFIED / INVALID
                </span>
                <h2 className="text-xl font-bold text-slate-100 mt-1">Certificate Verification Failed</h2>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-lg border border-slate-800">
              {error || "The requested certificate reference could not be authenticated in the official METRA registry. It may be fraudulent, altered, or not yet registered by an authorized metrology laboratory."}
            </p>

            <div className="text-xs text-slate-500 border-t border-slate-800 pt-4 flex items-center gap-2">
              <HugeiconsIcon icon={ShieldKeyIcon} strokeWidth={2} className="size-4 text-slate-400" />
              Reference Key: <span className="font-mono text-slate-400">{reportId}</span>
            </div>
          </div>
        ) : data.verified ? (
          /* Verified Authentic Certificate */
          <div className="bg-slate-900/90 border border-emerald-500/40 rounded-xl p-6 md:p-8 shadow-2xl space-y-6">
            {/* Status Header Badge */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="flex items-center gap-3.5">
                <div className="size-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2.5} className="size-7" />
                </div>
                <div>
                  <span className="text-[11px] font-mono font-bold tracking-widest text-emerald-400 uppercase bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                    VERIFIED AUTHENTIC
                  </span>
                  <h2 className="text-lg font-bold text-slate-100 mt-1">Official OIML R 76-1 Certificate</h2>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs text-slate-400 font-medium">Certificate Ref</p>
                <p className="text-sm font-mono font-bold text-emerald-400">{data.certificate_number}</p>
              </div>
            </div>

            {/* Verification Security Statement */}
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3.5 text-xs text-emerald-300/90 flex items-start gap-2.5">
              <HugeiconsIcon icon={ShieldKeyIcon} strokeWidth={2} className="size-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-300">Immutable Verification Record: </span>
                {data.verification_message}
              </div>
            </div>

            {/* General Info & Instrument Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950/70 p-4 rounded-lg border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 text-slate-400 font-medium pb-2 border-b border-slate-800/80">
                  <HugeiconsIcon icon={Building01Icon} strokeWidth={2} className="size-4 text-emerald-400" />
                  Testing Laboratory
                </div>
                <div>
                  <p className="text-slate-400 text-[11px]">Authorized Body</p>
                  <p className="font-bold text-slate-100 text-sm">{data.laboratory_name}</p>
                </div>
                {data.laboratory_accreditation && (
                  <div>
                    <p className="text-slate-400 text-[11px]">Accreditation Number</p>
                    <p className="font-mono text-slate-300">{data.laboratory_accreditation}</p>
                  </div>
                )}
              </div>

              <div className="bg-slate-950/70 p-4 rounded-lg border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 text-slate-400 font-medium pb-2 border-b border-slate-800/80">
                  <HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} className="size-4 text-emerald-400" />
                  Instrument Specifications
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-slate-400 text-[11px]">Manufacturer</p>
                    <p className="font-semibold text-slate-200">{data.instrument_manufacturer}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[11px]">Model</p>
                    <p className="font-semibold text-slate-200">{data.instrument_model}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[11px]">Serial Number</p>
                    <p className="font-mono font-semibold text-slate-200">{data.serial_number}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[11px]">Accuracy Class</p>
                    <p className="font-semibold text-slate-200">Class {data.accuracy_class}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sign-off & Verification Audit Details */}
            <div className="bg-slate-950/70 p-4 rounded-lg border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-slate-400 font-medium text-xs pb-2 border-b border-slate-800/80">
                <HugeiconsIcon icon={UserCheckIcon} strokeWidth={2} className="size-4 text-emerald-400" />
                Laboratory Digital Signatures
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-400 text-[11px]">Evaluated By (Engineer)</p>
                  <p className="font-semibold text-slate-200">{data.evaluated_by}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Date: {data.evaluated_at.slice(0, 10)}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[11px]">Approved & Verified By (Manager)</p>
                  <p className="font-semibold text-emerald-400">{data.approved_by}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Date: {data.approved_at.slice(0, 10)}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Pending Verification State */
          <div className="bg-slate-900/90 border border-amber-500/40 rounded-xl p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2.5} className="size-8" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold tracking-widest text-amber-400 uppercase bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
                  PENDING LABORATORY VERIFICATION
                </span>
                <h2 className="text-xl font-bold text-slate-100 mt-1">Verification Awaiting Approval</h2>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-lg border border-slate-800">
              {data.verification_message || "This evaluation report has been executed by a testing engineer but is currently awaiting official quality approval from the authorized laboratory manager."}
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-3xl mx-auto w-full pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
        <p>METRA — Metrology Evaluation & Test Report Automation Platform</p>
        <p className="text-[10px] text-slate-600 mt-1">OIML R 76-1:2006 (E) Compliance Verification Standard</p>
      </footer>
    </div>
  );
}
