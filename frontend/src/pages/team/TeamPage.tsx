/**
 * METRA — pages/team/TeamPage.tsx
 * Route: /app/team
 * Lists laboratory engineers and administrators.
 * Backed by FastAPI backend with laboratory isolation.
 */

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserGroupIcon,
  UserAddIcon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState, LoadingState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { listTeamMembers, type TeamMember } from "@/services/api/team";

export default function TeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "METRA — Laboratory Team";
    listTeamMembers()
      .then(setTeam)
      .catch((err) => console.error("Failed to load team members:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <PageHeader
        title="Laboratory Personnel"
        description="Engineers, administrators, and laboratory personnel isolated to your organization"
      />

      <div className="rounded-lg border border-border bg-card shadow-sm">
        {loading ? (
          <LoadingState message="Loading laboratory team members..." />
        ) : team.length === 0 ? (
          <EmptyState
            icon={UserGroupIcon}
            title="No personnel records found"
            description="Active members registered in your laboratory will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {team.map((member) => (
                  <tr key={member.id} className="hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground text-xs">
                      {member.full_name}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                      {member.email}
                    </td>
                    <td className="px-4 py-3 text-xs uppercase font-semibold text-primary">
                      {member.role}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success bg-success-bg border border-success-border px-2 py-0.5 rounded">
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-3" />
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
