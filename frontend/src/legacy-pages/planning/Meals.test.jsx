import React, { act } from "react";
import { createRoot } from "react-dom/client";
import Meals from "./Meals";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/context/AuthContext";
import { useResource } from "@/hooks/useResource";
import { createMeal, createShoppingItem, toggleResource, deleteResource } from "@/lib/data/resources";
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
  createMeal: jest.fn(),
  createShoppingItem: jest.fn(),
  toggleResource: jest.fn(),
  deleteResource: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

function changeInput(element, value) {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(prototype, "value").set;
  nativeInputValueSetter.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("Meals planning page", () => {
  let container;
  let root;
  const mockReload = jest.fn();

  const mockMeals = [
    {
      id: "meal-1",
      family_id: "family-1",
      user_id: "user-1",
      author_name: "Yogi",
      title: "Ayam Goreng Lengkuas",
      category: "makanan",
      meal_type: "makan_siang",
      date: new Date().toISOString(),
      ingredients: ["Ayam 1kg", "Lengkuas"],
      notes: "Goreng garing",
      video_url: "https://youtube.com/watch?v=123",
      done: false,
    },
  ];

  const mockRecipes = [
    {
      id: "recipe-custom-1",
      family_id: "family-1",
      user_id: "user-1",
      author_name: "Yogi",
      title: "Soto Betawi Istimewa",
      category: "makanan",
      meal_type: "makan_siang",
      ingredients: ["Daging sapi 500g", "Santan", "Susu evaporasi"],
      instructions: "Rebus daging dan masak kuah santan gurih.",
      video_url: "https://youtube.com/watch?v=soto",
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
      if (path?.includes("/recipes")) {
        return { data: mockRecipes, reload: jest.fn() };
      }
      return { data: mockMeals, reload: mockReload };
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test("renders weekly meal planner and shows planned meal", async () => {
    await act(async () => {
      root.render(<Meals />);
    });

    expect(container.querySelector("[data-testid='meals-page']")).toBeTruthy();
    expect(container.textContent).toContain("Perencanaan Menu (Meal Planning)");
    expect(container.textContent).toContain("Ayam Goreng Lengkuas");
    expect(container.querySelector("[data-testid='goto-recipes-btn']")).toBeTruthy();
  });

  test("adds a custom meal plan without creating master recipe", async () => {
    createMeal.mockResolvedValue({ id: "meal-new" });

    await act(async () => {
      root.render(<Meals />);
    });

    const addBtn = container.querySelector("[data-testid='add-meal-button']");
    await act(async () => {
      addBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // Switch to custom mode
    const customModeBtn = document.body.querySelector("[data-testid='mode-custom-btn']");
    await act(async () => {
      customModeBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const titleInput = document.body.querySelector("[data-testid='meal-form-title']");
    const notesInput = document.body.querySelector("[data-testid='meal-form-notes']");

    await act(async () => {
      changeInput(titleInput, "Makan Malam Seafood di Luar");
      changeInput(notesInput, "Restoran tepi pantai");
    });

    const submitBtn = document.body.querySelector("[data-testid='submit-meal-btn']");
    await act(async () => {
      submitBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(createMeal).toHaveBeenCalledWith("family-1", expect.objectContaining({
      title: "Makan Malam Seafood di Luar",
      notes: "Restoran tepi pantai",
      recipe_id: null,
    }));
    expect(toast.success).toHaveBeenCalledWith("Menu berhasil dijadwalkan");
    expect(mockReload).toHaveBeenCalled();
  });

  test("toggles a meal completion status", async () => {
    toggleResource.mockResolvedValue([{ id: "meal-1", done: true }]);

    await act(async () => {
      root.render(<Meals />);
    });

    const toggleCheckbox = container.querySelector("[data-testid='toggle-meal-meal-1']");
    await act(async () => {
      toggleCheckbox.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(toggleResource).toHaveBeenCalledWith("family-1", "meals", mockMeals[0]);
    expect(mockReload).toHaveBeenCalled();
  });

  test("deletes a meal from schedule", async () => {
    deleteResource.mockResolvedValue(true);

    await act(async () => {
      root.render(<Meals />);
    });

    const deleteBtn = container.querySelector("[data-testid='delete-meal-meal-1']");
    await act(async () => {
      deleteBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(deleteResource).toHaveBeenCalledWith("family-1", "meals", "meal-1");
    expect(toast.success).toHaveBeenCalledWith("Menu dihapus");
    expect(mockReload).toHaveBeenCalled();
  });

  test("exports all ingredients of the current week to shopping list", async () => {
    createShoppingItem.mockResolvedValue({ id: "shop-1" });

    await act(async () => {
      root.render(<Meals />);
    });

    const exportBtn = container.querySelector("[data-testid='export-week-shopping-btn']");
    await act(async () => {
      exportBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(createShoppingItem).toHaveBeenCalledTimes(2);
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("diekspor ke Daftar Belanja"));
  });

  test("opens preview recipe for a meal with notes or ingredients", async () => {
    await act(async () => {
      root.render(<Meals />);
    });

    const previewBtn = container.querySelector("[data-testid='preview-meal-recipe-meal-1']");
    await act(async () => {
      previewBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.querySelector("[data-testid='preview-recipe-dialog']")).toBeTruthy();
    expect(document.body.textContent).toContain("Ayam 1kg");
    expect(document.body.textContent).toContain("Goreng garing");
  });
});
