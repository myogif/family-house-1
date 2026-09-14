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
  recipes: "recipes",
  members: "family_members",
  invitations: "invitations",
  "join-requests": "join_requests",
  wallets: "wallets",
  debts: "debts",
  subscriptions: "subscriptions",
  assets: "assets",
});

const RESOURCE_KEYS = Object.freeze(Object.keys(RESOURCE_TABLES));
const nonEmptyText = (max) => z.string().trim().min(1).max(max);
const optionalText = (max) => z.string().trim().max(max).optional().default("");
const safeUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((val) => !val || /^https?:\/\//i.test(val), {
    message: "URL video harus diawali http:// atau https://",
  })
  .optional()
  .default("");
const money = z.coerce.number().finite().min(0);
const dateValue = z.union([z.string().datetime({ offset: true }), z.string().date()]).optional().nullable();
const schemas = Object.freeze({
  journal: z.object({
    title: nonEmptyText(200), content: z.string().min(1).max(10000),
    mood: z.enum(["senang", "biasa", "sedih", "bersemangat", "lelah"]).default("senang"),
    visibility: z.enum(["private", "family"]).default("private"), date: dateValue,
  }),
  transaction: z.object({
    description: nonEmptyText(240),
    category: nonEmptyText(120),
    amount: money,
    type: z.enum(["income", "expense", "transfer"]),
    date: dateValue,
    wallet_id: z.string().uuid().optional().nullable(),
    destination_wallet_id: z.string().uuid().optional().nullable(),
    transfer_fee: money.default(0),
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
    title: nonEmptyText(200),
    category: z.enum(["makanan", "cemilan", "minuman"]).default("makanan"),
    meal_type: z.enum(["sarapan", "makan_siang", "makan_malam", "camilan"]).default("makan_siang"),
    date: dateValue,
    ingredients: z.array(nonEmptyText(200)).max(100).default([]),
    notes: optionalText(2000),
    video_url: safeUrl,
    cost: money.default(0),
    recipe_id: z.string().uuid().optional().nullable(),
  }),
  recipe: z.object({
    title: nonEmptyText(200),
    category: z.enum(["makanan", "cemilan", "minuman"]).default("makanan"),
    meal_type: z.enum(["sarapan", "makan_siang", "makan_malam", "camilan"]).default("makan_siang"),
    servings: z.coerce.number().int().min(1).max(100).default(4),
    prep_time: z.coerce.number().int().min(0).max(1440).default(0),
    cook_time: z.coerce.number().int().min(0).max(1440).default(0),
    ingredients: z.array(nonEmptyText(200)).max(100).default([]),
    instructions: optionalText(5000),
    video_url: safeUrl,
  }),
  wallet: z.object({
    name: nonEmptyText(100),
    type: z.enum(["bank", "ewallet", "cash", "investment", "credit_card", "other"]).default("bank"),
    initial_balance: money.default(0),
    current_balance: money.optional(),
    account_number: optionalText(100),
    color: optionalText(30).default("#3b82f6"),
    icon: optionalText(50).default("wallet"),
    is_active: z.boolean().default(true),
  }),
  debt: z.object({
    type: z.enum(["debt", "loan"]),
    person_name: nonEmptyText(150),
    total_amount: money,
    paid_amount: money.default(0),
    due_date: z.string().date().optional().nullable(),
    notes: optionalText(1000),
    status: z.enum(["unpaid", "partial", "paid"]).default("unpaid"),
  }),
  subscription: z.object({
    name: nonEmptyText(150),
    category: nonEmptyText(120).default("Tagihan"),
    amount: money,
    billing_cycle: z.enum(["weekly", "monthly", "quarterly", "yearly"]).default("monthly"),
    next_billing_date: z.string().date(),
    wallet_id: z.string().uuid().optional().nullable(),
    notes: optionalText(1000),
    is_active: z.boolean().default(true),
  }),
  asset: z.object({
    name: nonEmptyText(150),
    category: z.enum(["property", "vehicle", "precious_metal", "electronic", "investment", "other"]).default("property"),
    estimated_value: money,
    purchase_price: money.default(0),
    purchase_date: z.string().date().optional().nullable(),
    location: optionalText(200),
    notes: optionalText(1000),
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
  if (error) {
    if (
      resourceKey === "recipes" &&
      (error?.code === "PGRST204" ||
        error?.code === "42P01" ||
        error?.message?.toLowerCase().includes("schema cache") ||
        error?.message?.toLowerCase().includes("does not exist"))
    ) {
      return [];
    }
    throw formatError("Gagal memuat resource", error);
  }
  if (resourceKey === "members") {
    return (data || []).map((member) => ({
      ...member,
      name: member.profile?.name || member.name || "Pengguna",
      avatar_url: member.profile?.avatar_url || member.avatar_url || "",
    }));
  }

  if (resourceKey === "budgets") {
    const budgetsData = data || [];
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

    const { data: txs } = await supabase
      .from("transactions")
      .select("category, amount, type, date")
      .eq("family_id", targetFamilyId)
      .eq("type", "expense")
      .gte("date", startOfMonth)
      .lte("date", endOfMonth);

    const spentByCategory = (txs || []).reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + Number(tx.amount || 0);
      return acc;
    }, {});

    return budgetsData.map((b) => {
      const spent = spentByCategory[b.category] || 0;
      const limit = Number(b.limit || 0);
      return {
        ...b,
        spent,
        remaining: Math.max(0, limit - spent),
        percentage: limit > 0 ? Math.round((spent / limit) * 100) : 0,
      };
    });
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

export async function updateBudget(targetFamilyId, budgetId, input) {
  assertFamilyId(targetFamilyId);
  if (!budgetId) throw new Error("ID anggaran tidak valid");
  const values = parseInput(schemas.budget, input, "Data anggaran");
  const { data, error } = await createClient()
    .from("budgets")
    .update({
      category: values.category,
      limit: Number(values.limit),
    })
    .eq("id", budgetId)
    .eq("family_id", targetFamilyId)
    .select("*")
    .single();

  if (error) throw formatError("Gagal memperbarui anggaran", error);
  return data;
}

export async function createGoal(targetFamilyId, input) {
  assertFamilyId(targetFamilyId);
  const values = parseInput(schemas.goal, input, "Data target");
  return insertOne("goals", { family_id: targetFamilyId, ...values, target_amount: Number(values.target_amount), current_amount: Number(values.current_amount || 0) }, "Gagal menyimpan target");
}

export async function updateGoal(targetFamilyId, goalId, input) {
  assertFamilyId(targetFamilyId);
  if (!goalId) throw new Error("ID target tidak valid");
  const values = parseInput(schemas.goal, input, "Data target");
  const { data, error } = await createClient()
    .from("goals")
    .update({
      name: values.name,
      target_amount: Number(values.target_amount),
      current_amount: Number(values.current_amount || 0),
      target_date: values.target_date || null,
    })
    .eq("id", goalId)
    .eq("family_id", targetFamilyId)
    .select("*")
    .single();

  if (error) throw formatError("Gagal memperbarui target", error);
  return data;
}

export async function allocateToGoal(targetFamilyId, goalId, input) {
  assertFamilyId(targetFamilyId);
  if (!goalId) throw new Error("ID target tidak valid");
  const { walletId, amount, notes } = input || {};
  const saveAmount = Number(amount);
  if (!walletId) throw new Error("Pilih dompet sumber");
  if (isNaN(saveAmount) || saveAmount <= 0) throw new Error("Nominal tabungan harus lebih dari 0");

  const supabase = createClient();
  const user = await getCurrentUser(supabase);

  // 1. Fetch goal
  const { data: goal, error: goalErr } = await supabase
    .from("goals")
    .select("*")
    .eq("id", goalId)
    .eq("family_id", targetFamilyId)
    .single();
  if (goalErr || !goal) throw formatError("Target tabungan tidak ditemukan", goalErr);

  // 2. Fetch wallet
  const { data: wallet, error: walletErr } = await supabase
    .from("wallets")
    .select("*")
    .eq("id", walletId)
    .eq("family_id", targetFamilyId)
    .single();
  if (walletErr || !wallet) throw formatError("Dompet sumber tidak ditemukan", walletErr);

  const walletBalance = Number(wallet.current_balance || 0);
  if (walletBalance < saveAmount) {
    throw new Error(`Saldo dompet ${wallet.name} tidak mencukupi (Tersedia: Rp ${walletBalance.toLocaleString("id-ID")})`);
  }

  // 3. Deduct wallet
  const newWalletBalance = walletBalance - saveAmount;
  const { error: updateWalletErr } = await supabase
    .from("wallets")
    .update({ current_balance: newWalletBalance, updated_at: new Date().toISOString() })
    .eq("id", walletId)
    .eq("family_id", targetFamilyId);
  if (updateWalletErr) throw formatError("Gagal memperbarui saldo dompet", updateWalletErr);

  // 4. Increase goal
  const newGoalCurrent = Number(goal.current_amount || 0) + saveAmount;
  const { data: updatedGoal, error: updateGoalErr } = await supabase
    .from("goals")
    .update({ current_amount: newGoalCurrent })
    .eq("id", goalId)
    .eq("family_id", targetFamilyId)
    .select("*")
    .single();
  if (updateGoalErr) throw formatError("Gagal memperbarui target tabungan", updateGoalErr);

  // 5. Create transaction
  const description = notes?.trim() || `Nabung ke target: ${goal.name}`;
  await insertOne("transactions", {
    family_id: targetFamilyId,
    user_id: user.id,
    member_name: user.user_metadata?.name || user.email?.split("@")[0] || "Pengguna",
    description,
    category: "Tabungan",
    amount: saveAmount,
    type: "expense",
    wallet_id: walletId,
    date: new Date().toISOString(),
  }, "Gagal mencatat mutasi transaksi tabungan");

  return updatedGoal;
}

export async function withdrawFromGoal(targetFamilyId, goalId, input) {
  assertFamilyId(targetFamilyId);
  if (!goalId) throw new Error("ID target tidak valid");
  const { walletId, amount, notes } = input || {};
  const withdrawAmount = Number(amount);
  if (!walletId) throw new Error("Pilih dompet tujuan");
  if (isNaN(withdrawAmount) || withdrawAmount <= 0) throw new Error("Nominal penarikan harus lebih dari 0");

  const supabase = createClient();
  const user = await getCurrentUser(supabase);

  // 1. Fetch goal
  const { data: goal, error: goalErr } = await supabase
    .from("goals")
    .select("*")
    .eq("id", goalId)
    .eq("family_id", targetFamilyId)
    .single();
  if (goalErr || !goal) throw formatError("Target tabungan tidak ditemukan", goalErr);

  const goalCurrent = Number(goal.current_amount || 0);
  if (goalCurrent < withdrawAmount) {
    throw new Error(`Dana pada target tidak mencukupi (Terkumpul: Rp ${goalCurrent.toLocaleString("id-ID")})`);
  }

  // 2. Fetch wallet
  const { data: wallet, error: walletErr } = await supabase
    .from("wallets")
    .select("*")
    .eq("id", walletId)
    .eq("family_id", targetFamilyId)
    .single();
  if (walletErr || !wallet) throw formatError("Dompet tujuan tidak ditemukan", walletErr);

  // 3. Increase wallet
  const newWalletBalance = Number(wallet.current_balance || 0) + withdrawAmount;
  const { error: updateWalletErr } = await supabase
    .from("wallets")
    .update({ current_balance: newWalletBalance, updated_at: new Date().toISOString() })
    .eq("id", walletId)
    .eq("family_id", targetFamilyId);
  if (updateWalletErr) throw formatError("Gagal memperbarui saldo dompet", updateWalletErr);

  // 4. Decrease goal
  const newGoalCurrent = goalCurrent - withdrawAmount;
  const { data: updatedGoal, error: updateGoalErr } = await supabase
    .from("goals")
    .update({ current_amount: newGoalCurrent })
    .eq("id", goalId)
    .eq("family_id", targetFamilyId)
    .select("*")
    .single();
  if (updateGoalErr) throw formatError("Gagal memperbarui target tabungan", updateGoalErr);

  // 5. Create transaction
  const description = notes?.trim() || `Pencairan target: ${goal.name}`;
  await insertOne("transactions", {
    family_id: targetFamilyId,
    user_id: user.id,
    member_name: user.user_metadata?.name || user.email?.split("@")[0] || "Pengguna",
    description,
    category: "Tabungan",
    amount: withdrawAmount,
    type: "income",
    wallet_id: walletId,
    date: new Date().toISOString(),
  }, "Gagal mencatat mutasi transaksi pencairan");

  return updatedGoal;
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
    ...values, date: parseDate(values.date) || new Date().toISOString(), cost: Number(values.cost || 0),
  }, "Gagal menyimpan menu");
}

export async function createRecipe(targetFamilyId, input) {
  assertFamilyId(targetFamilyId);
  const values = parseInput(schemas.recipe, input, "Data resep");
  const user = await getCurrentUser(createClient());
  try {
    return await insertOne(
      "recipes",
      {
        family_id: targetFamilyId,
        user_id: user.id,
        author_name: user.user_metadata?.name || user.email?.split("@")[0] || "Pengguna",
        ...values,
      },
      "Gagal menyimpan resep"
    );
  } catch (error) {
    if (
      error?.message?.toLowerCase().includes("schema cache") ||
      error?.message?.toLowerCase().includes("does not exist")
    ) {
      throw new Error("Tabel 'recipes' belum dimigrasikan di database. Silakan jalankan migrasi database.");
    }
    throw error;
  }
}

export async function updateRecipe(targetFamilyId, recipeId, input) {
  assertFamilyId(targetFamilyId);
  if (!recipeId) throw new Error("ID resep tidak valid");
  const values = parseInput(schemas.recipe, input, "Data resep");
  const { data, error } = await createClient()
    .from("recipes")
    .update({
      ...values,
      updated_at: new Date().toISOString(),
    })
    .eq("id", recipeId)
    .eq("family_id", targetFamilyId)
    .select("*")
    .single();

  if (error) throw formatError("Gagal memperbarui resep", error);
  return data;
}

export async function createWallet(targetFamilyId, input) {
  assertFamilyId(targetFamilyId);
  const values = parseInput(schemas.wallet, input, "Data dompet");
  const initial = Number(values.initial_balance || 0);
  return insertOne(
    "wallets",
    {
      family_id: targetFamilyId,
      ...values,
      initial_balance: initial,
      current_balance: Number(values.current_balance ?? initial),
    },
    "Gagal menyimpan dompet"
  );
}

export async function updateWallet(targetFamilyId, walletId, input) {
  assertFamilyId(targetFamilyId);
  if (!walletId) throw new Error("ID dompet tidak valid");
  const values = parseInput(schemas.wallet, input, "Data dompet");
  const { data, error } = await createClient()
    .from("wallets")
    .update({
      ...values,
      updated_at: new Date().toISOString(),
    })
    .eq("id", walletId)
    .eq("family_id", targetFamilyId)
    .select("*")
    .single();

  if (error) throw formatError("Gagal memperbarui dompet", error);
  return data;
}

export async function createDebt(targetFamilyId, input) {
  assertFamilyId(targetFamilyId);
  const values = parseInput(schemas.debt, input, "Data hutang/piutang");
  const user = await getCurrentUser(createClient());
  const total = Number(values.total_amount);
  const paid = Number(values.paid_amount || 0);
  const status = paid >= total ? "paid" : paid > 0 ? "partial" : "unpaid";

  return insertOne(
    "debts",
    {
      family_id: targetFamilyId,
      user_id: user.id,
      ...values,
      total_amount: total,
      paid_amount: paid,
      status,
      due_date: values.due_date || null,
    },
    "Gagal menyimpan data hutang/piutang"
  );
}

export async function payDebt(targetFamilyId, debtId, amount) {
  assertFamilyId(targetFamilyId);
  if (!debtId) throw new Error("ID hutang tidak valid");
  const payAmount = Number(amount);
  if (isNaN(payAmount) || payAmount <= 0) throw new Error("Nominal pembayaran tidak valid");

  const supabase = createClient();
  const { data: debt, error: fetchErr } = await supabase
    .from("debts")
    .select("*")
    .eq("id", debtId)
    .eq("family_id", targetFamilyId)
    .single();

  if (fetchErr || !debt) throw formatError("Hutang tidak ditemukan", fetchErr);

  const newPaid = Number(debt.paid_amount || 0) + payAmount;
  const newStatus = newPaid >= Number(debt.total_amount) ? "paid" : "partial";

  const { data, error } = await supabase
    .from("debts")
    .update({
      paid_amount: newPaid,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", debtId)
    .eq("family_id", targetFamilyId)
    .select("*")
    .single();

  if (error) throw formatError("Gagal mencatat pembayaran hutang", error);
  return data;
}

export async function createSubscription(targetFamilyId, input) {
  assertFamilyId(targetFamilyId);
  const values = parseInput(schemas.subscription, input, "Data langganan");
  const user = await getCurrentUser(createClient());
  return insertOne(
    "subscriptions",
    {
      family_id: targetFamilyId,
      user_id: user.id,
      ...values,
      amount: Number(values.amount),
    },
    "Gagal menyimpan langganan"
  );
}

export async function paySubscription(targetFamilyId, subscriptionId) {
  assertFamilyId(targetFamilyId);
  if (!subscriptionId) throw new Error("ID langganan tidak valid");

  const supabase = createClient();
  const { data: sub, error: fetchErr } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("id", subscriptionId)
    .eq("family_id", targetFamilyId)
    .single();

  if (fetchErr || !sub) throw formatError("Langganan tidak ditemukan", fetchErr);

  const currentDate = new Date(sub.next_billing_date);
  if (sub.billing_cycle === "weekly") currentDate.setDate(currentDate.getDate() + 7);
  else if (sub.billing_cycle === "quarterly") currentDate.setMonth(currentDate.getMonth() + 3);
  else if (sub.billing_cycle === "yearly") currentDate.setFullYear(currentDate.getFullYear() + 1);
  else currentDate.setMonth(currentDate.getMonth() + 1);

  const nextDateStr = currentDate.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("subscriptions")
    .update({
      next_billing_date: nextDateStr,
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscriptionId)
    .eq("family_id", targetFamilyId)
    .select("*")
    .single();

  if (error) throw formatError("Gagal memperbarui langganan", error);
  return data;
}

export async function createAsset(targetFamilyId, input) {
  assertFamilyId(targetFamilyId);
  const values = parseInput(schemas.asset, input, "Data aset");
  const user = await getCurrentUser(createClient());
  return insertOne(
    "assets",
    {
      family_id: targetFamilyId,
      user_id: user.id,
      ...values,
      estimated_value: Number(values.estimated_value),
      purchase_price: Number(values.purchase_price || 0),
      purchase_date: values.purchase_date || null,
    },
    "Gagal menyimpan aset"
  );
}

export async function updateAsset(targetFamilyId, assetId, input) {
  assertFamilyId(targetFamilyId);
  if (!assetId) throw new Error("ID aset tidak valid");
  const values = parseInput(schemas.asset, input, "Data aset");
  const { data, error } = await createClient()
    .from("assets")
    .update({
      ...values,
      estimated_value: Number(values.estimated_value),
      purchase_price: Number(values.purchase_price || 0),
      purchase_date: values.purchase_date || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", assetId)
    .eq("family_id", targetFamilyId)
    .select("*")
    .single();

  if (error) throw formatError("Gagal memperbarui aset", error);
  return data;
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
