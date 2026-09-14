import { STARTER_RECIPES, getStarterRecipesByCategory } from "./starter-recipes";

describe("starter recipes", () => {
  it("contains starter recipes for all 3 categories: makanan, cemilan, minuman", () => {
    expect(STARTER_RECIPES.length).toBeGreaterThanOrEqual(6);

    const categories = new Set(STARTER_RECIPES.map((r) => r.category));
    expect(categories.has("makanan")).toBe(true);
    expect(categories.has("cemilan")).toBe(true);
    expect(categories.has("minuman")).toBe(true);
  });

  it("ensures each starter recipe has valid structure", () => {
    STARTER_RECIPES.forEach((recipe) => {
      expect(typeof recipe.id).toBe("string");
      expect(typeof recipe.title).toBe("string");
      expect(recipe.title.length).toBeGreaterThan(0);
      expect(["makanan", "cemilan", "minuman"]).toContain(recipe.category);
      expect(typeof recipe.servings).toBe("number");
      expect(recipe.servings).toBeGreaterThan(0);
      expect(typeof recipe.prep_time).toBe("number");
      expect(recipe.prep_time).toBeGreaterThanOrEqual(0);
      expect(typeof recipe.cook_time).toBe("number");
      expect(recipe.cook_time).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(recipe.ingredients)).toBe(true);
      expect(recipe.ingredients.length).toBeGreaterThan(0);
      expect(typeof recipe.instructions).toBe("string");
    });
  });

  it("filters recipes by category properly", () => {
    const makanan = getStarterRecipesByCategory("makanan");
    expect(makanan.every((r) => r.category === "makanan")).toBe(true);

    const cemilan = getStarterRecipesByCategory("cemilan");
    expect(cemilan.every((r) => r.category === "cemilan")).toBe(true);

    const minuman = getStarterRecipesByCategory("minuman");
    expect(minuman.every((r) => r.category === "minuman")).toBe(true);

    const all = getStarterRecipesByCategory("all");
    expect(all.length).toBe(STARTER_RECIPES.length);
  });
});
