/**
 * METRA Frontend — types/evaluation.ts
 * TypeScript types for OIML R-76 evaluation workflow.
 */

// ─── Status Enums ───────────────────────────────────────────────────────────

export type EvaluationStatus =
  | "DRAFT"
  | "IN_PROGRESS"
  | "PASS"
  | "FAIL"
  | "REQUIRES_REVIEW"
  | "COMPLETED"
  | "PASSED"
  | "FAILED";

export type TestStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "PASS"
  | "FAIL"
  | "MANUAL_REVIEW"
  | "NOT_APPLICABLE"
  | "COMPLETED";

export type ApplicabilityStatus =
  | "APPLICABLE"
  | "NOT_APPLICABLE"
  | "MANUAL_REVIEW";

// ─── Environmental Conditions ────────────────────────────────────────────────

export interface EnvironmentalConditions {
  temperature_c?: number | null;
  relative_humidity_pct?: number | null;
  atmospheric_pressure_hpa?: number | null;
  test_location?: string | null;
  start_datetime?: string | null;
  end_datetime?: string | null;
  notes?: string | null;
}

// ─── Evaluation ──────────────────────────────────────────────────────────────

export interface Evaluation {
  id: string;
  evaluation_number?: string;
  laboratory_id: string;
  instrument_id: string;
  created_by: string;
  status: EvaluationStatus | string;
  oiml_edition: string;
  evaluation_date: string | null;
  started_at: string;
  completed_at: string | null;
  overall_result: OverallResult | any;
  environmental_conditions: EnvironmentalConditions | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;

  // Joined from instruments table
  instruments: EvaluationInstrument | null;

  // Joined test results
  test_results: EvaluationTestResult[];
}

export interface EvaluationInstrument {
  id: string;
  manufacturer: string;
  model_designation: string;
  model?: string;
  serial_number: string;
  instrument_type: string;
  accuracy_class: string | null;
  max_capacity: number | null;
  min_capacity: number | null;
  verification_scale_interval: number | null;
  actual_scale_interval: number | null;
  verification_intervals: number | null;
  submission_date: string | null;
  laboratory_id: string;
}

export interface OverallResult {
  result?: string;
  total?: number;
  applicable?: number;
  passed?: number;
  failed?: number;
  review?: number;
  status?: EvaluationStatus;
  finalized_by?: string;
  finalized_at?: string;
}

// ─── Test Results ─────────────────────────────────────────────────────────────

export interface EvaluationTestResult {
  id: string;
  evaluation_id?: string;
  laboratory_id?: string;
  test_id: string;
  test_name: string;
  clause: string;
  status: TestStatus | string;
  applicability_status: ApplicabilityStatus | string;
  applicability_reason?: string | null;
  manual_result?: string | null;
  comment?: string | null;
  summary_message?: string | null;
  calculated_at?: string | null;
  created_at?: string;
  updated_at?: string | null;

  // Populated in get_test_detail
  observations?: Record<string, unknown>;
  calculations?: CalculationResult[] | any;
  validations?: ValidationResult[] | any;
}

export interface CalculationResult {
  id?: string;
  calculation_id: string;
  name?: string;
  formula?: string;
  inputs?: Record<string, unknown>;
  output?: unknown;
  decision?: string | null;
  limit_val?: string | null;
  source?: Record<string, unknown>;
}

export interface ValidationResult {
  id?: string;
  rule_id: string;
  param_name?: string | null;
  status: "PASS" | "FAIL" | "WARNING" | string;
  message: string;
}

// ─── Calculation Output Schemas (returned from backend) ──────────────────────

export interface RuleReference {
  rule_id: string;
  section: string;
  page?: number;
  table?: string;
  standard: string;
  edition: string;
}

// ─── API Request / Response ───────────────────────────────────────────────────

export interface CreateEvaluationPayload {
  instrument_id: string;
  evaluation_date?: string;
  oiml_version?: string;
  oiml_edition?: string;
  environmental_conditions?: {
    temperature_c?: number;
    relative_humidity_percent?: number;
    relative_humidity_pct?: number;
    atmospheric_pressure_hpa?: number;
    test_location?: string;
    notes?: string;
  };
}

export type CreateEvaluationRequest = CreateEvaluationPayload;

export interface SaveObservationsRequest {
  observations: Record<string, unknown>;
}

export interface CalculateTestResponse {
  test_id: string;
  test_name?: string;
  status?: TestStatus | string;
  overall_decision?: string;
  summary_message?: string;
  calculations?: any[];
  rule_references?: RuleReference[];
}

export interface CompleteTestRequest {
  manual_result?: "PASS" | "FAIL" | "N/A" | string;
  comment?: string;
}

// ─── Legacy/Form calculation & observation interfaces ──────────────────────────

export interface WeighingCalculations {
  status: string;
  E0?: number;
  e?: number;
  verification_type?: string;
  rows?: any[];
  rule_references?: RuleReference[];
  message?: string;
}

export interface RepeatabilityCalculations {
  status: string;
  test_load?: number;
  readings?: number[];
  I_max?: number;
  I_min?: number;
  range?: number;
  mpe_value?: number;
  mpe_e?: number;
  n_readings?: number;
  rule_references?: RuleReference[];
  message?: string;
}

export interface EccentricityCalculations {
  status: string;
  E0?: number;
  e?: number;
  rows?: any[];
  rule_references?: RuleReference[];
  message?: string;
}

export interface DiscriminationCalculations {
  status: string;
  d?: number;
  extra_load?: number;
  rows?: any[];
  rule_references?: RuleReference[];
  message?: string;
}

export interface WeighingObservations {
  verification_type?: "initial" | "service";
  readings?: any[];
  load_steps?: any[];
}
