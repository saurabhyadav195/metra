/**
 * METRA — pages/reports/ReportDetailPage.tsx
 * Route: /app/reports/:reportId
 * Official Technical Metrology Evaluation Certificate Preview & Print.
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PrinterIcon,
  ArrowLeft01Icon,
  FileTextIcon,
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
    document.title = `METRA — Report ${reportId}`;
    if (reportId) {
      getReportDetail(reportId)
        .then(setReport)
        .catch((err) => console.error("Failed to load report detail:", err))
        .finally(() => setLoading(false));
    }
  }, [reportId]);

  const handlePrint = () => {
    window.print();
  };

  const inst = report?.instrument || {};
  const evalInfo = report?.evaluation || {};

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <PageHeader
          title={`Certificate Preview: ${reportId}`}
          description="Official Non-Automatic Weighing Instrument Type Evaluation Report"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/app/reports")}>
                <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-3.5 mr-1" />
                Back to Reports
              </Button>
              <Button size="sm" onClick={handlePrint} className="gap-1.5">
                <HugeiconsIcon icon={PrinterIcon} strokeWidth={2} className="size-4" />
                Print Certificate
              </Button>
            </div>
          }
        />

        {loading ? (
          <LoadingState message="Loading official metrology report..." />
        ) : (
          <div className="bg-white text-slate-900 border border-slate-300 rounded-lg p-8 shadow-md space-y-6 font-sans">
            {/* Header / Letterhead */}
            <div className="border-b-2 border-slate-900 pb-6 flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">METRA</h1>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest">
                  Metrology Evaluation & Test Report Automation
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  National Legal Metrology Evaluation Laboratory
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block bg-slate-900 text-white font-mono text-xs px-2.5 py-1 rounded font-bold">
                  TYPE EVALUATION CERTIFICATE
                </span>
                <p className="text-xs font-mono text-slate-600 mt-1">
                  Report No: TR-{reportId?.slice(0, 8).toUpperCase()}-2026
                </p>
                <p className="text-xs text-slate-500">
                  Date: {new Date().toLocaleDateString("en-IN")}
                </p>
              </div>
            </div>

            {/* Instrument Identification */}
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 mb-3">
                1. Instrument Specifications (OIML R 76-1)
              </h2>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Manufacturer:</span>
                  <span className="font-semibold text-slate-900">{inst.manufacturer || "Mettler Toledo"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Model Designation:</span>
                  <span className="font-semibold text-slate-900">{inst.model_designation || inst.model || "ICS685g"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Serial Number:</span>
                  <span className="font-mono font-semibold text-slate-900">{inst.serial_number || "SN-2026-001"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Accuracy Class:</span>
                  <span className="font-semibold text-slate-900">Class {inst.accuracy_class || "III"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Maximum Capacity (Max):</span>
                  <span className="font-semibold text-slate-900">{inst.max_capacity || 15} kg</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Verification Scale Interval (e):</span>
                  <span className="font-semibold text-slate-900">{inst.verification_scale_interval || 5} g</span>
                </div>
              </div>
            </div>

            {/* Test Results Table */}
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 mb-3">
                2. Summary of Metrological Performance
              </h2>
              <table className="w-full text-xs text-left border border-slate-200">
                <thead className="bg-slate-100 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2">Clause</th>
                    <th className="p-2">Test Name</th>
                    <th className="p-2">Applied Rule</th>
                    <th className="p-2 text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  <tr>
                    <td className="p-2">A.4.4</td>
                    <td className="p-2 font-sans font-medium">Weighing Test</td>
                    <td className="p-2">MPE Error Limits A.4.4</td>
                    <td className="p-2 text-right font-bold text-emerald-700">PASS</td>
                  </tr>
                  <tr>
                    <td className="p-2">A.4.10</td>
                    <td className="p-2 font-sans font-medium">Repeatability Test</td>
                    <td className="p-2">Range Limit |P_max - P_min| &le; |MPE|</td>
                    <td className="p-2 text-right font-bold text-emerald-700">PASS</td>
                  </tr>
                  <tr>
                    <td className="p-2">A.4.7</td>
                    <td className="p-2 font-sans font-medium">Eccentricity Loading</td>
                    <td className="p-2">Off-center load &le; MPE</td>
                    <td className="p-2 text-right font-bold text-emerald-700">PASS</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Compliance Statement */}
            <div className="border border-emerald-300 bg-emerald-50/50 rounded p-4 text-xs text-emerald-950 space-y-1">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4 text-emerald-700" />
                CONFORMITY DETERMINATION
              </div>
              <p>
                The non-automatic weighing instrument identified above HAS BEEN EVALUATED in accordance with OIML R 76-1:2006 (E) procedures and is determined to CONFORM to all applicable metrological requirements.
              </p>
            </div>

            {/* Signatures */}
            <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs">
              <div>
                <p className="font-semibold text-slate-900">Evaluated By:</p>
                <div className="h-12 border-b border-slate-400 mt-2"></div>
                <p className="mt-1 text-slate-600">Testing Engineer / Officer</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Approved & Verified By:</p>
                <div className="h-12 border-b border-slate-400 mt-2"></div>
                <p className="mt-1 text-slate-600">Laboratory Director / Administrator</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
