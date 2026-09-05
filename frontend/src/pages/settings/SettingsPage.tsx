/**
 * METRA — pages/settings/SettingsPage.tsx
 * Route: /app/settings
 * Owner & Admin laboratory settings configuration.
 */

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings01Icon, Tick02Icon } from "@hugeicons/core-free-icons";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLabSettings, updateLabSettings, type LabSettings } from "@/services/api/settings";
import { LoadingState } from "@/components/common/EmptyState";

export default function SettingsPage() {
  const [settings, setSettings] = useState<LabSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    document.title = "METRA — Lab Settings";
    getLabSettings()
      .then(setSettings)
      .catch((err) => console.error("Failed to load lab settings:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSuccessMessage(null);
    try {
      const updated = await updateLabSettings(settings);
      setSettings(updated);
      setSuccessMessage("Laboratory settings updated successfully.");
    } catch (err: any) {
      console.error("Save settings error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Laboratory Settings"
        description="Configure laboratory identification, address, and default evaluation standards"
      />

      {loading ? (
        <LoadingState message="Loading laboratory settings..." />
      ) : (
        <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
          {successMessage && (
            <div className="rounded-md border border-success-border bg-success-bg p-3 text-xs text-success-text flex items-center gap-2 font-medium">
              <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-4" />
              {successMessage}
            </div>
          )}

          <SectionCard title="Laboratory Identification">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="lab-name">Laboratory Name</Label>
                <Input
                  id="lab-name"
                  value={settings?.name || ""}
                  onChange={(e) => setSettings({ ...settings!, name: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lab-code">Laboratory Code / ID</Label>
                <Input
                  id="lab-code"
                  value={settings?.code || ""}
                  onChange={(e) => setSettings({ ...settings!, code: e.target.value })}
                  className="h-9 text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="accreditation">Accreditation Number</Label>
                <Input
                  id="accreditation"
                  value={settings?.accreditation_number || ""}
                  onChange={(e) => setSettings({ ...settings!, accreditation_number: e.target.value })}
                  placeholder="e.g. ISO/IEC 17025 NABL-1029"
                  className="h-9 text-sm font-mono"
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Contact & Address">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contact-email">Contact Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={settings?.contact_email || ""}
                  onChange={(e) => setSettings({ ...settings!, contact_email: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contact-phone">Contact Phone</Label>
                <Input
                  id="contact-phone"
                  value={settings?.contact_phone || ""}
                  onChange={(e) => setSettings({ ...settings!, contact_phone: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={settings?.address || ""}
                  onChange={(e) => setSettings({ ...settings!, address: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="OIML Defaults">
            <div className="space-y-1.5">
              <Label htmlFor="default-edition">Default OIML R-76 Edition</Label>
              <Input
                id="default-edition"
                value={settings?.default_oiml_edition || "2006 (E)"}
                onChange={(e) => setSettings({ ...settings!, default_oiml_edition: e.target.value })}
                className="h-9 text-sm max-w-sm"
              />
            </div>
          </SectionCard>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving} size="sm">
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      )}
    </AppLayout>
  );
}
