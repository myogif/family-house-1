import { createClient } from "../supabase/browser";

function assertNoError(error, operation) {
  if (error) {
    throw new Error(`${operation}: ${error.message}`);
  }
}

export async function listFamilies() {
  const { data, error } = await createClient()
    .from("family_members")
    .select("family:families(*), role, status")
    .eq("status", "active");
  assertNoError(error, "Gagal memuat keluarga");

  return (data || []).map(({ family, role }) => ({
    ...family,
    my_role: role,
  }));
}

export async function createFamily({ name, description = "", avatar_url = "" }) {
  const result = await createClient().rpc("create_family_with_owner", {
    family_name: name,
    family_description: description,
    family_avatar_url: avatar_url,
  });
  assertNoError(result.error, "Gagal membuat keluarga");
  return result.data;
}
