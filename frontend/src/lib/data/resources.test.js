import {
  createJournalEntry,
  createTransaction,
  deleteResource,
  listResource,
  createTask,
  createMeal,
  createRecipe,
  updateRecipe,
  createWallet,
  updateWallet,
  createDebt,
  payDebt,
  createSubscription,
  paySubscription,
  createAsset,
  updateAsset,
  toggleResource,
} from "./resources";
import { createClient } from "../supabase/browser";

jest.mock("../supabase/browser", () => ({ createClient: jest.fn() }));

function makeQuery(result) {
  const query = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    order: jest.fn(() => Promise.resolve(result)),
    insert: jest.fn(() => query),
    update: jest.fn(() => query),
    delete: jest.fn(() => query),
    single: jest.fn(() => Promise.resolve(result)),
  };
  return query;
}

function mockUserClient(query) {
  return {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user-1", user_metadata: { name: "Yogi" } } }, error: null }) },
    from: jest.fn(() => query),
  };
}

describe("Supabase resource data access", () => {
  beforeEach(() => jest.clearAllMocks());

  test("rejects a null family id before touching Supabase", async () => {
    createClient.mockReturnValue({ from: jest.fn(), auth: { getUser: jest.fn() } });

    await expect(createJournalEntry(null, { title: "Halo", content: "Isi" })).rejects.toThrow("Keluarga belum dipilih");
    await expect(createTransaction(null, { description: "Belanja", category: "Makanan", amount: 1, type: "expense" })).rejects.toThrow("Keluarga belum dipilih");
    await expect(createTask(null, { title: "Tugas" })).rejects.toThrow("Keluarga belum dipilih");
    await expect(createMeal(null, { title: "Ayam Goreng" })).rejects.toThrow("Keluarga belum dipilih");
    await expect(createRecipe(null, { title: "Ayam Goreng" })).rejects.toThrow("Keluarga belum dipilih");
    await expect(toggleResource(null, "tasks", { id: "task-1", status: "todo" })).rejects.toThrow("Keluarga belum dipilih");
    await expect(deleteResource(null, "tasks", "task-1")).rejects.toThrow("Keluarga belum dipilih");
    expect(createClient).not.toHaveBeenCalled();
  });

  test("lists journal entries with a safe family scope filter", async () => {
    const query = makeQuery({ data: [{ id: "entry-1" }], error: null });
    createClient.mockReturnValue({ from: jest.fn(() => query) });

    await expect(listResource("/families/family-1/journal?scope=family")).resolves.toEqual([
      { id: "entry-1" },
    ]);
    expect(query.eq).toHaveBeenCalledWith("family_id", "family-1");
    expect(query.eq).toHaveBeenCalledWith("visibility", "family");
  });

  test("rejects invalid journal input before touching Supabase", async () => {
    createClient.mockReturnValue({ from: jest.fn() });

    await expect(
      createJournalEntry("family-1", { title: "", content: "Isi" }),
    ).rejects.toThrow("Data jurnal tidak valid");
    expect(createClient).not.toHaveBeenCalled();
  });

  test("adds the authenticated actor to a transaction", async () => {
    const query = makeQuery({ data: [{ id: "tx-1" }], error: null });
    createClient.mockReturnValue(mockUserClient(query));

    await createTransaction("family-1", {
      description: "Belanja",
      category: "Makanan",
      amount: "25000",
      type: "expense",
    });

    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({
      family_id: "family-1",
      user_id: "user-1",
      member_name: "Yogi",
      amount: 25000,
    }));
  });

  test("normalizes task toggle to the opposite immutable status", async () => {
    const result = { data: [{ id: "task-1", status: "done" }], error: null };
    const query = {
      update: jest.fn(() => query),
      eq: jest.fn(() => query),
      select: jest.fn(() => Promise.resolve(result)),
    };
    createClient.mockReturnValue({ from: jest.fn(() => query) });

    const task = { id: "task-1", status: "todo" };
    await expect(toggleResource("family-1", "tasks", task)).resolves.toEqual([
      { id: "task-1", status: "done" },
    ]);
    expect(task).toEqual({ id: "task-1", status: "todo" });
    expect(query.update).toHaveBeenCalledWith({ status: "done" });
  });

  test("creates tasks with validated nullable fields", async () => {
    const query = makeQuery({ data: [{ id: "task-1" }], error: null });
    createClient.mockReturnValue({ from: jest.fn(() => query) });

    await createTask("family-1", {
      title: "Bayar listrik",
      assignee_id: "user-2",
      due_date: "2026-09-20",
      priority: "high",
    });

    expect(query.insert).toHaveBeenCalledWith({
      family_id: "family-1",
      title: "Bayar listrik",
      assignee_id: "user-2",
      due_date: "2026-09-20",
      priority: "high",
    });
  });

  test("creates master recipe with category, ingredients, servings, times and video_url", async () => {
    const query = makeQuery({ data: [{ id: "recipe-1" }], error: null });
    createClient.mockReturnValue(mockUserClient(query));

    await createRecipe("family-1", {
      title: "Pisang Goreng Crispy",
      category: "cemilan",
      meal_type: "camilan",
      servings: 4,
      prep_time: 15,
      cook_time: 20,
      ingredients: ["1 sisir pisang kepok", "Tepung terigu", "Minyak goreng"],
      instructions: "Goreng hingga kecokelatan.",
      video_url: "https://youtube.com/watch?v=123",
    });

    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({
      family_id: "family-1",
      user_id: "user-1",
      author_name: "Yogi",
      title: "Pisang Goreng Crispy",
      category: "cemilan",
      meal_type: "camilan",
      servings: 4,
      prep_time: 15,
      cook_time: 20,
      ingredients: ["1 sisir pisang kepok", "Tepung terigu", "Minyak goreng"],
      instructions: "Goreng hingga kecokelatan.",
      video_url: "https://youtube.com/watch?v=123",
    }));
  });

  test("updates an existing recipe with immutable payload", async () => {
    const query = makeQuery({ data: { id: "recipe-1", title: "Pisang Goreng Keju" }, error: null });
    createClient.mockReturnValue({ from: jest.fn(() => query) });

    const updated = await updateRecipe("family-1", "recipe-1", {
      title: "Pisang Goreng Keju",
      category: "cemilan",
      meal_type: "camilan",
      servings: 6,
      prep_time: 10,
      cook_time: 15,
      ingredients: ["Pisang kepok", "Keju cheddar", "Susu kental manis"],
      instructions: "Goreng pisang lalu taburi parutan keju dan susu kental manis.",
      video_url: "",
    });

    expect(updated).toEqual({ id: "recipe-1", title: "Pisang Goreng Keju" });
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({
      title: "Pisang Goreng Keju",
      servings: 6,
      prep_time: 10,
      cook_time: 15,
    }));
    expect(query.eq).toHaveBeenCalledWith("id", "recipe-1");
    expect(query.eq).toHaveBeenCalledWith("family_id", "family-1");
  });

  test("creates meal with category, video_url and default zero cost", async () => {
    const query = makeQuery({ data: [{ id: "meal-1" }], error: null });
    createClient.mockReturnValue(mockUserClient(query));

    await createMeal("family-1", {
      title: "Es Kuwut Bali",
      category: "minuman",
      meal_type: "sarapan",
      ingredients: ["Kelapa muda", "Jeruk nipis", "Selasih"],
      notes: "Sajikan dingin",
      video_url: "https://tiktok.com/@resep/es-kuwut",
    });

    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({
      family_id: "family-1",
      user_id: "user-1",
      title: "Es Kuwut Bali",
      category: "minuman",
      video_url: "https://tiktok.com/@resep/es-kuwut",
      cost: 0,
    }));
  });

  test("lists recipes ordered by created_at desc", async () => {
    const query = makeQuery({ data: [{ id: "recipe-1", title: "Sop Buntut" }], error: null });
    createClient.mockReturnValue({ from: jest.fn(() => query) });

    const result = await listResource("/families/family-1/recipes");
    expect(result).toEqual([{ id: "recipe-1", title: "Sop Buntut" }]);
    expect(query.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  test("gracefully falls back to empty array when recipes table is missing in schema cache", async () => {
    const query = makeQuery({
      data: null,
      error: { message: "Could not find the table 'public.recipes' in the schema cache", code: "PGRST204" },
    });
    createClient.mockReturnValue({ from: jest.fn(() => query) });

    const result = await listResource("/families/family-1/recipes");
    expect(result).toEqual([]);
  });

  test("creates wallet account and calculates initial balance", async () => {
    const query = makeQuery({ data: [{ id: "wallet-1" }], error: null });
    createClient.mockReturnValue({ from: jest.fn(() => query) });

    await createWallet("family-1", {
      name: "BCA Tabungan Utama",
      type: "bank",
      initial_balance: 5000000,
      account_number: "1234567890",
      color: "#1e40af",
    });

    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({
      family_id: "family-1",
      name: "BCA Tabungan Utama",
      type: "bank",
      initial_balance: 5000000,
      current_balance: 5000000,
    }));
  });

  test("creates debt and determines status based on paid amount", async () => {
    const query = makeQuery({ data: [{ id: "debt-1" }], error: null });
    createClient.mockReturnValue(mockUserClient(query));

    await createDebt("family-1", {
      type: "debt",
      person_name: "Cicilan Elektronik",
      total_amount: 3000000,
      paid_amount: 1000000,
      due_date: "2026-12-31",
      notes: "Cicilan laptop",
    });

    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({
      family_id: "family-1",
      user_id: "user-1",
      type: "debt",
      person_name: "Cicilan Elektronik",
      total_amount: 3000000,
      paid_amount: 1000000,
      status: "partial",
    }));
  });

  test("creates subscription with billing cycle and next date", async () => {
    const query = makeQuery({ data: [{ id: "sub-1" }], error: null });
    createClient.mockReturnValue(mockUserClient(query));

    await createSubscription("family-1", {
      name: "Netflix Family",
      category: "Hiburan",
      amount: 186000,
      billing_cycle: "monthly",
      next_billing_date: "2026-10-01",
    });

    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({
      family_id: "family-1",
      user_id: "user-1",
      name: "Netflix Family",
      amount: 186000,
      billing_cycle: "monthly",
    }));
  });

  test("creates and updates family asset with estimated value", async () => {
    const query = makeQuery({ data: [{ id: "asset-1" }], error: null });
    createClient.mockReturnValue(mockUserClient(query));

    await createAsset("family-1", {
      name: "Rumah Utama",
      category: "property",
      estimated_value: 500000000,
      purchase_price: 350000000,
      purchase_date: "2022-01-10",
      location: "Jakarta Selatan",
    });

    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({
      family_id: "family-1",
      name: "Rumah Utama",
      category: "property",
      estimated_value: 500000000,
    }));
  });

  test("allocates money from wallet to goal atomically", async () => {
    const mockGoal = { id: "goal-1", family_id: "family-1", name: "Dana Liburan", current_amount: 1000000 };
    const mockWallet = { id: "w-1", family_id: "family-1", name: "BCA Tabungan", current_balance: 5000000 };
    const updatedGoal = { ...mockGoal, current_amount: 2000000 };

    const query = {
      select: jest.fn(() => query),
      eq: jest.fn(() => query),
      insert: jest.fn(() => query),
      update: jest.fn(() => query),
      single: jest.fn()
        .mockResolvedValueOnce({ data: mockGoal, error: null })
        .mockResolvedValueOnce({ data: mockWallet, error: null })
        .mockResolvedValueOnce({ data: updatedGoal, error: null })
        .mockResolvedValueOnce({ data: { id: "tx-save-1" }, error: null }),
    };

    createClient.mockReturnValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user-1", user_metadata: { name: "Yogi" } } }, error: null }) },
      from: jest.fn(() => query),
    });

    const { allocateToGoal } = await import("./resources");
    const res = await allocateToGoal("family-1", "goal-1", {
      walletId: "w-1",
      amount: 1000000,
      notes: "Nabung bulanan",
    });

    expect(res.current_amount).toBe(2000000);
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ current_balance: 4000000 }));
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ current_amount: 2000000 }));
  });

  test("withdraws money from goal to wallet atomically", async () => {
    const mockGoal = { id: "goal-1", family_id: "family-1", name: "Dana Liburan", current_amount: 3000000 };
    const mockWallet = { id: "w-1", family_id: "family-1", name: "BCA Tabungan", current_balance: 5000000 };
    const updatedGoal = { ...mockGoal, current_amount: 2000000 };

    const query = {
      select: jest.fn(() => query),
      eq: jest.fn(() => query),
      insert: jest.fn(() => query),
      update: jest.fn(() => query),
      single: jest.fn()
        .mockResolvedValueOnce({ data: mockGoal, error: null })
        .mockResolvedValueOnce({ data: mockWallet, error: null })
        .mockResolvedValueOnce({ data: updatedGoal, error: null })
        .mockResolvedValueOnce({ data: { id: "tx-wd-1" }, error: null }),
    };

    createClient.mockReturnValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user-1", user_metadata: { name: "Yogi" } } }, error: null }) },
      from: jest.fn(() => query),
    });

    const { withdrawFromGoal } = await import("./resources");
    const res = await withdrawFromGoal("family-1", "goal-1", {
      walletId: "w-1",
      amount: 1000000,
      notes: "Pencairan tiket pesawat",
    });

    expect(res.current_amount).toBe(2000000);
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ current_balance: 6000000 }));
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ current_amount: 2000000 }));
  });
});
