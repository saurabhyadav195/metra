/**
 * METRA Frontend — services/api/dashboard.ts
 * Typed API client for real dashboard statistics from FastAPI backend.
 */

import { apiGet } from "./client";

export interface DashboardStats {
  active_evaluations: number;
  completed_evaluations: number;
  total_instruments: number;
  total_reports: number;
  engineers_count: number;
  recent_evaluations: Array<{
    id: string;
    evaluation_number: string;
    instrument_id: string;
    instrument_model: string;
    instrument_manufacturer: string;
    serial_number: string;
    status: string;
    overall_result?: string;
    created_at: string;
    updated_at: string;
  }>;
  recent_activity: Array<{
    id: string;
    type: string;
    message: string;
    actor: string;
    created_at: string;
  }>;
}

export function getDashboardStats(): Promise<DashboardStats> {
  return apiGet<DashboardStats>("/api/dashboard/stats");
}
