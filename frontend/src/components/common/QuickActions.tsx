/**
 * METRA — components/common/QuickActions.tsx
 *
 * Extracted reusable "Quick Actions" side panel — previously copy-pasted
 * verbatim across OwnerDashboard, AdminDashboard, and EngineerDashboard.
 *
 * Usage:
 *   <QuickActions
 *     title="Quick Management"
 *     items={[
 *       { icon: ScaleIcon, label: "Manage Instruments", href: "/app/instruments" },
 *       { icon: UserGroupIcon, label: "Team", href: "/app/team", iconColor: "text-success" },
 *     ]}
 *   />
 */

import { useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";

export interface QuickActionItem {
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"];
  iconColor?: string;
  label: string;
  /** Navigate to this path on click */
  href: string;
}

interface QuickActionsProps {
  title?: string;
  items: QuickActionItem[];
}

export function QuickActions({ title = "Quick Actions", items }: QuickActionsProps) {
  const navigate = useNavigate();

  return (
    <SectionCard title={title}>
      <div className="space-y-2">
        {items.map((item) => (
          <Button
            key={item.href}
            variant="outline"
            className="w-full justify-start gap-2 h-9 text-xs"
            onClick={() => navigate(item.href)}
          >
            <HugeiconsIcon
              icon={item.icon}
              strokeWidth={2}
              className={`size-4 ${item.iconColor ?? "text-primary"}`}
            />
            {item.label}
          </Button>
        ))}
      </div>
    </SectionCard>
  );
}
