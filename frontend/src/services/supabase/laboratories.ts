import { supabase } from "./client";

export interface CreateLaboratoryInput {
  name: string;
  license_number?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  official_email: string;
  phone?: string;
}

export interface CreateProfileInput {
  id: string;
  laboratory_id: string;
  full_name: string;
  email: string;
}

/**
 * Create a new laboratory record.
 * Called immediately after Supabase Auth user creation during registration.
 */
export async function createLaboratory(
  input: CreateLaboratoryInput
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("laboratories")
    .insert({
      name: input.name,
      license_number: input.license_number ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      country: input.country ?? "India",
      official_email: input.official_email,
      phone: input.phone ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[METRA] Laboratory creation error:", error.code);
    return { id: null, error: "Failed to create the laboratory record." };
  }

  return { id: data.id, error: null };
}

/**
 * Create the owner profile linked to the laboratory.
 * The `id` must match the Supabase Auth user ID.
 */
export async function createOwnerProfile(
  input: CreateProfileInput
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("profiles").insert({
    id: input.id,
    laboratory_id: input.laboratory_id,
    full_name: input.full_name,
    email: input.email,
    role: "owner",
    is_active: true,
  });

  if (error) {
    console.error("[METRA] Profile creation error:", error.code);
    return { error: "Failed to create your profile." };
  }

  return { error: null };
}
