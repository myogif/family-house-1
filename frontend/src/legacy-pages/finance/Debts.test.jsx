import React, { act } from "react";
import { createRoot } from "react-dom/client";
import Debts from "./Debts";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/context/AuthContext";
import { useResource } from "@/hooks/useResource";
import { createDebt, payDebt, deleteResource, createTransaction } from "@/lib/data/resources";
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
  createDebt: jest.fn(),
  payDebt: jest.fn(),
  deleteResource: jest.fn(),
  createTransaction: jest.fn(),
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

describe("Debts and Loans page", () => {
  let container;
  let root;
  const mockReload = jest.fn();

  const mockDebts = [
    {
      id: "debt-1",
      family_id: "family-1",
      type: "debt",
      person_name: "Cicilan Elektronik",
      total_amount: 3000000,
      paid_amount: 1000000,
      due_date: "2026-12-31",
      status: "partial",
      notes: "Laptop kantor",
    },
    {
      id: "loan-1",
      family_id: "family-1",
      type: "loan",
      person_name: "Budi Santoso",
      total_amount: 500000,
      paid_amount: 0,
      due_date: "2026-10-15",
      status: "unpaid",
      notes: "Pinjaman teman",
    },
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
      if (path?.includes("/debts")) return { data: mockDebts, reload: mockReload };
      return { data: [], reload: jest.fn() };
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test("renders debts and loans overview", async () => {
    await act(async () => {
      root.render(<Debts />);
    });

    expect(container.querySelector("[data-testid='debts-page']")).toBeTruthy();
    expect(container.textContent).toContain("Hutang & Piutang Keluarga");
    expect(container.textContent).toContain("Cicilan Elektronik");
  });

  test("creates a new debt entry", async () => {
    createDebt.mockResolvedValue({ id: "debt-2" });

    await act(async () => {
      root.render(<Debts />);
    });

    const addBtn = container.querySelector("[data-testid='add-debt-button']");
    await act(async () => {
      addBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const personInput = document.body.querySelector("[data-testid='debt-person-input']");
    const amountInput = document.body.querySelector("[data-testid='debt-amount-input']");

    await act(async () => {
      changeInput(personInput, "Bank Mandiri KTA");
      changeInput(amountInput, "10000000");
    });

    const submitBtn = document.body.querySelector("[data-testid='submit-debt-btn']");
    await act(async () => {
      submitBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(createDebt).toHaveBeenCalledWith("family-1", expect.objectContaining({
      person_name: "Bank Mandiri KTA",
      total_amount: 10000000,
    }));
    expect(toast.success).toHaveBeenCalledWith("Hutang baru dicatat");
  });

  test("records payment for an active debt", async () => {
    payDebt.mockResolvedValue({ id: "debt-1", status: "paid" });

    await act(async () => {
      root.render(<Debts />);
    });

    const payBtn = container.querySelector("[data-testid='pay-debt-btn-debt-1']");
    await act(async () => {
      payBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const amountInput = document.body.querySelector("[data-testid='pay-amount-input']");
    await act(async () => {
      changeInput(amountInput, "2000000");
    });

    const submitBtn = document.body.querySelector("[data-testid='submit-payment-btn']");
    await act(async () => {
      submitBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(payDebt).toHaveBeenCalledWith("family-1", "debt-1", 2000000);
    expect(toast.success).toHaveBeenCalledWith("Pembayaran cicilan berhasil dicatat!");
  });
});
