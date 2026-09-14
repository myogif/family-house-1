import React, { act } from "react";
import { createRoot } from "react-dom/client";
import Subscriptions from "./Subscriptions";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/context/AuthContext";
import { useResource } from "@/hooks/useResource";
import {
  createSubscription,
  paySubscription,
  deleteResource,
  createTransaction,
} from "@/lib/data/resources";
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
  createSubscription: jest.fn(),
  paySubscription: jest.fn(),
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

describe("Subscriptions page", () => {
  let container;
  let root;
  const mockReload = jest.fn();

  const mockSubs = [
    {
      id: "sub-1",
      family_id: "family-1",
      name: "WiFi Indihome",
      category: "Tagihan",
      amount: 375000,
      billing_cycle: "monthly",
      next_billing_date: "2026-10-01",
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
      if (path?.includes("/subscriptions")) return { data: mockSubs, reload: mockReload };
      return { data: [], reload: jest.fn() };
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test("renders active subscriptions and estimated monthly cost", async () => {
    await act(async () => {
      root.render(<Subscriptions />);
    });

    expect(container.querySelector("[data-testid='subscriptions-page']")).toBeTruthy();
    expect(container.textContent).toContain("Langganan & Tagihan Rutin");
    expect(container.textContent).toContain("WiFi Indihome");
  });

  test("creates a new subscription", async () => {
    createSubscription.mockResolvedValue({ id: "sub-2" });

    await act(async () => {
      root.render(<Subscriptions />);
    });

    const addBtn = container.querySelector("[data-testid='add-subscription-button']");
    await act(async () => {
      addBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const nameInput = document.body.querySelector("[data-testid='sub-name-input']");
    const amountInput = document.body.querySelector("[data-testid='sub-amount-input']");

    await act(async () => {
      changeInput(nameInput, "Netflix Family");
      changeInput(amountInput, "186000");
    });

    const submitBtn = document.body.querySelector("[data-testid='submit-sub-btn']");
    await act(async () => {
      submitBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(createSubscription).toHaveBeenCalledWith("family-1", expect.objectContaining({
      name: "Netflix Family",
      amount: 186000,
    }));
    expect(toast.success).toHaveBeenCalledWith("Langganan rutin berhasil disimpan");
  });

  test("pays bill with 1-click and advances billing date", async () => {
    paySubscription.mockResolvedValue({ id: "sub-1", next_billing_date: "2026-11-01" });
    createTransaction.mockResolvedValue({ id: "tx-pay-1" });

    await act(async () => {
      root.render(<Subscriptions />);
    });

    const payBtn = container.querySelector("[data-testid='pay-sub-btn-sub-1']");
    await act(async () => {
      payBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(paySubscription).toHaveBeenCalledWith("family-1", "sub-1");
    expect(createTransaction).toHaveBeenCalledWith("family-1", expect.objectContaining({
      amount: 375000,
      type: "expense",
    }));
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("berhasil dibayar"));
  });
});
