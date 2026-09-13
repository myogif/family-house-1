import { createFamily, listFamilies } from "./families";
import { createClient } from "../supabase/browser";

jest.mock("../supabase/browser", () => ({ createClient: jest.fn() }));

describe("family data access", () => {
  test("maps memberships to family cards", async () => {
    const eq = jest.fn().mockResolvedValue({
      data: [{ family: { id: "family-1", name: "Keluarga" }, role: "husband" }],
      error: null,
    });
    createClient.mockReturnValue({
      from: jest.fn(() => ({ select: jest.fn(() => ({ eq })) })),
    });

    await expect(listFamilies()).resolves.toEqual([
      { id: "family-1", name: "Keluarga", my_role: "husband" },
    ]);
  });

  test("returns a useful error when family creation fails", async () => {
    createClient.mockReturnValue({
      rpc: jest.fn().mockResolvedValue({ data: null, error: { message: "denied" } }),
    });

    await expect(createFamily({ name: "Keluarga" })).rejects.toThrow(
      "Gagal membuat keluarga: denied",
    );
  });
});
