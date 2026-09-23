/**
 * METRA Frontend — services/api/reports.ts
 * Typed API client for laboratory reports.
 */

import { apiGet, apiPost } from "./client";

export interface ReportListItem {
  id: string;
  evaluation_id: string;
  report_number: string;
  instrument_model: string;
  instrument_manufacturer: string;
  serial_number: string;
  generated_by: string;
  generated_at: string;
  status: string;
  evaluation_status?: string;
}

export function listReports(): Promise<ReportListItem[]> {
  return apiGet<ReportListItem[]>("/api/reports");
}

export function getReportDetail(reportId: string): Promise<any> {
  return apiGet<any>(`/api/reports/${reportId}`);
}

export function approveReport(evaluationId: string): Promise<any> {
  return apiPost<any>(`/api/reports/${evaluationId}/approve`, {});
}

export function rejectReport(evaluationId: string, reason: string): Promise<any> {
  return apiPost<any>(`/api/reports/${evaluationId}/reject`, { reason });
}

export function verifyReport(reportId: string): Promise<any> {
  return apiGet<any>(`/api/verify/${reportId}`);
}
