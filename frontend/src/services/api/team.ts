/**
 * METRA Frontend — services/api/team.ts
 * Typed API client for laboratory team members.
 */

import { apiGet, apiPost, apiPatch } from "./client";

export interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: "owner" | "admin" | "engineer";
  is_active: boolean;
  created_at: string;
}

export interface CreateTeamMemberInput {
  full_name: string;
  email: string;
  password: string;
  role: "admin" | "engineer";
}

export function listTeamMembers(): Promise<TeamMember[]> {
  return apiGet<TeamMember[]>("/api/team");
}

export function createTeamMember(input: CreateTeamMemberInput): Promise<TeamMember> {
  return apiPost<TeamMember>("/api/team", input);
}

export function updateTeamMemberStatus(
  memberId: string,
  isActive: boolean
): Promise<TeamMember> {
  return apiPatch<TeamMember>(`/api/team/${memberId}/status`, { is_active: isActive });
}
