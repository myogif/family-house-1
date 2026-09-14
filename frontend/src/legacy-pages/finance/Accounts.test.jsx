import React, { act } from "react";
import { createRoot } from "react-dom/client";
import Accounts from "./Accounts";
import { useFamily } from "@/context/FamilyContext";
import { useResource } from "@/hooks/useResource";
import { createWallet, updateWallet, deleteResource, createTransaction } from "@/lib/data/resources";
import { toast } from "sonner";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("@/context/FamilyContext", () => ({
  useFamily: jest.fn(),
}));

jest.mock("@/hooks/useResource", () => ({
  useResource: jest.fn(),
}));

jest.mock("@/lib/data/resources", () => ({
  createWallet: jest.fn(),
  updateWallet: jest.fn(),
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

describe("Accounts & Wallets page", () => {
  let container;
  let root;
  const mockReloadWallets = jest.fn();
  const mockReloadTxs = jest.fn();

  const mockWallets = [
    {
      id: "wallet-1",
      family_id: "family-1",
      name: "BCA Tabungan",
      type: "bank",
      initial_balance: 5000000,
      account_number: "1234567890",
      color: "#1e40af",
    },
    {
      id: "wallet-2",
      family_id: "family-1",
      name: "GoPay",
      type: "ewallet",
      initial_balance: 500000,
      account_number: "08123456789",
      color: "#059669",
    },
  ];

  const mockTxs = [
    {
      id: "tx-1",
      wallet_id: "wallet-1",
      amount: 1000000,
      type: "income",
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
      if (path?.includes("/wallets")) {
        return { data: mockWallets, reload: mockReloadWallets };
      }
      return { data: mockTxs, reload: mockReloadTxs };
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test("renders wallets and calculates live balances", async () => {
    await act(async () => {
      root.render(<Accounts />);
    });

    expect(container.querySelector("[data-testid='accounts-page']")).toBeTruthy();
    expect(container.textContent).toContain("Dompet & Rekening Keluarga");
    expect(container.textContent).toContain("BCA Tabungan");
    expect(container.textContent).toContain("GoPay");
  });

  test("creates a new wallet", async () => {
    createWallet.mockResolvedValue({ id: "wallet-3", name: "Kas Tunai" });

    await act(async () => {
      root.render(<Accounts />);
    });

    const addBtn = container.querySelector("[data-testid='add-wallet-button']");
    await act(async () => {
      addBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const nameInput = document.body.querySelector("[data-testid='wallet-name-input']");
    const balInput = document.body.querySelector("[data-testid='wallet-balance-input']");

    await act(async () => {
      changeInput(nameInput, "Kas Tunai Brankas");
      changeInput(balInput, "750000");
    });

    const submitBtn = document.body.querySelector("[data-testid='submit-wallet-btn']");
    await act(async () => {
      submitBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(createWallet).toHaveBeenCalledWith("family-1", expect.objectContaining({
      name: "Kas Tunai Brankas",
      initial_balance: 750000,
    }));
    expect(toast.success).toHaveBeenCalledWith("Dompet baru berhasil ditambahkan");
  });

  test("transfers money between wallets", async () => {
    createTransaction.mockResolvedValue({ id: "tx-transfer-1" });

    await act(async () => {
      root.render(<Accounts />);
    });

    const transferBtn = container.querySelector("[data-testid='transfer-wallet-button']");
    await act(async () => {
      transferBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const amtInput = document.body.querySelector("[data-testid='transfer-amount-input']");
    await act(async () => {
      changeInput(amtInput, "200000");
    });

    const submitBtn = document.body.querySelector("[data-testid='submit-transfer-btn']");
    await act(async () => {
      submitBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(createTransaction).toHaveBeenCalledWith("family-1", expect.objectContaining({
      amount: 200000,
      type: "transfer",
    }));
    expect(toast.success).toHaveBeenCalledWith("Transfer saldo berhasil dicatat!");
  });
});
