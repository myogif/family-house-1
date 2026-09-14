import React, { act } from "react";
import { createRoot } from "react-dom/client";
import Assets from "./Assets";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/context/AuthContext";
import { useResource } from "@/hooks/useResource";
import { createAsset, updateAsset, deleteResource } from "@/lib/data/resources";
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
  createAsset: jest.fn(),
  updateAsset: jest.fn(),
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

describe("Assets page", () => {
  let container;
  let root;
  const mockReload = jest.fn();

  const mockAssets = [
    {
      id: "asset-1",
      family_id: "family-1",
      name: "Rumah Utama",
      category: "property",
      estimated_value: 450000000,
      purchase_price: 320000000,
      location: "Jakarta",
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
      if (path?.includes("/assets")) return { data: mockAssets, reload: mockReload };
      return { data: [], reload: jest.fn() };
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test("renders assets and calculates net worth", async () => {
    await act(async () => {
      root.render(<Assets />);
    });

    expect(container.querySelector("[data-testid='assets-page']")).toBeTruthy();
    expect(container.textContent).toContain("Aset & Kekayaan Bersih");
    expect(container.textContent).toContain("Rumah Utama");
  });

  test("creates a new asset", async () => {
    createAsset.mockResolvedValue({ id: "asset-2" });

    await act(async () => {
      root.render(<Assets />);
    });

    const addBtn = container.querySelector("[data-testid='add-asset-button']");
    await act(async () => {
      addBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const nameInput = document.body.querySelector("[data-testid='asset-name-input']");
    const valInput = document.body.querySelector("[data-testid='asset-value-input']");

    await act(async () => {
      changeInput(nameInput, "Honda Vario 160");
      changeInput(valInput, "18500000");
    });

    const submitBtn = document.body.querySelector("[data-testid='submit-asset-btn']");
    await act(async () => {
      submitBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(createAsset).toHaveBeenCalledWith("family-1", expect.objectContaining({
      name: "Honda Vario 160",
      estimated_value: 18500000,
    }));
    expect(toast.success).toHaveBeenCalledWith("Aset baru berhasil dicatat");
  });
});
