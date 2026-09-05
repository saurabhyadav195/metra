/**
 * METRA Frontend — services/api/settings.ts
 * Typed API client for laboratory settings.
 */

import { apiGet, apiPatch } from "./client";

export interface LabSettings {
  id: string;
  name: string;
  code?: string;
  address?: string;
  contact_email?: string;
  contact_phone?: string;
  accreditation_number?: string;
  default_oiml_edition: string;
}

export function getLabSettings(): Promise<LabSettings> {
  return apiGet<LabSettings>("/api/settings");
}

export function updateLabSettings(data: Partial<LabSettings>): Promise<LabSettings> {
  return apiPatch<LabSettings>("/api/settings", data);
}
