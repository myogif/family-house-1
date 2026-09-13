import {
  acceptInvitation,
  approveJoinRequest,
  changeMemberRole,
  createInvitation,
  deleteFamily,
  lookupInvitation,
  rejectJoinRequest,
  removeMember,
  requestFamilyJoin,
  revokeInvitation,
  transferOwnership,
  updateFamily,
} from "./workflows";
import { createClient } from "../supabase/browser";

jest.mock("../supabase/browser", () => ({ createClient: jest.fn() }));

describe("Supabase workflow data access", () => {
  beforeEach(() => jest.clearAllMocks());

  test("validates invitation input before invoking an RPC", async () => {
    createClient.mockReturnValue({ rpc: jest.fn() });
    await expect(createInvitation("family-1", { role: "husband", expiresDays: 7 })).rejects.toThrow("Data undangan tidak valid");
    expect(createClient).not.toHaveBeenCalled();
  });

  test("passes normalized invitation arguments to the secure RPC", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: { code: "INV-ABC12345" }, error: null });
    createClient.mockReturnValue({ rpc });
    await expect(createInvitation("family-1", { role: "child", expiresDays: "7" })).resolves.toEqual({ code: "INV-ABC12345" });
    expect(rpc).toHaveBeenCalledWith("create_invitation", { target_family_id: "family-1", invitation_role: "child", expires_days: 7 });
  });

  test("rejects malformed family join codes before the RPC", async () => {
    createClient.mockReturnValue({ rpc: jest.fn() });
    await expect(requestFamilyJoin("not-a-code")).rejects.toThrow("Kode keluarga tidak valid");
    expect(createClient).not.toHaveBeenCalled();
  });

  test("approves and rejects join requests through family-scoped RPCs", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: { id: "request-1" }, error: null });
    createClient.mockReturnValue({ rpc });
    await approveJoinRequest("family-1", "request-1");
    await rejectJoinRequest("family-1", "request-1");
    expect(rpc).toHaveBeenNthCalledWith(1, "approve_join_request", { target_family_id: "family-1", target_request_id: "request-1" });
    expect(rpc).toHaveBeenNthCalledWith(2, "reject_join_request", { target_family_id: "family-1", target_request_id: "request-1" });
  });

  test("validates member role transitions before invoking the RPC", async () => {
    createClient.mockReturnValue({ rpc: jest.fn() });
    await expect(changeMemberRole("family-1", "member-1", "husband")).rejects.toThrow("Peran anggota tidak valid");
    expect(createClient).not.toHaveBeenCalled();
  });

  test("passes member management operations to secure RPCs", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: true, error: null });
    createClient.mockReturnValue({ rpc });
    await revokeInvitation("family-1", "invitation-1");
    await removeMember("family-1", "member-1");
    await changeMemberRole("family-1", "member-1", "wife");
    expect(rpc).toHaveBeenNthCalledWith(1, "revoke_invitation", { target_family_id: "family-1", target_invitation_id: "invitation-1" });
    expect(rpc).toHaveBeenNthCalledWith(2, "remove_member", { target_family_id: "family-1", target_member_id: "member-1" });
    expect(rpc).toHaveBeenNthCalledWith(3, "change_member_role", { target_family_id: "family-1", target_member_id: "member-1", new_role: "wife" });
  });

  test("validates and sends family settings workflows to RPCs", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: { id: "family-1" }, error: null });
    createClient.mockReturnValue({ rpc });
    await updateFamily("family-1", { name: "Keluarga Baru", description: "Rumah" });
    await transferOwnership("family-1", "member-2");
    await deleteFamily("family-1");
    expect(rpc).toHaveBeenNthCalledWith(1, "update_family", { target_family_id: "family-1", family_name: "Keluarga Baru", family_description: "Rumah", family_avatar_url: "" });
    expect(rpc).toHaveBeenNthCalledWith(2, "transfer_family_ownership", { target_family_id: "family-1", new_owner_id: "member-2" });
    expect(rpc).toHaveBeenNthCalledWith(3, "delete_family", { target_family_id: "family-1" });
  });

  test("rejects null RPC data instead of crashing the caller", async () => {
    createClient.mockReturnValue({ rpc: jest.fn().mockResolvedValue({ data: null, error: null }) });
    await expect(acceptInvitation("INV-ABCDEF1234")).rejects.toThrow("Gagal menerima undangan");
    await expect(lookupInvitation("INV-ABCDEF1234")).rejects.toThrow("Gagal memuat undangan");
  });
});
