import React, { act } from "react";
import { createRoot } from "react-dom/client";
import Recipes from "./Recipes";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/context/AuthContext";
import { useResource } from "@/hooks/useResource";
import {
  createRecipe,
  updateRecipe,
  deleteResource,
  createMeal,
  createShoppingItem,
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
  createRecipe: jest.fn(),
  updateRecipe: jest.fn(),
  deleteResource: jest.fn(),
  createMeal: jest.fn(),
  createShoppingItem: jest.fn(),
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

describe("Recipes Master Catalog page", () => {
  let container;
  let root;
  const mockReload = jest.fn();

  const mockCustomRecipes = [
    {
      id: "recipe-custom-1",
      family_id: "family-1",
      user_id: "user-1",
      author_name: "Yogi",
      title: "Soto Betawi Istimewa",
      category: "makanan",
      meal_type: "makan_siang",
      servings: 4,
      prep_time: 20,
      cook_time: 45,
      ingredients: ["Daging sapi 500g", "Santan kelapa", "Susu evaporasi"],
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
    useResource.mockReturnValue({
      data: mockCustomRecipes,
      reload: mockReload,
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test("renders recipe catalog with custom recipes and starter inspirations", async () => {
    await act(async () => {
      root.render(<Recipes />);
    });

    expect(container.querySelector("[data-testid='recipes-page']")).toBeTruthy();
    expect(container.textContent).toContain("Buku Resep Keluarga");
    expect(container.textContent).toContain("Soto Betawi Istimewa");
    expect(container.textContent).toContain("Ayam Ungkep Bumbu Lengkuas");
  });

  test("filters recipes by category", async () => {
    await act(async () => {
      root.render(<Recipes />);
    });

    const minumanFilterBtn = container.querySelector("[data-testid='filter-cat-minuman']");
    await act(async () => {
      minumanFilterBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Es Kuwut Bali");
    expect(container.textContent).not.toContain("Soto Betawi Istimewa");
  });

  test("searches recipes by keyword", async () => {
    await act(async () => {
      root.render(<Recipes />);
    });

    const searchInput = container.querySelector("[data-testid='search-recipe-input']");
    await act(async () => {
      changeInput(searchInput, "Santan kelapa");
    });

    expect(container.textContent).toContain("Soto Betawi Istimewa");
    expect(container.textContent).not.toContain("Ayam Ungkep Bumbu Lengkuas");
  });

  test("opens detail modal, scales servings, and sends ingredients to shopping list", async () => {
    createShoppingItem.mockResolvedValue({ id: "shop-1" });

    await act(async () => {
      root.render(<Recipes />);
    });

    const viewBtn = container.querySelector("[data-testid='view-recipe-recipe-custom-1']");
    await act(async () => {
      viewBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.querySelector("[data-testid='recipe-detail-dialog']")).toBeTruthy();
    expect(document.body.textContent).toContain("Rebus daging dan masak kuah santan gurih.");

    const sendToShoppingBtn = document.body.querySelector("[data-testid='send-to-shopping-btn']");
    await act(async () => {
      sendToShoppingBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(createShoppingItem).toHaveBeenCalledTimes(3);
    expect(toast.success).toHaveBeenCalledWith("3 bahan ditambahkan ke Daftar Belanja");
  });

  test("creates a new custom recipe and saves to database", async () => {
    createRecipe.mockResolvedValue({ id: "recipe-new-1", title: "Rendang Daging" });

    await act(async () => {
      root.render(<Recipes />);
    });

    const addBtn = container.querySelector("[data-testid='add-recipe-button']");
    await act(async () => {
      addBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const titleInput = document.body.querySelector("[data-testid='recipe-form-title']");
    const ingInput = document.body.querySelector("[data-testid='recipe-form-ing-input']");
    const addIngBtn = document.body.querySelector("[data-testid='recipe-form-add-ing-btn']");
    const instructionsInput = document.body.querySelector("[data-testid='recipe-form-instructions']");

    await act(async () => {
      changeInput(titleInput, "Rendang Padang Asli");
      changeInput(ingInput, "1 kg Daging Sapi Gandik");
    });

    await act(async () => {
      addIngBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await act(async () => {
      changeInput(instructionsInput, "Masak dengan santan kental selama 4 jam hingga kehitaman.");
    });

    const submitBtn = document.body.querySelector("[data-testid='recipe-form-submit']");
    await act(async () => {
      submitBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(createRecipe).toHaveBeenCalledWith("family-1", expect.objectContaining({
      title: "Rendang Padang Asli",
      ingredients: ["1 kg Daging Sapi Gandik"],
      instructions: "Masak dengan santan kental selama 4 jam hingga kehitaman.",
    }));
    expect(toast.success).toHaveBeenCalledWith("Resep baru berhasil disimpan ke database");
    expect(mockReload).toHaveBeenCalled();
  });

  test("schedules a recipe into the meal planning calendar", async () => {
    createMeal.mockResolvedValue({ id: "meal-scheduled-1" });

    await act(async () => {
      root.render(<Recipes />);
    });

    const scheduleBtn = container.querySelector("[data-testid='schedule-recipe-recipe-custom-1']");
    await act(async () => {
      scheduleBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.querySelector("[data-testid='schedule-meal-dialog']")).toBeTruthy();

    const submitBtn = document.body.querySelector("[data-testid='schedule-submit-btn']");
    await act(async () => {
      submitBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(createMeal).toHaveBeenCalledWith("family-1", expect.objectContaining({
      title: "Soto Betawi Istimewa",
      recipe_id: "recipe-custom-1",
      category: "makanan",
    }));
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("dijadwalkan"));
  });

  test("saves starter recipe to family database with 1 click", async () => {
    createRecipe.mockResolvedValue({ id: "recipe-saved-starter-1" });

    await act(async () => {
      root.render(<Recipes />);
    });

    const saveStarterBtn = container.querySelector("[data-testid='save-starter-starter-1']");
    await act(async () => {
      saveStarterBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(createRecipe).toHaveBeenCalledWith("family-1", expect.objectContaining({
      title: "Ayam Ungkep Bumbu Lengkuas",
      category: "makanan",
    }));
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("berhasil disimpan ke koleksi keluarga"));
  });

  test("deletes a custom recipe with confirmation", async () => {
    window.confirm = jest.fn(() => true);
    deleteResource.mockResolvedValue(true);

    await act(async () => {
      root.render(<Recipes />);
    });

    const deleteBtn = container.querySelector("[data-testid='delete-recipe-recipe-custom-1']");
    await act(async () => {
      deleteBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(deleteResource).toHaveBeenCalledWith("family-1", "recipes", "recipe-custom-1");
    expect(toast.success).toHaveBeenCalledWith("Resep dihapus dari koleksi keluarga");
    expect(mockReload).toHaveBeenCalled();
  });
});
