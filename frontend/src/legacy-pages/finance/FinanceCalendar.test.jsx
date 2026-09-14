import React, { act } from "react";
import { createRoot } from "react-dom/client";
import FinanceCalendar from "./FinanceCalendar";
import { useFamily } from "@/context/FamilyContext";
import { useResource } from "@/hooks/useResource";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("@/context/FamilyContext", () => ({
  useFamily: jest.fn(),
}));

jest.mock("@/hooks/useResource", () => ({
  useResource: jest.fn(),
}));

describe("Finance Calendar page", () => {
  let container;
  let root;

  const mockTxs = [
    {
      id: "tx-1",
      family_id: "family-1",
      description: "Gaji",
      category: "Gaji",
      amount: 7500000,
      type: "income",
      date: new Date().toISOString(),
    },
    {
      id: "tx-2",
      family_id: "family-1",
      description: "Belanja",
      category: "Makanan",
      amount: 350000,
      type: "expense",
      date: new Date().toISOString(),
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
    useResource.mockImplementation((path) => {
      if (path?.includes("/transactions")) return { data: mockTxs, reload: jest.fn() };
      return { data: [], reload: jest.fn() };
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test("renders monthly calendar and transaction markers", async () => {
    await act(async () => {
      root.render(<FinanceCalendar />);
    });

    expect(container.querySelector("[data-testid='finance-calendar-page']")).toBeTruthy();
    expect(container.textContent).toContain("Kalender Keuangan");
    expect(container.querySelector("[data-testid='calendar-grid']")).toBeTruthy();
  });

  test("navigates months", async () => {
    await act(async () => {
      root.render(<FinanceCalendar />);
    });

    const nextBtn = container.querySelector("[data-testid='cal-next-month']");
    await act(async () => {
      nextBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector("[data-testid='cal-month-title']")).toBeTruthy();
  });
});
