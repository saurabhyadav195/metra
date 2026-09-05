/**
 * METRA Frontend — services/api/evaluations.ts
 * Typed API functions for OIML R-76 evaluation workflow operations.
 */

import type {
  Evaluation,
  EvaluationTestResult,
  EnvironmentalConditions,
  CalculateTestResponse,
  CompleteTestRequest,
  CreateEvaluationPayload,
} from "@/types/evaluation";
import { apiGet, apiPost, apiPatch } from "./client";

// ─── Evaluation CRUD ──────────────────────────────────────────────────────────

export function createEvaluation(
  payload: CreateEvaluationPayload | string
): Promise<Evaluation> {
  const reqBody = typeof payload === "string" ? { instrument_id: payload } : payload;
  return apiPost<Evaluation>("/api/evaluations", reqBody);
}

export function listEvaluations(): Promise<Evaluation[]> {
  return apiGet<Evaluation[]>("/api/evaluations");
}

export function getEvaluation(evaluationId: string): Promise<Evaluation> {
  return apiGet<Evaluation>(`/api/evaluations/${evaluationId}`);
}

export function updateEvaluation(
  evaluationId: string,
  data: { notes?: string; evaluation_date?: string }
): Promise<Evaluation> {
  return apiPatch<Evaluation>(`/api/evaluations/${evaluationId}`, data);
}

// ─── Environmental Conditions ─────────────────────────────────────────────────

export function saveEnvironmentalConditions(
  evaluationId: string,
  conditions: EnvironmentalConditions
): Promise<Evaluation> {
  return apiPatch<Evaluation>(
    `/api/evaluations/${evaluationId}/environmental`,
    conditions
  );
}

// ─── Test Operations ──────────────────────────────────────────────────────────

export function getTestDetail(
  evaluationId: string,
  testId: string
): Promise<EvaluationTestResult> {
  return apiGet<EvaluationTestResult>(
    `/api/evaluations/${evaluationId}/tests/${testId}`
  );
}

export function saveObservations(
  evaluationId: string,
  testId: string,
  observations: Record<string, unknown>
): Promise<EvaluationTestResult> {
  return apiPost<EvaluationTestResult>(
    `/api/evaluations/${evaluationId}/tests/${testId}`,
    { observations }
  );
}

export function calculateTest(
  evaluationId: string,
  testId: string
): Promise<CalculateTestResponse> {
  return apiPost<CalculateTestResponse>(
    `/api/evaluations/${evaluationId}/tests/${testId}/calculate`,
    {}
  );
}

export function completeTest(
  evaluationId: string,
  testId: string,
  data: CompleteTestRequest
): Promise<EvaluationTestResult> {
  return apiPost<EvaluationTestResult>(
    `/api/evaluations/${evaluationId}/tests/${testId}/complete`,
    data
  );
}

// ─── Finalization ─────────────────────────────────────────────────────────────

export function finalizeEvaluation(evaluationId: string): Promise<Evaluation> {
  return apiPost<Evaluation>(`/api/evaluations/${evaluationId}/evaluate`, {});
}

// ─── Report Data ─────────────────────────────────────────────────────────────

export function getReportData(evaluationId: string): Promise<unknown> {
  return apiGet<unknown>(`/api/evaluations/${evaluationId}/report-data`);
}
