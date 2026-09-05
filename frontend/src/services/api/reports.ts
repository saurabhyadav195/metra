/**
 * METRA Frontend — services/api/reports.ts
 * Typed API client for laboratory reports.
 */

import { apiGet } from "./client";

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
  overall_result?: string;
}

export function listReports(): Promise<ReportListItem[]> {
  return apiGet<ReportListItem[]>("/api/reports");
}

export function getReportDetail(reportId: string): Promise<any> {
  return apiGet<any>(`/api/reports/${reportId}`);
}
