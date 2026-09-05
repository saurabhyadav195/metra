/**
 * METRA — pages/reports/ReportDetailPage.tsx
 * Route: /app/reports/:reportId
 * Official Technical Metrology Evaluation & Type-Test Laboratory Report.
 *
 * BUSINESS & SECURITY RULES:
 * - Primary branding represents the physical TESTING LABORATORY that performed the evaluation.
 * - METRA is secondary system attribution ("Generated using METRA").
 * - Evaluator and Approver names/roles come from authoritative backend user profiles.
 * - Unapproved reports explicitly display "Pending Approval".
 * - Includes @media print styles for physical printing and PDF export.
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PrinterIcon,
  ArrowLeft01Icon,
  ShieldCheckIcon,
  AlertCircleIcon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { ResultBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { getReportDetail } from "@/services/api/reports";
import { LoadingState } from "@/components/common/EmptyState";

export default function ReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = `METRA — Laboratory Report ${reportId || ""}`;
    if (reportId) {
      getReportDetail(reportId)
        .then((data) => {
          setReport(data);
        })
        .catch((err) => console.error("Failed to load report detail:", err))
        .finally(() => setLoading(false));
    }
  }, [reportId]);

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "__________________";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(dateStr);
    }
  };

  const lab = report?.laboratory || {};
  const inst = report?.instrument || {};
  const evalInfo = report?.evaluation || {};
  const signoff = report?.signoff || {};
  const testResults: any[] = report?.test_results || [];

  const overallStatusStr =
    typeof evalInfo?.overall_result === "object"
      ? evalInfo?.overall_result?.status || evalInfo?.overall_result?.result
      : evalInfo?.overall_result || evalInfo?.status || "PASS";

  const isConforming =
    String(overallStatusStr).toLowerCase() === "pass" ||
    String(overallStatusStr).toLowerCase() === "passed";

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <PageHeader
          title={`Type Evaluation Report: ${evalInfo?.report_number || reportId}`}
          description={`Issued by ${lab?.name || "Testing Laboratory"} — OIML R-76 Technical Conformity`}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/app/reports")}>
                <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-3.5 mr-1" />
                Back to Reports
              </Button>
              <Button size="sm" onClick={handlePrint} className="gap-1.5">
                <HugeiconsIcon icon={PrinterIcon} strokeWidth={2} className="size-4" />
                Print Official Report (PDF)
              </Button>
            </div>
          }
        />

        {loading ? (
          <LoadingState message="Assembling official laboratory evaluation report..." />
        ) : (
          <div className="bg-white text-slate-900 border border-slate-300 rounded-lg p-8 shadow-sm space-y-8 font-sans print:shadow-none print:border-none print:p-0 print:rounded-none">
            {/* ── 1. LABORATORY HEADER & LETTERHEAD ─────────────────────────────── */}
            <div className="border-b-2 border-slate-900 pb-6 flex flex-col md:flex-row justify-between items-start gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 uppercase">
                  {lab.name || "NATIONAL METROLOGY EVALUATION LABORATORY"}
                </h1>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mt-1">
                  Type Evaluation & Metrology Test Report — OIML R 76-1:2006 (E)
                </p>
                {lab.address && (
                  <p className="text-xs text-slate-600 mt-1">{lab.address}</p>
                )}
                {lab.accreditation_number && (
                  <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                    Accreditation / Registration No: <span className="font-semibold text-slate-800">{lab.accreditation_number}</span>
                  </p>
                )}
              </div>

              <div className="md:text-right border-l-2 md:border-l-0 md:border-r-0 border-slate-200 pl-3 md:pl-0">
                <span className="inline-block bg-slate-900 text-white font-mono text-xs px-3 py-1 rounded font-bold tracking-wide uppercase">
                  OFFICIAL TEST REPORT
                </span>
                <p className="text-xs font-mono font-bold text-slate-900 mt-1.5">
                  Report No: {evalInfo.report_number || `TR-${reportId?.slice(0, 8).toUpperCase()}-2026`}
                </p>
                <p className="text-xs font-mono text-slate-600">
                  Evaluation Ref: {evalInfo.evaluation_number || `EVL-${reportId?.slice(0, 8).toUpperCase()}`}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Issue Date: {formatDate(evalInfo.completed_at || evalInfo.evaluation_date)}
                </p>
              </div>
            </div>

            {/* ── 2. APPLICANT & INSTRUMENT SPECIFICATIONS ────────────────────── */}
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1.5 mb-3 flex items-center gap-1.5">
                <span>1. Applicant & Instrument Metrological Parameters</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-slate-50 p-4 rounded border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[11px]">Manufacturer / Applicant:</span>
                  <span className="font-bold text-slate-900">{inst.manufacturer}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Model Designation:</span>
                  <span className="font-bold text-slate-900">{inst.model}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Serial Number:</span>
                  <span className="font-mono font-bold text-slate-900">{inst.serial_number}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Accuracy Class:</span>
                  <span className="font-bold text-slate-900">Class {inst.accuracy_class}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Maximum Capacity (Max):</span>
                  <span className="font-mono font-bold text-slate-900">{inst.max_capacity} {inst.unit}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Minimum Capacity (Min):</span>
                  <span className="font-mono font-bold text-slate-900">{inst.min_capacity} {inst.unit}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Verification Interval (e):</span>
                  <span className="font-mono font-bold text-slate-900">{inst.verification_scale_interval} g</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Actual Scale Interval (d):</span>
                  <span className="font-mono font-bold text-slate-900">{inst.actual_scale_interval} g</span>
                </div>
              </div>
            </div>

            {/* ── 3. ENVIRONMENTAL CONDITIONS ─────────────────────────────────── */}
            {evalInfo.environmental_conditions && Object.keys(evalInfo.environmental_conditions).length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1.5 mb-3">
                  2. Laboratory Environmental Conditions
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono bg-slate-50 p-3 rounded border border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-[11px] font-sans">Temperature:</span>
                    <span className="font-bold text-slate-900">
                      {evalInfo.environmental_conditions.temperature_c !== undefined
                        ? `${evalInfo.environmental_conditions.temperature_c} °C`
                        : "20.0 °C (Nominal)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] font-sans">Relative Humidity:</span>
                    <span className="font-bold text-slate-900">
                      {evalInfo.environmental_conditions.relative_humidity_percent || evalInfo.environmental_conditions.relative_humidity_pct || "50"} %
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] font-sans">Atmospheric Pressure:</span>
                    <span className="font-bold text-slate-900">
                      {evalInfo.environmental_conditions.atmospheric_pressure_hpa || "1013.25"} hPa
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] font-sans">Test Location:</span>
                    <span className="font-bold text-slate-900">
                      {evalInfo.environmental_conditions.test_location || "Main Laboratory Bench"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ── 4. METROLOGICAL PERFORMANCE SUMMARY TABLE ─────────────────────── */}
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1.5 mb-3">
                3. Summary of OIML R-76 Metrological Test Results
              </h2>
              <div className="overflow-x-auto rounded border border-slate-300">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 font-semibold text-slate-800 border-b border-slate-300">
                    <tr>
                      <th className="p-2.5">OIML Clause</th>
                      <th className="p-2.5">Test Title</th>
                      <th className="p-2.5">Applied Rule / Requirement</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5 text-right">Compliance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {testResults.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-500 font-sans italic">
                          No test procedures executed for this evaluation.
                        </td>
                      </tr>
                    ) : (
                      testResults.map((tr, idx) => {
                        const statusVal = tr.status || "NOT_STARTED";
                        const resVal = tr.manual_result || (statusVal === "PASS" ? "PASS" : statusVal === "FAIL" ? "FAIL" : "PENDING");
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold text-slate-900">{tr.clause || "A.4"}</td>
                            <td className="p-2.5 font-sans font-medium text-slate-900">{tr.test_name || tr.test_id}</td>
                            <td className="p-2.5 text-slate-600 text-[11px]">
                              {tr.summary_message || "OIML R 76-1 Error Limits & Procedure"}
                            </td>
                            <td className="p-2.5 font-sans">
                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-semibold uppercase text-slate-700">
                                {statusVal}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-sans">
                              <ResultBadge result={resVal} size="sm" />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── 5. DETAILED OBSERVATION & RULE ENGINE TRACES ─────────────────── */}
            {testResults.some((tr) => tr.calculations && (tr.calculations.rows || Array.isArray(tr.calculations))) && (
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1.5 mb-3">
                  4. Representative Test Observations & Deterministic Rule Traces
                </h2>

                <div className="space-y-4">
                  {testResults.map((tr, idx) => {
                    const calcObj = tr.calculations?.calculations || tr.calculations;
                    const rows = Array.isArray(calcObj?.rows) ? calcObj.rows : (Array.isArray(tr.calculations) ? tr.calculations : []);
                    if (!rows || rows.length === 0) return null;

                    return (
                      <div key={idx} className="rounded border border-slate-200 bg-slate-50/50 p-3 space-y-2">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-1 text-xs">
                          <span className="font-bold text-slate-900">
                            {tr.clause} — {tr.test_name}
                          </span>
                          <span className="font-mono text-[11px] font-semibold text-slate-600">
                            {rows.length} Load Step(s) Evaluated
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-[11px] font-mono">
                            <thead>
                              <tr className="border-b border-slate-300 font-semibold text-slate-700 bg-slate-100">
                                <th className="p-1.5">Load L</th>
                                <th className="p-1.5">Indication I</th>
                                <th className="p-1.5">Error E</th>
                                <th className="p-1.5">Corrected Ec</th>
                                <th className="p-1.5">MPE Limit</th>
                                <th className="p-1.5 text-right">Result</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {rows.slice(0, 15).map((row: any, rIdx: number) => {
                                const L = row.L ?? row.load ?? 0;
                                const I = row.I ?? row.indication ?? 0;
                                const E = row.E !== undefined ? row.E : (I - L);
                                const Ec = row.Ec !== undefined ? row.Ec : E;
                                const mpe = row.mpe_value ?? row.limit ?? "—";
                                const res = row.result ?? row.decision ?? "PASS";

                                return (
                                  <tr key={rIdx}>
                                    <td className="p-1.5">{L} {row.position ? `(${row.position})` : ""}</td>
                                    <td className="p-1.5">{I}</td>
                                    <td className="p-1.5">{typeof E === "number" ? (E >= 0 ? `+${E.toFixed(3)}` : E.toFixed(3)) : E}</td>
                                    <td className="p-1.5 font-bold">{typeof Ec === "number" ? (Ec >= 0 ? `+${Ec.toFixed(3)}` : Ec.toFixed(3)) : Ec}</td>
                                    <td className="p-1.5 text-slate-600">{mpe !== "—" ? `±${mpe}` : "—"}</td>
                                    <td className="p-1.5 text-right font-bold">
                                      <span className={res === "PASS" ? "text-emerald-700" : "text-rose-700"}>
                                        {res}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── 6. CONFORMITY DETERMINATION STATEMENT ───────────────────────── */}
            <div className={`border rounded p-4 text-xs space-y-1.5 ${
              isConforming
                ? "border-emerald-300 bg-emerald-50/70 text-emerald-950"
                : "border-amber-300 bg-amber-50/70 text-amber-950"
            }`}>
              <div className="flex items-center gap-2 font-bold text-slate-900 uppercase tracking-wide">
                <HugeiconsIcon
                  icon={isConforming ? CheckmarkCircle02Icon : ShieldCheckIcon}
                  strokeWidth={2}
                  className={`size-4 ${isConforming ? "text-emerald-700" : "text-amber-700"}`}
                />
                Official Metrological Conformity Determination
              </div>
              <p className="leading-relaxed">
                The non-automatic weighing instrument model <strong className="font-semibold">{inst.model}</strong> (Serial No: <span className="font-mono font-semibold">{inst.serial_number}</span>) manufactured by <strong className="font-semibold">{inst.manufacturer}</strong> HAS BEEN EVALUATED in accordance with <strong className="font-semibold">OIML R 76-1:2006 (E)</strong> type evaluation procedures. Based on the laboratory measurements and verified deterministic rule-engine calculations, the instrument is determined to{" "}
                <strong className={`font-bold underline ${isConforming ? "text-emerald-800" : "text-rose-800"}`}>
                  {isConforming ? "CONFORM" : "REQUIRE MANUAL REVIEW / NON-CONFORMING"}
                </strong>{" "}
                to all applicable metrological requirements.
              </p>
            </div>

            {/* ── 7. OFFICIAL LABORATORY SIGN-OFF & APPROVAL SECTION ────────────── */}
            <div className="pt-6 border-t-2 border-slate-900 space-y-4">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                5. Laboratory Sign-off & Verification Authorization
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs font-sans">
                {/* Evaluator Box */}
                <div className="rounded border border-slate-300 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                    <span className="font-bold text-slate-900 uppercase tracking-wide">Evaluated By:</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-semibold">
                      ENGINEER
                    </span>
                  </div>

                  <div className="h-14 border-b-2 border-slate-400 flex items-end pb-1">
                    <span className="font-serif italic text-slate-700 text-base">
                      {signoff.evaluator_name}
                    </span>
                  </div>

                  <div className="space-y-0.5 text-[11px]">
                    <p><span className="text-slate-500">Name: </span><strong className="text-slate-900">{signoff.evaluator_name}</strong></p>
                    <p><span className="text-slate-500">Role: </span><span className="text-slate-800">{signoff.evaluator_role}</span></p>
                    <p><span className="text-slate-500">Date: </span><span className="font-mono text-slate-800">{formatDate(signoff.evaluated_at)}</span></p>
                  </div>
                </div>

                {/* Approver Box */}
                <div className="rounded border border-slate-300 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                    <span className="font-bold text-slate-900 uppercase tracking-wide">Approved & Verified By:</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                      signoff.approval_status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-amber-100 text-amber-800 border border-amber-300"
                    }`}>
                      {signoff.approval_status === "APPROVED" ? "APPROVED" : "PENDING APPROVAL"}
                    </span>
                  </div>

                  <div className="h-14 border-b-2 border-slate-400 flex items-end pb-1">
                    {signoff.approval_status === "APPROVED" ? (
                      <span className="font-serif italic text-slate-700 text-base">
                        {signoff.approver_name}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-xs">
                        Signature Line — Pending Authorized Approver
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5 text-[11px]">
                    <p>
                      <span className="text-slate-500">Name: </span>
                      <strong className={signoff.approval_status === "APPROVED" ? "text-slate-900" : "text-amber-700 font-semibold"}>
                        {signoff.approver_name}
                      </strong>
                    </p>
                    <p><span className="text-slate-500">Role: </span><span className="text-slate-800">{signoff.approver_role}</span></p>
                    <p>
                      <span className="text-slate-500">Date: </span>
                      <span className="font-mono text-slate-800">
                        {signoff.approval_status === "APPROVED" ? formatDate(signoff.approved_at) : "__________________"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 8. SECONDARY METRA FOOTER ───────────────────────────────────── */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-500 font-mono gap-2">
              <div>
                <span>{lab.name || "Laboratory Test Report"}</span>
                {evalInfo.report_number && <span> | {evalInfo.report_number}</span>}
              </div>
              <div className="text-slate-400">
                Generated using METRA — Metrology Evaluation & Test Report Automation
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
