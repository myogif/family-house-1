import { createClient } from "../supabase/browser";

function dashboardError(error) {
  return new Error(`Gagal memuat dashboard: ${error?.message || "Terjadi kesalahan"}`);
}

export async function fetchDashboard(familyId) {
  if (!familyId) throw new Error("Keluarga tidak valid");
  const { data, error } = await createClient().rpc("get_family_dashboard", {
    target_family_id: familyId,
  });
  if (error) throw dashboardError(error);
  return data || {
    balance: 0,
    month_income: 0,
    month_expense: 0,
    member_count: 0,
    recent_transactions: [],
  };
}
