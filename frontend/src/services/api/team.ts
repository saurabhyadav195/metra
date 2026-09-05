/**
 * METRA Frontend — services/api/team.ts
 * Typed API client for laboratory team members.
 */

import { apiGet } from "./client";

export interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: "owner" | "admin" | "engineer";
  is_active: boolean;
  created_at: string;
}

export function listTeamMembers(): Promise<TeamMember[]> {
  return apiGet<TeamMember[]>("/api/team");
}
