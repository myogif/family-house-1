import React, { act } from "react";
import { createRoot } from "react-dom/client";
import Goals from "./Goals";
import { useFamily } from "@/context/FamilyContext";
import { useResource } from "@/hooks/useResource";
import {
  createGoal,
  updateGoal,
  allocateToGoal,
  withdrawFromGoal,
  deleteResource,
} from "@/lib/data/resources";
import { toast } from "sonner";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("@/context/FamilyContext", () => ({
  useFamily: jest.fn(),
}));

jest.mock("@/hooks/useResource", () => ({
  useResource: jest.fn(),
}));

jest.mock("@/lib/data/resources", () => ({
  createGoal: jest.fn(),
  updateGoal: jest.fn(),
  allocateToGoal: jest.fn(),
  withdrawFromGoal: jest.fn(),
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

describe("Goals (Target Tabungan) page", () => {
  let container;
  let root;
  const mockReloadGoals = jest.fn();
  const mockReloadWallets = jest.fn();

  const mockGoals = [
    {
      id: "goal-1",
      family_id: "family-1",
      name: "Dana Liburan ke Bali",
      target_amount: 15000000,
      current_amount: 6000000,
      target_date: "2026-12-31",
    },
    {
      id: "goal-2",
      family_id: "family-1",
      name: "Beli Laptop Sekolah",
      target_amount: 10000000,
      current_amount: 10000000,
      target_date: "2026-10-15",
    },
  ];

  const mockWallets = [
    {
      id: "w-1",
      family_id: "family-1",
      name: "BCA Tabungan",
      current_balance: 5000000,
    },
    {
      id: "w-2",
      family_id: "family-1",
      name: "GoPay",
      current_balance: 850000,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    useFamily.mockReturnValue({
      activeId: "family-1",
      activeFamily: { id: "family-1", my_role: "husband" },
    });

    useResource.mockImplementation((url) => {
      if (url?.includes("goals")) {
        return { data: mockGoals, reload: mockReloadGoals };
      }
      if (url?.includes("wallets")) {
        return { data: mockWallets, reload: mockReloadWallets };
      }
      return { data: [], reload: jest.fn() };
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test("renders goals KPIs, list and badges correctly", () => {
    act(() => {
      root.render(<Goals />);
    });

    expect(container.textContent).toContain("Target Tabungan (Celengan)");
    expect(container.textContent).toContain("Dana Liburan ke Bali");
    expect(container.textContent).toContain("Beli Laptop Sekolah");
    expect(container.textContent).toContain("Total Target");
    expect(container.textContent).toContain("Terkumpul Saat Ini");
    expect(container.textContent).toContain("Tercapai 100%");
  });

  test("creates a new goal successfully", async () => {
    createGoal.mockResolvedValueOnce({
      id: "goal-3",
      name: "Dana Darurat",
      target_amount: 30000000,
      current_amount: 0,
    });

    act(() => {
      root.render(<Goals />);
    });

    const addBtn = container.querySelector('[data-testid="add-goal-button"]');
    act(() => {
      addBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const nameInput = document.body.querySelector('[data-testid="goal-name-input"]');
    const targetInput = document.body.querySelector('[data-testid="goal-target-input"]');
    const submitBtn = document.body.querySelector('[data-testid="goal-submit-button"]');

    act(() => {
      changeInput(nameInput, "Dana Darurat");
      changeInput(targetInput, "30000000");
    });

    await act(async () => {
      submitBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(createGoal).toHaveBeenCalledWith("family-1", {
      name: "Dana Darurat",
      target_amount: 30000000,
      current_amount: 0,
      target_date: null,
    });
    expect(toast.success).toHaveBeenCalled();
  });

  test("allocates money to goal (Nabung) successfully", async () => {
    allocateToGoal.mockResolvedValueOnce({
      id: "goal-1",
      current_amount: 7000000,
    });

    act(() => {
      root.render(<Goals />);
    });

    // Click Nabung on first card
    const saveBtns = Array.from(container.querySelectorAll("button")).filter((b) =>
      b.textContent.includes("Nabung")
    );
    expect(saveBtns.length).toBeGreaterThan(0);

    act(() => {
      saveBtns[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const amountInput = document.body.querySelector('input[placeholder="Contoh: 500000"]');
    const confirmBtn = Array.from(document.body.querySelectorAll("button")).find((b) =>
      b.textContent.includes("Konfirmasi Nabung")
    );

    expect(amountInput).not.toBeNull();
    expect(confirmBtn).not.toBeNull();

    act(() => {
      changeInput(amountInput, "1000000");
    });

    await act(async () => {
      confirmBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(allocateToGoal).toHaveBeenCalledWith(
      "family-1",
      "goal-1",
      expect.objectContaining({
        walletId: "w-1",
        amount: 1000000,
      })
    );
    expect(toast.success).toHaveBeenCalled();
    expect(mockReloadGoals).toHaveBeenCalled();
    expect(mockReloadWallets).toHaveBeenCalled();
  });
});
