import React, { act } from "react";
import { createRoot } from "react-dom/client";
import Transactions from "./Transactions";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/context/AuthContext";
import { useResource } from "@/hooks/useResource";
import { createTransaction, deleteResource } from "@/lib/data/resources";
import { toast } from "sonner";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("@/context/FamilyContext", () => ({
  useFamily: jest.fn(),
}));

jest.mock("@/context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/hooks/useResource", () => ({
  useResource: jest.fn(),
}));

jest.mock("@/lib/data/resources", () => ({
  createTransaction: jest.fn(),
  deleteResource: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

function changeInput(element, value) {
  const prototype = window.HTMLInputElement.prototype;
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(prototype, "value").set;
  nativeInputValueSetter.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("Transactions page", () => {
  let container;
  let root;
  const mockReload = jest.fn();

  const mockTxs = [
    {
      id: "tx-1",
      family_id: "family-1",
      description: "Gaji Bulanan",
      category: "Gaji",
      amount: 7500000,
      type: "income",
      date: new Date().toISOString(),
      member_name: "Yogi",
    },
    {
      id: "tx-2",
      family_id: "family-1",
      description: "Belanja Supermarket",
      category: "Makanan",
      amount: 450000,
      type: "expense",
      date: new Date().toISOString(),
      member_name: "Yogi",
    },
  ];

  const mockWallets = [
    { id: "w-1", name: "BCA Tabungan" },
    { id: "w-2", name: "GoPay" },
  ];

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    jest.clearAllMocks();
    useFamily.mockReturnValue({
      activeId: "family-1",
      activeFamily: { id: "family-1", my_role: "husband" },
    });
    useAuth.mockReturnValue({
      user: { id: "user-1", name: "Yogi" },
    });
    useResource.mockImplementation((path) => {
      if (path?.includes("/transactions")) return { data: mockTxs, reload: mockReload };
      if (path?.includes("/wallets")) return { data: mockWallets, reload: jest.fn() };
      return { data: [], reload: jest.fn() };
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test("renders transaction daily view and summary metrics", async () => {
    await act(async () => {
      root.render(<Transactions />);
    });

    expect(container.querySelector("[data-testid='transactions-page']")).toBeTruthy();
    expect(container.textContent).toContain("Transaksi Keuangan");
    expect(container.textContent).toContain("Gaji Bulanan");
    expect(container.textContent).toContain("Belanja Supermarket");
  });

  test("creates a new expense transaction", async () => {
    createTransaction.mockResolvedValue({ id: "tx-3" });

    await act(async () => {
      root.render(<Transactions />);
    });

    const addBtn = container.querySelector("[data-testid='add-transaction-button']");
    await act(async () => {
      addBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const descInput = document.body.querySelector("[data-testid='tx-description-input']");
    const amountInput = document.body.querySelector("[data-testid='tx-amount-input']");

    await act(async () => {
      changeInput(descInput, "Makan Siang Restoran");
      changeInput(amountInput, "120000");
    });

    const submitBtn = document.body.querySelector("[data-testid='tx-submit-button']");
    await act(async () => {
      submitBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(createTransaction).toHaveBeenCalledWith("family-1", expect.objectContaining({
      description: "Makan Siang Restoran",
      amount: 120000,
      type: "expense",
    }));
    expect(toast.success).toHaveBeenCalledWith("Pengeluaran dicatat");
  });
});
