import { z } from "zod";
import { createClient } from "../supabase/browser";

const RESOURCE_TABLES = Object.freeze({
  activity: "activity_logs",
  transactions: "transactions",
  budgets: "budgets",
  goals: "goals",
  journal: "journal_entries",
  tasks: "tasks",
  events: "calendar_events",
  shopping: "shopping_items",
  meals: "meals",
  members: "family_members",
  invitations: "invitations",
  "join-requests": "join_requests",
});

const RESOURCE_KEYS = Object.freeze(Object.keys(RESOURCE_TABLES));
const nonEmptyText = (max) => z.string().trim().min(1).max(max);
const optionalText = (max) => z.string().trim().max(max).optional().default("");
const money = z.coerce.number().finite().min(0);
const dateValue = z.union([z.string().datetime({ offset: true }), z.string().date()]).optional().nullable();
const schemas = Object.freeze({
  journal: z.object({
    title: nonEmptyText(200), content: z.string().min(1).max(10000),
    mood: z.enum(["senang", "biasa", "sedih", "bersemangat", "lelah"]).default("senang"),
    visibility: z.enum(["private", "family"]).default("private"), date: dateValue,
  }),
  transaction: z.object({
    description: nonEmptyText(240), category: nonEmptyText(120), amount: money,
    type: z.enum(["income", "expense"]), date: dateValue,
  }),
  budget: z.object({ category: nonEmptyText(120), limit: money }),
  goal: z.object({
    name: nonEmptyText(160), target_amount: money, current_amount: money.default(0),
    target_date: z.string().date().optional().nullable(),
  }),
  task: z.object({
    title: nonEmptyText(200), assignee_id: z.string().trim().min(1).max(100).optional().nullable(),
    due_date: z.string().date().optional().nullable(), priority: z.enum(["low", "medium", "high"]).default("medium"),
  }),
  event: z.object({ title: nonEmptyText(200), description: optionalText(2000), date: z.union([z.string().datetime({ offset: true }), z.string().date()]) }),
  shopping: z.object({ name: nonEmptyText(200), quantity: z.coerce.number().int().positive().default(1), category: optionalText(120).default("Lainnya") }),
  meal: z.object({
    title: nonEmptyText(200), meal_type: z.enum(["sarapan", "makan_siang", "makan_malam", "camilan"]).default("makan_siang"),
    date: dateValue, ingredients: z.array(nonEmptyText(200)).max(100).default([]), notes: optionalText(2000), cost: money.default(0),
  }),
});

function assertResourceKey(resourceKey) {
  if (!RESOURCE_KEYS.includes(resourceKey)) throw new Error("Resource Supabase tidak dikenali");
  return RESOURCE_TABLES[resourceKey];
}

function assertFamilyId(targetFamilyId) {
  if (!targetFamilyId || typeof targetFamilyId !== "string" || targetFamilyId.trim().length === 0 || targetFamilyId.length > 100) {
    throw new Error("Keluarga belum dipilih");
  }
  return targetFamilyId;
}

function parsePath(path) {
  const match = path?.match(/^\/families\/([^/?]+)\/([a-z-]+)(?:\?([^#]*))?$/);
  if (!match || !RESOURCE_KEYS.includes(match[2])) throw new Error("Resource Supabase tidak dikenali");
  return { familyId: decodeURIComponent(match[1]), resourceKey: match[2], params: new URLSearchParams(match[3] || "") };
}

function formatError(operation, error) {
  return new Error(`${operation}: ${error?.message || "Terjadi kesalahan"}`);
}

function parseDate(value) {
  if (value === undefined || value === null || value === "") return null;
  return value.length === 10 ? new Date(`${value}T00:00:00.000Z`).toISOString() : new Date(value).toISOString();
}

function parseInput(schema, input, label) {
  const result = schema.safeParse(input);
  if (!result.success) throw new Error(`${label} tidak valid`);
  return result.data;
}

async function getCurrentUser(supabase) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) throw formatError("Sesi pengguna tidak valid", error);
  return data.user;
}

async function insertOne(table, values, operation) {
  const { data, error } = await createClient().from(table).insert(values).select("*").single();
  if (error) throw formatError(operation, error);
  return data;
}

export async function listResource(path) {
  const { familyId: targetFamilyId, resourceKey, params } = parsePath(path);
  const supabase = createClient();
  const selection = resourceKey === "members" ? "*, profile:profiles(id, name, avatar_url)" : "*";
  let query = supabase.from(assertResourceKey(resourceKey)).select(selection).eq("family_id", targetFamilyId);

  if (resourceKey === "journal") {
    const scope = params.get("scope") || "family";
    if (!["my", "family"].includes(scope)) throw new Error("Scope jurnal tidak valid");
    if (scope === "family") query = query.eq("visibility", "family");
    if (scope === "my") query = query.eq("user_id", (await getCurrentUser(supabase)).id);
  }

  const dateColumn = ["transactions", "journal", "events", "meals"].includes(resourceKey) ? "date" : "created_at";
  const { data, error } = await query.order(dateColumn, { ascending: false });
  if (error) throw formatError("Gagal memuat resource", error);
  if (resourceKey === "members") {
    return (data || []).map((member) => ({
      ...member,
      name: member.profile?.name || member.name || "Pengguna",
      avatar_url: member.profile?.avatar_url || member.avatar_url || "",
    }));
  }
  return data || [];
}

export const fetchResource = listResource;

export async function createJournalEntry(targetFamilyId, input) {
  assertFamilyId(targetFamilyId);
  const values = parseInput(schemas.journal, input, "Data jurnal");
  const user = await getCurrentUser(createClient());
  return insertOne("journal_entries", {
    family_id: targetFamilyId, user_id: user.id,
    author_name: user.user_metadata?.name || user.email?.split("@")[0] || "Pengguna",
    ...values, date: parseDate(values.date) || new Date().toISOString(),
  }, "Gagal menyimpan jurnal");
}

export async function createTransaction(targetFamilyId, input) {
  assertFamilyId(targetFamilyId);
  const values = parseInput(schemas.transaction, input, "Data transaksi");
  const user = await getCurrentUser(createClient());
  return insertOne("transactions", {
    family_id: targetFamilyId, user_id: user.id,
    member_name: user.user_metadata?.name || user.email?.split("@")[0] || "Pengguna",
    ...values, amount: Number(values.amount), date: parseDate(values.date) || new Date().toISOString(),
  }, "Gagal menyimpan transaksi");
}

export async function createBudget(targetFamilyId, input) {
  assertFamilyId(targetFamilyId);
  const values = parseInput(schemas.budget, input, "Data anggaran");
  return insertOne("budgets", { family_id: targetFamilyId, ...values, limit: Number(values.limit), period: "month" }, "Gagal menyimpan anggaran");
}

export async function createGoal(targetFamilyId, input) {
  assertFamilyId(targetFamilyId);
  const values = parseInput(schemas.goal, input, "Data target");
  return insertOne("goals", { family_id: targetFamilyId, ...values, target_amount: Number(values.target_amount), current_amount: Number(values.current_amount) }, "Gagal menyimpan target");
}

export async function createTask(targetFamilyId, input) {
  assertFamilyId(targetFamilyId);
  const values = parseInput(schemas.task, input, "Data tugas");
  return insertOne("tasks", { family_id: targetFamilyId, ...values, due_date: values.due_date || null, assignee_id: values.assignee_id || null }, "Gagal menyimpan tugas");
}

export async function createEvent(targetFamilyId, input) {
  assertFamilyId(targetFamilyId);
  const values = parseInput(schemas.event, input, "Data acara");
  return insertOne("calendar_events", { family_id: targetFamilyId, ...values, date: parseDate(values.date) }, "Gagal menyimpan acara");
}

export async function createShoppingItem(targetFamilyId, input) {
  assertFamilyId(targetFamilyId);
  const values = parseInput(schemas.shopping, input, "Data belanja");
  return insertOne("shopping_items", { family_id: targetFamilyId, ...values, quantity: Number(values.quantity) }, "Gagal menyimpan item belanja");
}

export async function createMeal(targetFamilyId, input) {
  assertFamilyId(targetFamilyId);
  const values = parseInput(schemas.meal, input, "Data menu");
  const user = await getCurrentUser(createClient());
  return insertOne("meals", {
    family_id: targetFamilyId, user_id: user.id,
    author_name: user.user_metadata?.name || user.email?.split("@")[0] || "Pengguna",
    ...values, date: parseDate(values.date) || new Date().toISOString(), cost: Number(values.cost),
  }, "Gagal menyimpan menu");
}

export async function toggleResource(targetFamilyId, resourceKey, item) {
  assertFamilyId(targetFamilyId);
  const table = assertResourceKey(resourceKey);
  if (!item?.id || !["tasks", "shopping", "meals"].includes(resourceKey)) throw new Error("Resource toggle tidak valid");
  const update = resourceKey === "tasks" ? { status: item.status === "done" ? "todo" : "done" } : resourceKey === "shopping" ? { bought: !Boolean(item.bought) } : { done: !Boolean(item.done) };
  const result = await createClient().from(table).update(update).eq("id", item.id).eq("family_id", targetFamilyId).select("*");
  if (result.error) throw formatError("Gagal memperbarui resource", result.error);
  return result.data || [];
}

export async function deleteResource(targetFamilyId, resourceKey, id) {
  if (!id) throw new Error("Resource yang dihapus tidak valid");
  assertFamilyId(targetFamilyId);
  const result = await createClient().from(assertResourceKey(resourceKey)).delete().eq("id", id).eq("family_id", targetFamilyId);
  if (result.error) throw formatError("Gagal menghapus resource", result.error);
  return true;
}
