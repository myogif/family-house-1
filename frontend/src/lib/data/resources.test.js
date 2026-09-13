import {
  createJournalEntry,
  createTransaction,
  deleteResource,
  listResource,
  createTask,
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
});
