/**
 * METRA — components/evaluation/TestResultsDisplay.tsx
 * Displays structured calculation results from backend engine for any test type.
 */

import type {
  WeighingCalculations,
  RepeatabilityCalculations,
  EccentricityCalculations,
  DiscriminationCalculations,
  RuleReference,
} from "@/types/evaluation";
import { EvaluationStatusBadge } from "./EvaluationStatusBadge";
import { Separator } from "@/components/ui/separator";

// ─── Shared helpers ──────────────────────────────────────────────────────────

function fmt(n: number | undefined | null, decimals = 4): string {
  if (n == null) return "—";
  return Number(n).toFixed(decimals);
}

function RuleReferencesSection({ refs }: { refs: RuleReference[] }) {
  if (!refs || refs.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        OIML References
      </p>
      <div className="space-y-0.5">
        {refs.map((r) => (
          <p key={r.rule_id} className="text-[11px] text-muted-foreground font-mono">
            {r.standard} {r.edition} — §{r.section}
            {r.table ? `, ${r.table}` : ""}
            {r.page ? `, p.${r.page}` : ""}
            {" "}
            <span className="text-foreground/50">[{r.rule_id}]</span>
          </p>
        ))}
      </div>
    </div>
  );
}

// ─── Weighing Test Results ────────────────────────────────────────────────────

function WeighingResults({ data }: { data: WeighingCalculations }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <p className="text-xs font-semibold text-foreground">Weighing Test Results</p>
        <EvaluationStatusBadge status={data.status} />
      </div>
      <p className="text-[11px] text-muted-foreground mb-1">
        E₀ (zero error) = {fmt(data.E0)} {" · "} e = {data.e}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Load L</th>
              <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Indication I</th>
              <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">dL</th>
              <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Error Ec</th>
              <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">MPE (e)</th>
              <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">MPE value</th>
              <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Result</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, i) => (
              <tr key={i} className="border-b border-border/40 hover:bg-secondary/30">
                <td className="py-1.5 px-2 font-mono">{fmt(row.L, 3)}</td>
                <td className="py-1.5 px-2 font-mono">{fmt(row.I, 3)}</td>
                <td className="py-1.5 px-2 font-mono">{fmt(row.dL, 4)}</td>
                <td className={`py-1.5 px-2 font-mono font-semibold ${row.result === "FAIL" ? "text-red-600" : ""}`}>
                  {fmt(row.Ec, 5)}
                </td>
                <td className="py-1.5 px-2 font-mono">±{row.mpe_e}e</td>
                <td className="py-1.5 px-2 font-mono">±{fmt(row.mpe_value, 4)}</td>
                <td className="py-1.5 px-2">
                  <EvaluationStatusBadge status={row.result} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <RuleReferencesSection refs={data.rule_references} />
    </div>
  );
}

// ─── Repeatability Results ────────────────────────────────────────────────────

function RepeatabilityResults({ data }: { data: RepeatabilityCalculations }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <p className="text-xs font-semibold text-foreground">Repeatability Results</p>
        <EvaluationStatusBadge status={data.status} />
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs mb-3">
        <div className="text-muted-foreground">Test Load</div>
        <div className="font-mono">{fmt(data.test_load, 3)}</div>
        <div className="text-muted-foreground">Readings (n={data.n_readings})</div>
        <div className="font-mono">{data.readings.map(r => fmt(r, 4)).join(", ")}</div>
        <div className="text-muted-foreground">Max</div>
        <div className="font-mono">{fmt(data.I_max, 5)}</div>
        <div className="text-muted-foreground">Min</div>
        <div className="font-mono">{fmt(data.I_min, 5)}</div>
        <div className="text-muted-foreground font-semibold">Range (Max − Min)</div>
        <div className={`font-mono font-semibold ${data.status === "FAIL" ? "text-red-600" : ""}`}>
          {fmt(data.range, 5)}
        </div>
        <div className="text-muted-foreground">MPE limit (±{data.mpe_e}e)</div>
        <div className="font-mono">±{fmt(data.mpe_value, 5)}</div>
        <div className="text-muted-foreground font-semibold">Decision criterion</div>
        <div className="text-[11px]">Range ≤ |MPE| (§3.6.1)</div>
      </div>
      <RuleReferencesSection refs={data.rule_references} />
    </div>
  );
}

// ─── Eccentricity Results ────────────────────────────────────────────────────

function EccentricityResults({ data }: { data: EccentricityCalculations }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <p className="text-xs font-semibold text-foreground">Eccentricity Results</p>
        <EvaluationStatusBadge status={data.status} />
      </div>
      <p className="text-[11px] text-muted-foreground mb-1">
        E₀ (zero error) = {fmt(data.E0)} {" · "} e = {data.e}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Position</th>
              <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Load L</th>
              <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Indication I</th>
              <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">dL</th>
              <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Error Ec</th>
              <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">MPE</th>
              <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Result</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, i) => (
              <tr key={i} className="border-b border-border/40 hover:bg-secondary/30">
                <td className="py-1.5 px-2 font-semibold capitalize">{row.position}</td>
                <td className="py-1.5 px-2 font-mono">{fmt(row.L, 3)}</td>
                <td className="py-1.5 px-2 font-mono">{fmt(row.I, 3)}</td>
                <td className="py-1.5 px-2 font-mono">{fmt(row.dL, 4)}</td>
                <td className={`py-1.5 px-2 font-mono font-semibold ${row.result === "FAIL" ? "text-red-600" : ""}`}>
                  {fmt(row.Ec, 5)}
                </td>
                <td className="py-1.5 px-2 font-mono">±{fmt(row.mpe_value, 4)}</td>
                <td className="py-1.5 px-2">
                  <EvaluationStatusBadge status={row.result} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <RuleReferencesSection refs={data.rule_references} />
    </div>
  );
}

// ─── Discrimination Results ──────────────────────────────────────────────────

function DiscriminationResults({ data }: { data: DiscriminationCalculations }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <p className="text-xs font-semibold text-foreground">Discrimination Results</p>
        <EvaluationStatusBadge status={data.status} />
      </div>
      <p className="text-[11px] text-muted-foreground mb-1">
        d = {data.d} · Extra load = 1.4 × d = {fmt(data.extra_load, 5)}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Load</th>
              <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">I (before)</th>
              <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">I (after 1.4d)</th>
              <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Expected (I+d)</th>
              <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Result</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, i) => (
              <tr key={i} className="border-b border-border/40 hover:bg-secondary/30">
                <td className="py-1.5 px-2 font-semibold">{row.load_label}</td>
                <td className="py-1.5 px-2 font-mono">{fmt(row.I_before, 4)}</td>
                <td className={`py-1.5 px-2 font-mono font-semibold ${row.result === "FAIL" ? "text-red-600" : ""}`}>
                  {fmt(row.I_after, 4)}
                </td>
                <td className="py-1.5 px-2 font-mono text-muted-foreground">{fmt(row.expected_after, 4)}</td>
                <td className="py-1.5 px-2">
                  <EvaluationStatusBadge status={row.result} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <RuleReferencesSection refs={data.rule_references} />
    </div>
  );
}

// ─── Generic Results Display (for standard evaluator output) ──────────────────

function GenericResults({ data }: { data: unknown }) {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const status = d.status as string;
  const rows = Array.isArray(d.rows) ? d.rows : null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <p className="text-xs font-semibold text-foreground">Calculation Results</p>
        {status && <EvaluationStatusBadge status={status} />}
      </div>
      {d.message && (
        <p className="text-xs text-muted-foreground mb-2">{String(d.message)}</p>
      )}
      {rows && rows.length > 0 && (
        <pre className="text-[11px] bg-secondary/50 rounded p-3 overflow-x-auto font-mono text-foreground">
          {JSON.stringify(rows, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────

interface TestResultsDisplayProps {
  testId: string;
  calculations: unknown;
  status: string;
}

export function TestResultsDisplay({ testId, calculations, status }: TestResultsDisplayProps) {
  if (!calculations) {
    return (
      <div className="rounded-md bg-secondary/50 p-4 text-xs text-muted-foreground">
        No calculation results yet. Enter observations and click Calculate.
      </div>
    );
  }

  const data = calculations as Record<string, unknown>;

  return (
    <div>
      <Separator className="my-4" />
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Calculation Results
      </h4>

      {testId === "TEST-A.4.4.1" && (
        <WeighingResults data={data as unknown as WeighingCalculations} />
      )}
      {testId === "TEST-A.4.10" && (
        <RepeatabilityResults data={data as unknown as RepeatabilityCalculations} />
      )}
      {testId === "TEST-A.4.7" && (
        <EccentricityResults data={data as unknown as EccentricityCalculations} />
      )}
      {testId === "TEST-A.4.8.2" && (
        <DiscriminationResults data={data as unknown as DiscriminationCalculations} />
      )}
      {!["TEST-A.4.4.1", "TEST-A.4.10", "TEST-A.4.7", "TEST-A.4.8.2"].includes(testId) && (
        <GenericResults data={data} />
      )}
    </div>
  );
}
