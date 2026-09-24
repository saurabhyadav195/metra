/**
 * METRA — pages/team/TeamPage.tsx
 * Route: /app/team
 * Lists laboratory engineers and administrators with role-based team management.
 * Backed by FastAPI backend with laboratory isolation.
 */

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserGroupIcon,
  UserAddIcon,
  CheckmarkCircle02Icon,
  CancelCircleIcon,
  AlertCircleIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState, LoadingState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import {
  listTeamMembers,
  createTeamMember,
  updateTeamMemberStatus,
  type TeamMember,
} from "@/services/api/team";

export default function TeamPage() {
  const { profile } = useAuth();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Create member state
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "engineer">("engineer");
  const [createError, setCreateError] = useState<string | null>(null);

  // Status toggle state
  const [pendingStatusMember, setPendingStatusMember] = useState<TeamMember | null>(null);
  const [toggling, setToggling] = useState(false);

  // General notification
  const [notification, setNotification] = useState<string | null>(null);

  const canManageTeam = profile?.role === "owner" || profile?.role === "admin";
  const isOwner = profile?.role === "owner";

  const fetchTeam = async () => {
    try {
      const data = await listTeamMembers();
      setTeam(data);
    } catch (err) {
      console.error("Failed to load team members:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "METRA — Laboratory Team";
    fetchTeam();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!fullName.trim()) {
      setCreateError("Full name is required.");
      return;
    }
    if (!email.trim()) {
      setCreateError("Email is required.");
      return;
    }
    if (!password || password.length < 6) {
      setCreateError("Password must be at least 6 characters.");
      return;
    }

    setCreating(true);
    try {
      await createTeamMember({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        role: isOwner ? role : "engineer",
      });
      setOpenCreateDialog(false);
      setFullName("");
      setEmail("");
      setPassword("");
      setRole("engineer");
      setNotification("New team member added successfully.");
      await fetchTeam();
    } catch (err: any) {
      setCreateError(err.message || "Failed to add team member. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmStatusToggle = async () => {
    if (!pendingStatusMember) return;
    setToggling(true);
    const newStatus = !pendingStatusMember.is_active;
    try {
      await updateTeamMemberStatus(pendingStatusMember.id, newStatus);
      setNotification(
        `Team member ${pendingStatusMember.full_name} has been ${
          newStatus ? "reactivated" : "deactivated"
        }.`
      );
      setPendingStatusMember(null);
      await fetchTeam();
    } catch (err: any) {
      console.error("Failed to update status:", err);
      setNotification(err.message || "Failed to update member status.");
    } finally {
      setToggling(false);
    }
  };

  const isActionDisabled = (member: TeamMember) => {
    if (member.id === profile?.id) return true; // Cannot modify self
    if (member.role === "owner") return true; // Cannot modify owner
    if (profile?.role === "admin" && member.role === "admin") return true; // Admin cannot modify admin
    return false;
  };

  return (
    <AppLayout>
      <PageHeader
        title="Laboratory Personnel"
        description="Engineers, administrators, and laboratory personnel isolated to your organization"
        actions={
          canManageTeam ? (
            <Button size="sm" onClick={() => setOpenCreateDialog(true)}>
              <HugeiconsIcon icon={UserAddIcon} strokeWidth={2} className="size-4 shrink-0" />
              Add Team Member
            </Button>
          ) : undefined
        }
      />

      {notification && (
        <div className="mb-4 rounded-md border border-success-border bg-success-bg p-3 text-xs text-success-text flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-4" />
            {notification}
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-success-text hover:opacity-80 font-bold"
          >
            ×
          </button>
        </div>
      )}

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
                <tr className="border-b border-border bg-muted/70">
                  <th className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wide">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wide">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wide">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wide">
                    Status
                  </th>
                  {canManageTeam && (
                    <th className="px-4 py-3 text-right text-xs font-medium text-foreground uppercase tracking-wide">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {team.map((member) => (
                  <tr key={member.id} className="hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground text-xs">
                      {member.full_name}
                      {member.id === profile?.id && (
                        <span className="ml-2 text-[10px] bg-primary/10 text-primary font-semibold px-1.5 py-0.5 rounded">
                          You
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                      {member.email}
                    </td>
                    <td className="px-4 py-3 text-xs uppercase font-semibold text-primary">
                      {member.role}
                    </td>
                    <td className="px-4 py-3">
                      {member.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success bg-success-bg border border-success-border px-2 py-0.5 rounded">
                          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded">
                          <HugeiconsIcon icon={CancelCircleIcon} strokeWidth={2} className="size-3" />
                          Inactive
                        </span>
                      )}
                    </td>
                    {canManageTeam && (
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="xs"
                          disabled={isActionDisabled(member)}
                          onClick={() => setPendingStatusMember(member)}
                          className={member.is_active ? "text-destructive hover:bg-destructive/10" : ""}
                        >
                          {member.is_active ? "Deactivate" : "Reactivate"}
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Team Member Dialog */}
      <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Create a new user account for your laboratory. A profile linked to your laboratory will be created automatically.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            {createError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2 font-medium">
                <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} className="size-4" />
                {createError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="full-name">Full Name</Label>
              <Input
                id="full-name"
                placeholder="e.g. Rahul Sharma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="engineer@laboratory.example"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Temporary Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role">Assigned Role</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "engineer")}
                disabled={!isOwner}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="engineer">Testing Engineer</option>
                {isOwner && <option value="admin">Administrator</option>}
              </select>
              {!isOwner && (
                <p className="text-[11px] text-muted-foreground">
                  Administrators can create Testing Engineer accounts.
                </p>
              )}
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpenCreateDialog(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={creating}>
                {creating ? "Creating Account..." : "Create Member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Status Toggle */}
      <Dialog
        open={!!pendingStatusMember}
        onOpenChange={(open) => !open && setPendingStatusMember(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {pendingStatusMember?.is_active ? "Deactivate Team Member" : "Reactivate Team Member"}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to{" "}
              {pendingStatusMember?.is_active ? "deactivate" : "reactivate"}{" "}
              <strong className="text-foreground font-semibold">{pendingStatusMember?.full_name}</strong> (
              {pendingStatusMember?.email})?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPendingStatusMember(null)}
              disabled={toggling}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={pendingStatusMember?.is_active ? "destructive" : "default"}
              size="sm"
              onClick={handleConfirmStatusToggle}
              disabled={toggling}
            >
              {toggling
                ? "Updating..."
                : pendingStatusMember?.is_active
                ? "Deactivate Account"
                : "Reactivate Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
