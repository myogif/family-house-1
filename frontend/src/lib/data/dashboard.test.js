import { fetchDashboard } from "./dashboard";
import { createClient } from "../supabase/browser";

jest.mock("../supabase/browser", () => ({ createClient: jest.fn() }));

describe("dashboard data access", () => {
  beforeEach(() => jest.clearAllMocks());

  test("uses the authenticated dashboard RPC", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: { balance: 10 }, error: null });
    createClient.mockReturnValue({ rpc });

    await expect(fetchDashboard("family-1")).resolves.toEqual({ balance: 10 });
    expect(rpc).toHaveBeenCalledWith("get_family_dashboard", { target_family_id: "family-1" });
  });

  test("rejects missing family ids", async () => {
    await expect(fetchDashboard("")).rejects.toThrow("Keluarga tidak valid");
    expect(createClient).not.toHaveBeenCalled();
  });
});
