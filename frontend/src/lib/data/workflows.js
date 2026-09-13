import { createClient } from "../supabase/browser";

function assertRpcResult(result, operation) {
  if (result.error) throw new Error(`${operation}: ${result.error.message}`);
  if (result.data === null || result.data === undefined) throw new Error(operation);
  return result.data;
}

export async function lookupInvitation(code) {
  const normalizedCode = code?.trim().toUpperCase();
  if (!/^INV-[A-F0-9]{10}$/.test(normalizedCode || "")) throw new Error("Kode undangan tidak valid");
  const result = await createClient().rpc("lookup_invitation", { invitation_code: normalizedCode });
  return assertRpcResult(result, "Gagal memuat undangan");
}

export async function acceptInvitation(code) {
  const normalizedCode = code?.trim().toUpperCase();
  if (!/^INV-[A-F0-9]{10}$/.test(normalizedCode || "")) {
    throw new Error("Kode undangan tidak valid");
  }
  const result = await createClient().rpc("accept_invitation", {
    invitation_code: normalizedCode,
  });
  return assertRpcResult(result, "Gagal menerima undangan");
}

export async function requestFamilyJoin(code, message = "") {
  const normalizedCode = code?.trim().toUpperCase();
  if (!/^FAM-[A-Z0-9]{6}$/.test(normalizedCode || "")) {
    throw new Error("Kode keluarga tidak valid");
  }
  const result = await createClient().rpc("request_family_join", {
    family_join_code: normalizedCode,
    request_message: message,
  });
  return assertRpcResult(result, "Gagal mengirim permintaan bergabung");
}

export async function createInvitation(familyId, { role = "child", expiresDays = 7 } = {}) {
  if (!familyId || !["wife", "child"].includes(role) || ![1, 7, 30].includes(Number(expiresDays))) {
    throw new Error("Data undangan tidak valid");
  }
  const result = await createClient().rpc("create_invitation", {
    target_family_id: familyId,
    invitation_role: role,
    expires_days: Number(expiresDays),
  });
  return assertRpcResult(result, "Gagal membuat undangan");
}

function assertIds(familyId, resourceId, message) {
  if (!familyId || !resourceId) throw new Error(message);
}

async function callFamilyWorkflow(name, familyId, args, operation) {
  assertIds(familyId, args.resourceId, "Data workflow keluarga tidak valid");
  const result = await createClient().rpc(name, {
    target_family_id: familyId,
    ...args.parameters,
  });
  return assertRpcResult(result, operation);
}

export async function approveJoinRequest(familyId, requestId) {
  return callFamilyWorkflow("approve_join_request", familyId, {
    resourceId: requestId,
    parameters: { target_request_id: requestId },
  }, "Gagal menyetujui permintaan");
}

export async function rejectJoinRequest(familyId, requestId) {
  return callFamilyWorkflow("reject_join_request", familyId, {
    resourceId: requestId,
    parameters: { target_request_id: requestId },
  }, "Gagal menolak permintaan");
}

export async function revokeInvitation(familyId, invitationId) {
  return callFamilyWorkflow("revoke_invitation", familyId, {
    resourceId: invitationId,
    parameters: { target_invitation_id: invitationId },
  }, "Gagal mencabut undangan");
}

export async function removeMember(familyId, memberId) {
  return callFamilyWorkflow("remove_member", familyId, {
    resourceId: memberId,
    parameters: { target_member_id: memberId },
  }, "Gagal mengeluarkan anggota");
}

export async function changeMemberRole(familyId, memberId, newRole) {
  if (!["wife", "child"].includes(newRole)) throw new Error("Peran anggota tidak valid");
  return callFamilyWorkflow("change_member_role", familyId, {
    resourceId: memberId,
    parameters: { target_member_id: memberId, new_role: newRole },
  }, "Gagal mengubah peran anggota");
}

export async function updateFamily(familyId, { name, description = "", avatar_url = "" } = {}) {
  if (!familyId || typeof name !== "string" || name.trim().length < 1 || name.trim().length > 160) {
    throw new Error("Data keluarga tidak valid");
  }
  const result = await createClient().rpc("update_family", {
    target_family_id: familyId,
    family_name: name.trim(),
    family_description: description,
    family_avatar_url: avatar_url,
  });
  return assertRpcResult(result, "Gagal memperbarui keluarga");
}

export async function transferOwnership(familyId, newOwnerId) {
  if (!familyId || !newOwnerId) throw new Error("Pemilik baru tidak valid");
  return assertRpcResult(await createClient().rpc("transfer_family_ownership", {
    target_family_id: familyId,
    new_owner_id: newOwnerId,
  }), "Gagal memindahkan kepemilikan");
}

export async function deleteFamily(familyId) {
  if (!familyId) throw new Error("Keluarga tidak valid");
  return assertRpcResult(await createClient().rpc("delete_family", {
    target_family_id: familyId,
  }), "Gagal menghapus keluarga");
}
