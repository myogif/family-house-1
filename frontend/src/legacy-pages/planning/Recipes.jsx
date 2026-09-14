"use client";

import { useState, useMemo } from "react";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/context/AuthContext";
import { useResource } from "@/hooks/useResource";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { errorMessage } from "@/lib/errors";
import { STARTER_RECIPES } from "@/lib/data/starter-recipes";
import {
  createRecipe,
  updateRecipe,
  deleteResource,
  createMeal,
  createShoppingItem,
} from "@/lib/data/resources";
import { toast } from "sonner";
import {
  Plus,
  BookOpen,
  ChefHat,
  Search,
  Clock,
  Users,
  ShoppingCart,
  Calendar,
  ExternalLink,
  Edit2,
  Trash2,
  BookmarkPlus,
  X,
  CheckCircle2,
} from "lucide-react";

const CATEGORIES = Object.freeze({
  makanan: { label: "Makanan", emoji: "🍲" },
  cemilan: { label: "Cemilan", emoji: "🍪" },
  minuman: { label: "Minuman", emoji: "🍹" },
});

const MEAL_TYPES = Object.freeze({
  sarapan: { label: "Sarapan", emoji: "🍳" },
  makan_siang: { label: "Makan Siang", emoji: "🍚" },
  makan_malam: { label: "Makan Malam", emoji: "🍲" },
  camilan: { label: "Santai / Camilan", emoji: "🍪" },
});

export default function Recipes() {
  const { activeId, activeFamily } = useFamily();
  const { user } = useAuth();

  const { data: customRecipes, reload: reloadRecipes } = useResource(
    activeId ? `/families/${activeId}/recipes` : null,
    [activeId]
  );

  // Search & Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all"); // 'all', 'custom', 'starter'

  // Detail Viewer Modal
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [servingScale, setServingScale] = useState(4);
  const [checkedIngredients, setCheckedIngredients] = useState({});

  // Create / Edit Modal
  const [openRecipeModal, setOpenRecipeModal] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState(null);
  const [recipeForm, setRecipeForm] = useState({
    title: "",
    category: "makanan",
    meal_type: "makan_siang",
    servings: 4,
    prep_time: 15,
    cook_time: 20,
    instructions: "",
    video_url: "",
  });
  const [ingredientsList, setIngredientsList] = useState([]);
  const [ingredientInput, setIngredientInput] = useState("");

  // Quick Schedule to Meal Plan Modal
  const [openScheduleModal, setOpenScheduleModal] = useState(false);
  const [schedulingRecipe, setSchedulingRecipe] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    meal_type: "makan_siang",
    notes: "",
  });

  const savedRecipesList = customRecipes || [];

  const combinedRecipes = useMemo(() => {
    const customWithFlag = savedRecipesList.map((r) => ({
      ...r,
      isStarter: false,
      servings: r.servings || 4,
      prep_time: r.prep_time || 0,
      cook_time: r.cook_time || 0,
    }));
    const startersWithFlag = STARTER_RECIPES.map((r) => ({
      ...r,
      isStarter: true,
      servings: r.servings || 4,
      prep_time: r.prep_time || 0,
      cook_time: r.cook_time || 0,
    }));
    return [...customWithFlag, ...startersWithFlag];
  }, [savedRecipesList]);

  const filteredRecipes = useMemo(() => {
    return combinedRecipes.filter((r) => {
      const matchCat = categoryFilter === "all" || r.category === categoryFilter;
      const matchSource =
        sourceFilter === "all"
          ? true
          : sourceFilter === "custom"
          ? !r.isStarter
          : r.isStarter;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        r.title.toLowerCase().includes(q) ||
        (r.ingredients?.some((ing) => ing.toLowerCase().includes(q)) ?? false);
      return matchCat && matchSource && matchSearch;
    });
  }, [combinedRecipes, categoryFilter, sourceFilter, search]);

  const openCreateModal = () => {
    setEditingRecipeId(null);
    setRecipeForm({
      title: "",
      category: "makanan",
      meal_type: "makan_siang",
      servings: 4,
      prep_time: 15,
      cook_time: 20,
      instructions: "",
      video_url: "",
    });
    setIngredientsList([]);
    setIngredientInput("");
    setOpenRecipeModal(true);
  };

  const openEditModal = (recipe) => {
    setEditingRecipeId(recipe.id);
    setRecipeForm({
      title: recipe.title,
      category: recipe.category || "makanan",
      meal_type: recipe.meal_type || "makan_siang",
      servings: recipe.servings || 4,
      prep_time: recipe.prep_time || 0,
      cook_time: recipe.cook_time || 0,
      instructions: recipe.instructions || "",
      video_url: recipe.video_url || "",
    });
    setIngredientsList([...(recipe.ingredients || [])]);
    setIngredientInput("");
    setOpenRecipeModal(true);
  };

  const handleAddIngredient = () => {
    const val = ingredientInput.trim();
    if (val) {
      setIngredientsList([...ingredientsList, val]);
      setIngredientInput("");
    }
  };

  const handleRemoveIngredient = (index) => {
    setIngredientsList(ingredientsList.filter((_, idx) => idx !== index));
  };

  const submitRecipeForm = async () => {
    if (!recipeForm.title.trim()) return toast.error("Nama resep wajib diisi");
    try {
      const payload = {
        title: recipeForm.title.trim(),
        category: recipeForm.category,
        meal_type: recipeForm.meal_type,
        servings: Number(recipeForm.servings) || 4,
        prep_time: Number(recipeForm.prep_time) || 0,
        cook_time: Number(recipeForm.cook_time) || 0,
        ingredients: ingredientsList,
        instructions: recipeForm.instructions,
        video_url: recipeForm.video_url,
      };

      if (editingRecipeId) {
        await updateRecipe(activeId, editingRecipeId, payload);
        toast.success("Resep berhasil diperbarui");
      } else {
        await createRecipe(activeId, payload);
        toast.success("Resep baru berhasil disimpan ke database");
      }
      setOpenRecipeModal(false);
      reloadRecipes();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const saveStarterToFamily = async (starterRecipe) => {
    try {
      await createRecipe(activeId, {
        title: starterRecipe.title,
        category: starterRecipe.category || "makanan",
        meal_type: starterRecipe.meal_type || "makan_siang",
        servings: starterRecipe.servings || 4,
        prep_time: starterRecipe.prep_time || 0,
        cook_time: starterRecipe.cook_time || 0,
        ingredients: starterRecipe.ingredients || [],
        instructions: starterRecipe.instructions || "",
        video_url: starterRecipe.video_url || "",
      });
      toast.success(`Resep "${starterRecipe.title}" berhasil disimpan ke koleksi keluarga!`);
      reloadRecipes();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const handleDeleteRecipe = async (recipe) => {
    if (!confirm(`Hapus resep "${recipe.title}"?`)) return;
    try {
      await deleteResource(activeId, "recipes", recipe.id);
      reloadRecipes();
      if (selectedRecipe?.id === recipe.id) setSelectedRecipe(null);
      toast.success("Resep dihapus dari koleksi keluarga");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const openRecipeDetail = (recipe) => {
    setSelectedRecipe(recipe);
    setServingScale(recipe.servings || 4);
    setCheckedIngredients({});
  };

  const toggleCheckIngredient = (index) => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const sendIngredientsToShopping = async (ingredients) => {
    if (!ingredients?.length) {
      return toast.error("Tidak ada bahan untuk ditambahkan ke daftar belanja");
    }
    try {
      await Promise.all(
        ingredients.map((name) =>
          createShoppingItem(activeId, {
            name,
            quantity: 1,
            category: "Bahan Masak",
          })
        )
      );
      toast.success(`${ingredients.length} bahan ditambahkan ke Daftar Belanja`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const openScheduleModalForRecipe = (recipe) => {
    setSchedulingRecipe(recipe);
    setScheduleForm({
      date: new Date().toISOString().slice(0, 10),
      meal_type: recipe.meal_type || "makan_siang",
      notes: recipe.instructions ? `Resep: ${recipe.title}` : "",
    });
    setOpenScheduleModal(true);
  };

  const submitScheduleMeal = async () => {
    if (!schedulingRecipe) return;
    try {
      await createMeal(activeId, {
        title: schedulingRecipe.title,
        category: schedulingRecipe.category || "makanan",
        meal_type: scheduleForm.meal_type,
        date: scheduleForm.date,
        ingredients: schedulingRecipe.ingredients || [],
        notes: scheduleForm.notes || schedulingRecipe.instructions || "",
        video_url: schedulingRecipe.video_url || "",
        recipe_id: schedulingRecipe.isStarter ? null : schedulingRecipe.id,
      });
      toast.success(`"${schedulingRecipe.title}" dijadwalkan ke Perencanaan Menu!`);
      setOpenScheduleModal(false);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const canEditRecipe = (r) =>
    !r.isStarter && (r.user_id === user?.id || ["husband", "wife"].includes(activeFamily?.my_role));

  return (
    <div className="space-y-6" data-testid="recipes-page">
      <PageHeader
        title="Buku Resep Keluarga"
        description="Koleksi master resep masakan, minuman, dan camilan keluarga yang tersimpan aman di database."
      >
        <Button data-testid="add-recipe-button" onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Resep
        </Button>
      </PageHeader>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant={categoryFilter === "all" ? "default" : "outline"}
            onClick={() => setCategoryFilter("all")}
            data-testid="filter-cat-all"
          >
            Semua Kategori ({combinedRecipes.length})
          </Button>
          {Object.entries(CATEGORIES).map(([key, item]) => {
            const count = combinedRecipes.filter((r) => r.category === key).length;
            return (
              <Button
                key={key}
                size="sm"
                variant={categoryFilter === key ? "default" : "outline"}
                onClick={() => setCategoryFilter(key)}
                data-testid={`filter-cat-${key}`}
              >
                {item.emoji} {item.label} ({count})
              </Button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[180px]" data-testid="filter-source">
              <SelectValue placeholder="Sumber Resep" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Koleksi ({combinedRecipes.length})</SelectItem>
              <SelectItem value="custom">Resep Keluarga ({savedRecipesList.length})</SelectItem>
              <SelectItem value="starter">Inspirasi Bawaan ({STARTER_RECIPES.length})</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari resep atau bahan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="search-recipe-input"
            />
          </div>
        </div>
      </div>

      {/* Recipe Catalog Grid */}
      {filteredRecipes.length === 0 ? (
        <EmptyState
          icon={ChefHat}
          title="Tidak ada resep ditemukan"
          description={
            search || categoryFilter !== "all"
              ? "Coba ubah kata kunci pencarian atau filter kategori Anda."
              : "Belum ada resep yang disimpan. Mulai buat resep pertama untuk keluarga Anda!"
          }
          actionLabel="+ Tambah Resep Baru"
          onAction={openCreateModal}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="recipes-grid">
          {filteredRecipes.map((r) => {
            const cat = CATEGORIES[r.category] || CATEGORIES.makanan;
            const mealType = MEAL_TYPES[r.meal_type] || MEAL_TYPES.makan_siang;
            const isCustom = !r.isStarter;

            return (
              <Card
                key={r.id}
                className="flex flex-col justify-between transition-all hover:border-primary/50 hover:shadow-sm"
                data-testid={`recipe-card-${r.id}`}
              >
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="text-xs">
                          {cat.emoji} {cat.label}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {mealType.emoji} {mealType.label}
                        </Badge>
                        {isCustom ? (
                          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                            Keluarga
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-xs">
                            Inspirasi
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-base leading-snug pt-1">{r.title}</h3>
                    </div>
                  </div>

                  {/* Badges Info */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      <span>{r.servings || 4} porsi</span>
                    </div>
                    {r.prep_time > 0 && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Prep {r.prep_time}m</span>
                      </div>
                    )}
                    {r.cook_time > 0 && (
                      <div className="flex items-center gap-1">
                        <ChefHat className="h-3.5 w-3.5" />
                        <span>Masak {r.cook_time}m</span>
                      </div>
                    )}
                  </div>

                  {/* Ingredients Preview */}
                  {r.ingredients?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Bahan Utama:</p>
                      <div className="flex flex-wrap gap-1">
                        {r.ingredients.slice(0, 3).map((ing, idx) => (
                          <span
                            key={idx}
                            className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {ing}
                          </span>
                        ))}
                        {r.ingredients.length > 3 && (
                          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            +{r.ingredients.length - 3} lainnya
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openRecipeDetail(r)}
                        data-testid={`view-recipe-${r.id}`}
                      >
                        <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                        Lihat Resep
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openScheduleModalForRecipe(r)}
                        title="Rencanakan ke Kalender Menu"
                        data-testid={`schedule-recipe-${r.id}`}
                      >
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-1">
                      {isCustom ? (
                        <>
                          {canEditRecipe(r) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => openEditModal(r)}
                              data-testid={`edit-recipe-${r.id}`}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canEditRecipe(r) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteRecipe(r)}
                              data-testid={`delete-recipe-${r.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-primary"
                          onClick={() => saveStarterToFamily(r)}
                          data-testid={`save-starter-${r.id}`}
                        >
                          <BookmarkPlus className="mr-1 h-3.5 w-3.5" />
                          Simpan
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* RECIPE DETAIL MODAL */}
      <Dialog open={Boolean(selectedRecipe)} onOpenChange={(open) => !open && setSelectedRecipe(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="recipe-detail-dialog">
          {selectedRecipe && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <Badge variant="outline">
                    {CATEGORIES[selectedRecipe.category]?.emoji} {CATEGORIES[selectedRecipe.category]?.label}
                  </Badge>
                  <Badge variant="secondary">
                    {MEAL_TYPES[selectedRecipe.meal_type]?.emoji} {MEAL_TYPES[selectedRecipe.meal_type]?.label}
                  </Badge>
                  {!selectedRecipe.isStarter && (
                    <Badge className="bg-primary/10 text-primary border-primary/20">
                      Resep Keluarga
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-xl font-bold font-display">{selectedRecipe.title}</DialogTitle>
                <DialogDescription>
                  {selectedRecipe.author_name ? `Oleh ${selectedRecipe.author_name}` : "Resep terdaftar di database keluarga"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-2">
                {/* Meta info & Serving Scaler */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3">
                  <div className="flex items-center gap-4 text-sm">
                    {selectedRecipe.prep_time > 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground block">Waktu Persiapan</span>
                        <span className="font-semibold">{selectedRecipe.prep_time} Menit</span>
                      </div>
                    )}
                    {selectedRecipe.cook_time > 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground block">Waktu Memasak</span>
                        <span className="font-semibold">{selectedRecipe.cook_time} Menit</span>
                      </div>
                    )}
                  </div>

                  {/* Serving Scaler */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Porsi:</span>
                    <div className="flex items-center gap-1 bg-background border border-border rounded-md px-2 py-1">
                      <button
                        type="button"
                        onClick={() => setServingScale(Math.max(1, servingScale - 1))}
                        className="px-1 text-sm font-bold text-muted-foreground hover:text-foreground"
                      >
                        -
                      </button>
                      <span className="min-w-[30px] text-center font-bold text-sm">{servingScale}</span>
                      <button
                        type="button"
                        onClick={() => setServingScale(servingScale + 1)}
                        className="px-1 text-sm font-bold text-muted-foreground hover:text-foreground"
                      >
                        +
                      </button>
                      <span className="text-xs text-muted-foreground ml-1">orang</span>
                    </div>
                  </div>
                </div>

                {/* Video Link Button */}
                {selectedRecipe.video_url && (
                  <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                    <span className="font-medium text-primary">Video Tutorial Masak Tersedia</span>
                    <a
                      href={selectedRecipe.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline underline-offset-4 hover:opacity-80"
                    >
                      Buka Video <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {/* Ingredients Checklist */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">
                      Daftar Bahan ({selectedRecipe.ingredients?.length || 0}):
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => sendIngredientsToShopping(selectedRecipe.ingredients || [])}
                      data-testid="send-to-shopping-btn"
                    >
                      <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                      Kirim ke Daftar Belanja
                    </Button>
                  </div>
                  <div className="rounded-lg border border-border divide-y divide-border">
                    {selectedRecipe.ingredients?.map((ing, idx) => (
                      <label
                        key={idx}
                        className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          checked={Boolean(checkedIngredients[idx])}
                          onCheckedChange={() => toggleCheckIngredient(idx)}
                        />
                        <span
                          className={`text-sm ${
                            checkedIngredients[idx] ? "line-through text-muted-foreground" : ""
                          }`}
                        >
                          {ing}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Instructions */}
                {selectedRecipe.instructions && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Langkah & Petunjuk Memasak:</h4>
                    <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm whitespace-pre-wrap leading-relaxed">
                      {selectedRecipe.instructions}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => openScheduleModalForRecipe(selectedRecipe)}
                  data-testid="detail-schedule-button"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Rencanakan Menu ini ke Kalender
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedRecipe(null)}
                  className="w-full sm:w-auto"
                >
                  Tutup
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* CREATE / EDIT RECIPE MODAL */}
      <Dialog open={openRecipeModal} onOpenChange={setOpenRecipeModal}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto" data-testid="recipe-form-dialog">
          <DialogHeader>
            <DialogTitle>
              {editingRecipeId ? "Edit Resep Master" : "Tambah Resep Baru"}
            </DialogTitle>
            <DialogDescription>
              Resep akan disimpan ke database Supabase milik keluarga Anda dan dapat dijadwalkan kapan saja.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nama Resep *</Label>
              <Input
                placeholder="Contoh: Rendang Daging Sapi Spesial"
                value={recipeForm.title}
                onChange={(e) => setRecipeForm({ ...recipeForm, title: e.target.value })}
                data-testid="recipe-form-title"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <Select
                  value={recipeForm.category}
                  onValueChange={(val) => setRecipeForm({ ...recipeForm, category: val })}
                >
                  <SelectTrigger data-testid="recipe-form-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIES).map(([key, item]) => (
                      <SelectItem key={key} value={key}>
                        {item.emoji} {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Waktu Makan Rekomendasi</Label>
                <Select
                  value={recipeForm.meal_type}
                  onValueChange={(val) => setRecipeForm({ ...recipeForm, meal_type: val })}
                >
                  <SelectTrigger data-testid="recipe-form-meal-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MEAL_TYPES).map(([key, item]) => (
                      <SelectItem key={key} value={key}>
                        {item.emoji} {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Porsi (Orang)</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={recipeForm.servings}
                  onChange={(e) => setRecipeForm({ ...recipeForm, servings: e.target.value })}
                  data-testid="recipe-form-servings"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Persiapan (Mnt)</Label>
                <Input
                  type="number"
                  min="0"
                  max="1440"
                  value={recipeForm.prep_time}
                  onChange={(e) => setRecipeForm({ ...recipeForm, prep_time: e.target.value })}
                  data-testid="recipe-form-prep-time"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Masak (Mnt)</Label>
                <Input
                  type="number"
                  min="0"
                  max="1440"
                  value={recipeForm.cook_time}
                  onChange={(e) => setRecipeForm({ ...recipeForm, cook_time: e.target.value })}
                  data-testid="recipe-form-cook-time"
                />
              </div>
            </div>

            {/* Ingredients builder */}
            <div className="space-y-2">
              <Label>Bahan-Bahan ({ingredientsList.length})</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Contoh: 500 gram Daging Sapi"
                  value={ingredientInput}
                  onChange={(e) => setIngredientInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddIngredient();
                    }
                  }}
                  data-testid="recipe-form-ing-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddIngredient}
                  data-testid="recipe-form-add-ing-btn"
                >
                  + Tambah
                </Button>
              </div>

              {ingredientsList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 rounded-lg border border-border p-2.5 max-h-32 overflow-y-auto">
                  {ingredientsList.map((ing, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs"
                    >
                      {ing}
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(idx)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="space-y-1.5">
              <Label>Langkah & Petunjuk Pembuatan</Label>
              <Textarea
                placeholder="Tuliskan langkah-langkah memasak secara terperinci..."
                rows={4}
                value={recipeForm.instructions}
                onChange={(e) => setRecipeForm({ ...recipeForm, instructions: e.target.value })}
                data-testid="recipe-form-instructions"
              />
            </div>

            {/* Video URL */}
            <div className="space-y-1.5">
              <Label>Link Video Masak (YouTube / TikTok)</Label>
              <Input
                placeholder="https://www.youtube.com/watch?v=..."
                value={recipeForm.video_url}
                onChange={(e) => setRecipeForm({ ...recipeForm, video_url: e.target.value })}
                data-testid="recipe-form-video-url"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenRecipeModal(false)}>
              Batal
            </Button>
            <Button onClick={submitRecipeForm} data-testid="recipe-form-submit">
              {editingRecipeId ? "Simpan Perubahan" : "Simpan Resep"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QUICK SCHEDULE TO MEAL PLAN MODAL */}
      <Dialog open={openScheduleModal} onOpenChange={setOpenScheduleModal}>
        <DialogContent className="max-w-md" data-testid="schedule-meal-dialog">
          <DialogHeader>
            <DialogTitle>Rencanakan Menu ke Kalender</DialogTitle>
            <DialogDescription>
              Jadwalkan &quot;{schedulingRecipe?.title}&quot; ke kalender perencanaan menu mingguan keluarga.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Tanggal Makan</Label>
              <Input
                type="date"
                value={scheduleForm.date}
                onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                data-testid="schedule-date-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Waktu Makan</Label>
              <Select
                value={scheduleForm.meal_type}
                onValueChange={(val) => setScheduleForm({ ...scheduleForm, meal_type: val })}
              >
                <SelectTrigger data-testid="schedule-meal-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MEAL_TYPES).map(([key, item]) => (
                    <SelectItem key={key} value={key}>
                      {item.emoji} {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Catatan Tambahan (Opsional)</Label>
              <Input
                placeholder="Misal: Siapkan bumbu malam sebelumnya"
                value={scheduleForm.notes}
                onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                data-testid="schedule-notes-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenScheduleModal(false)}>
              Batal
            </Button>
            <Button onClick={submitScheduleMeal} data-testid="schedule-submit-btn">
              Jadwalkan Menu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
