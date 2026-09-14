import React, { act } from "react";
import { createRoot } from "react-dom/client";
import Budget from "./Budget";
import { useFamily } from "@/context/FamilyContext";
import { useResource } from "@/hooks/useResource";
import { createBudget, updateBudget, deleteResource } from "@/lib/data/resources";
import { toast } from "sonner";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("@/context/FamilyContext", () => ({
  useFamily: jest.fn(),
}));

jest.mock("@/hooks/useResource", () => ({
  useResource: jest.fn(),
}));

jest.mock("@/lib/data/resources", () => ({
  createBudget: jest.fn(),
  updateBudget: jest.fn(),
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

describe("Budget page", () => {
  let container;
  let root;
  const mockReload = jest.fn();

  const mockBudgets = [
    {
      id: "b-1",
      family_id: "family-1",
      category: "Makanan",
      limit: 2500000,
      spent: 1500000,
      remaining: 1000000,
      percentage: 60,
    },
    {
      id: "b-2",
      family_id: "family-1",
      category: "Tagihan",
      limit: 1000000,
      spent: 900000,
      remaining: 100000,
      percentage: 90,
    },
    {
      id: "b-3",
      family_id: "family-1",
      category: "Hiburan",
      limit: 500000,
      spent: 600000,
      remaining: 0,
      percentage: 120,
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

    useResource.mockReturnValue({
      data: mockBudgets,
      reload: mockReload,
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test("renders budget summary KPIs and list correctly", () => {
    act(() => {
      root.render(<Budget />);
    });

    expect(container.textContent).toContain("Anggaran Bulanan");
    expect(container.textContent).toContain("Makanan");
    expect(container.textContent).toContain("Tagihan");
    expect(container.textContent).toContain("Hiburan");
    // KPI checks
    expect(container.textContent).toContain("Total Pagu");
    expect(container.textContent).toContain("Terpakai Bulan Ini");
    expect(container.textContent).toContain("Sisa Anggaran");
    // Badge status checks
    expect(container.textContent).toContain("Aman 60%");
    expect(container.textContent).toContain("Waspada 90%");
    expect(container.textContent).toContain("Over 120%");
  });

  test("creates a new budget successfully", async () => {
    createBudget.mockResolvedValueOnce({ id: "b-4", category: "Transportasi", limit: 800000 });

    act(() => {
      root.render(<Budget />);
    });

    const addBtn = container.querySelector('[data-testid="add-budget-button"]');
    act(() => {
      addBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const limitInput = document.body.querySelector('[data-testid="budget-limit-input"]');
    const submitBtn = document.body.querySelector('[data-testid="budget-submit-button"]');

    expect(limitInput).not.toBeNull();

    act(() => {
      changeInput(limitInput, "800000");
    });

    await act(async () => {
      submitBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(createBudget).toHaveBeenCalledWith("family-1", {
      category: "Makanan",
      limit: 800000,
    });
    expect(toast.success).toHaveBeenCalled();
    expect(mockReload).toHaveBeenCalled();
  });
});
