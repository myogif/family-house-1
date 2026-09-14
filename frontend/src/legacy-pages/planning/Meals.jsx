"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import { STARTER_RECIPES } from "@/lib/data/starter-recipes";
import {
  createMeal,
  createShoppingItem,
  toggleResource,
  deleteResource,
} from "@/lib/data/resources";
import { toast } from "sonner";
import {
  Plus,
  ChefHat,
  Trash2,
  X,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Calendar,
  ExternalLink,
  Sparkles,
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

const DOW = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function startOfWeek(offset) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const dayIdx = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dayIdx + offset * 7);
  return d;
}

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export default function Meals() {
  const { activeId, activeFamily } = useFamily();
  const { user } = useAuth();

  const { data: meals, reload: reloadMeals } = useResource(
    activeId ? `/families/${activeId}/meals` : null,
    [activeId]
  );
  const { data: customRecipes } = useResource(
    activeId ? `/families/${activeId}/recipes` : null,
    [activeId]
  );

  const [view, setView] = useState("week");
  const [weekOffset, setWeekOffset] = useState(0);

  // Meal Scheduling Dialog
  const [openMealDialog, setOpenMealDialog] = useState(false);
  const [entryMode, setEntryMode] = useState("recipe"); // 'recipe' | 'custom'
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [mealForm, setMealForm] = useState({
    title: "",
    category: "makanan",
    meal_type: "makan_siang",
    date: "",
    notes: "",
    video_url: "",
    recipe_id: null,
  });
  const [mealIngredients, setMealIngredients] = useState([]);
  const [mealIngInput, setMealIngInput] = useState("");

  // Quick View Recipe Modal
  const [previewRecipe, setPreviewRecipe] = useState(null);

  const weekStart = startOfWeek(weekOffset);
  const weekDays = useMemo(
    () =>
      [...Array(7)].map((_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d;
      }),
    [weekStart]
  );
  const weekEnd = weekDays[6];

  const list = meals || [];
  const savedRecipesList = customRecipes || [];

  const combinedRecipes = useMemo(() => {
    const customWithFlag = savedRecipesList.map((r) => ({ ...r, isStarter: false }));
    const startersWithFlag = STARTER_RECIPES.map((r) => ({ ...r, isStarter: true }));
    return [...customWithFlag, ...startersWithFlag];
  }, [savedRecipesList]);

  // Meals in currently displayed week
  const weekMeals = useMemo(() => {
    return list.filter((m) => {
      const mealDate = new Date(m.date);
      return mealDate >= weekStart && mealDate <= new Date(weekEnd.getTime() + 86400000 - 1);
    });
  }, [list, weekStart, weekEnd]);

  const openAddMealDialog = (presetDate = null, fromRecipe = null) => {
    const defaultDate = presetDate || new Date().toISOString().slice(0, 10);
    if (fromRecipe) {
      setEntryMode("recipe");
      setSelectedRecipeId(fromRecipe.id);
      setMealForm({
        title: fromRecipe.title,
        category: fromRecipe.category || "makanan",
        meal_type: fromRecipe.meal_type || "makan_siang",
        date: defaultDate,
        notes: fromRecipe.instructions || "",
        video_url: fromRecipe.video_url || "",
        recipe_id: fromRecipe.isStarter ? null : fromRecipe.id,
      });
      setMealIngredients([...(fromRecipe.ingredients || [])]);
    } else {
      setEntryMode("recipe");
      setSelectedRecipeId("");
      setMealForm({
        title: "",
        category: "makanan",
        meal_type: "makan_siang",
        date: defaultDate,
        notes: "",
        video_url: "",
        recipe_id: null,
      });
      setMealIngredients([]);
    }
    setMealIngInput("");
    setOpenMealDialog(true);
  };

  const handleSelectRecipeTemplate = (recipeId) => {
    setSelectedRecipeId(recipeId);
    const selected = combinedRecipes.find((r) => r.id === recipeId);
    if (!selected) return;
    setMealForm((prev) => ({
      ...prev,
      title: selected.title,
      category: selected.category || "makanan",
      meal_type: selected.meal_type || "makan_siang",
      notes: selected.instructions || "",
      video_url: selected.video_url || "",
      recipe_id: selected.isStarter ? null : selected.id,
    }));
    setMealIngredients([...(selected.ingredients || [])]);
  };

  const addMealIngredient = () => {
    const v = mealIngInput.trim();
    if (v) {
      setMealIngredients([...mealIngredients, v]);
      setMealIngInput("");
    }
  };

  const removeMealIngredient = (idx) => {
    setMealIngredients(mealIngredients.filter((_, i) => i !== idx));
  };

  const submitMeal = async () => {
    if (!mealForm.title.trim()) return toast.error("Nama menu wajib diisi");
    try {
      await createMeal(activeId, {
        title: mealForm.title.trim(),
        category: mealForm.category,
        meal_type: mealForm.meal_type,
        date: mealForm.date || null,
        ingredients: mealIngredients,
        notes: mealForm.notes,
        video_url: mealForm.video_url,
        recipe_id: mealForm.recipe_id || null,
      });

      toast.success("Menu berhasil dijadwalkan");
      setOpenMealDialog(false);
      reloadMeals();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const toggleMeal = async (m) => {
    try {
      await toggleResource(activeId, "meals", m);
      reloadMeals();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const removeMeal = async (m) => {
    try {
      await deleteResource(activeId, "meals", m.id);
      reloadMeals();
      toast.success("Menu dihapus");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const sendIngredientsToShopping = async (ingredientsList) => {
    if (!ingredientsList?.length) {
      return toast.error("Tidak ada bahan untuk ditambahkan");
    }
    try {
      await Promise.all(
        ingredientsList.map((name) =>
          createShoppingItem(activeId, {
            name,
            quantity: 1,
            category: "Bahan Masak",
          })
        )
      );
      toast.success(`${ingredientsList.length} bahan ditambahkan ke daftar belanja`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const sendAllWeekIngredientsToShopping = async () => {
    const allIngredients = Array.from(
      new Set(
        weekMeals.flatMap((m) => m.ingredients || []).filter((ing) => Boolean(ing?.trim()))
      )
    );

    if (allIngredients.length === 0) {
      return toast.error("Tidak ada bahan masakan pada menu minggu ini");
    }

    try {
      await Promise.all(
        allIngredients.map((name) =>
          createShoppingItem(activeId, {
            name,
            quantity: 1,
            category: "Bahan Masak",
          })
        )
      );
      toast.success(`${allIngredients.length} bahan minggu ini diekspor ke Daftar Belanja!`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const handleOpenRecipePreview = (meal) => {
    const recipe = combinedRecipes.find(
      (r) => r.id === meal.recipe_id || r.title.toLowerCase() === meal.title.toLowerCase()
    );
    if (recipe) {
      setPreviewRecipe(recipe);
    } else {
      setPreviewRecipe({
        title: meal.title,
        category: meal.category,
        meal_type: meal.meal_type,
        ingredients: meal.ingredients || [],
        instructions: meal.notes || "Tidak ada catatan resep tambahan.",
        video_url: meal.video_url || "",
      });
    }
  };

  const canDeleteMeal = (m) =>
    m.user_id === user?.id || ["husband", "wife"].includes(activeFamily?.my_role);

  return (
    <div className="space-y-6" data-testid="meals-page">
      <PageHeader
        title="Perencanaan Menu (Meal Planning)"
        description="Rencanakan menu harian keluarga, jadwalkan sarapan, makan siang, dan makan malam secara terorganisir."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/planning/recipes">
            <Button variant="outline" data-testid="goto-recipes-btn">
              <BookOpen className="mr-2 h-4 w-4" />
              Buku Resep ({combinedRecipes.length})
            </Button>
          </Link>
          <Button
            variant="secondary"
            onClick={sendAllWeekIngredientsToShopping}
            data-testid="export-week-shopping-btn"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Kirim Bahan Minggu Ini
          </Button>
          <Button
            data-testid="add-meal-button"
            onClick={() => openAddMealDialog()}
          >
            <Plus className="mr-2 h-4 w-4" />
            Rencana Menu
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={view} onValueChange={setView}>
          <TabsList>
            <TabsTrigger value="week" data-testid="meal-view-week">
              <Calendar className="mr-1.5 h-4 w-4" />
              Kalender Mingguan
            </TabsTrigger>
            <TabsTrigger value="all" data-testid="meal-view-all">
              Semua Menu Terjadwal ({list.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {view === "week" && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setWeekOffset(weekOffset - 1)}
              data-testid="week-prev"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span
              className="min-w-[150px] text-center text-sm font-medium"
              data-testid="week-range"
            >
              {weekDays[0].getDate()} {MONTHS[weekDays[0].getMonth()]} – {weekEnd.getDate()}{" "}
              {MONTHS[weekEnd.getMonth()]}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setWeekOffset(weekOffset + 1)}
              data-testid="week-next"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {weekOffset !== 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWeekOffset(0)}
                data-testid="week-today"
              >
                Minggu Ini
              </Button>
            )}
          </div>
        )}
      </div>

      {view === "week" ? (
        /* WEEKLY CALENDAR VIEW */
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7" data-testid="meal-grid-week">
          {weekDays.map((day, dayIdx) => {
            const dayMeals = list.filter((m) => m.date && sameDay(new Date(m.date), day));
            const isToday = sameDay(day, new Date());
            const dateStr = day.toISOString().slice(0, 10);

            return (
              <div
                key={dayIdx}
                className={`flex flex-col rounded-xl border p-3 min-h-[220px] transition-colors ${
                  isToday
                    ? "border-primary/50 bg-primary/[0.03] shadow-sm"
                    : "border-border bg-card/50"
                }`}
                data-testid={`day-col-${dayIdx}`}
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${
                        isToday ? "text-primary font-extrabold" : "text-muted-foreground"
                      }`}
                    >
                      {DOW[dayIdx]}
                    </span>
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                        isToday
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-primary"
                    onClick={() => openAddMealDialog(dateStr)}
                    data-testid={`add-meal-day-${dayIdx}`}
                    title="Tambah menu hari ini"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="flex-1 space-y-2">
                  {dayMeals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <p className="text-xs text-muted-foreground">Belum ada menu</p>
                      <button
                        type="button"
                        onClick={() => openAddMealDialog(dateStr)}
                        className="mt-1 text-[11px] text-primary hover:underline"
                      >
                        + Rencanakan
                      </button>
                    </div>
                  ) : (
                    dayMeals.map((m) => {
                      const mealType = MEAL_TYPES[m.meal_type] || MEAL_TYPES.makan_siang;
                      const cat = CATEGORIES[m.category] || CATEGORIES.makanan;

                      return (
                        <div
                          key={m.id}
                          className={`group relative rounded-lg border p-2.5 text-xs transition-all ${
                            m.done
                              ? "border-border/60 bg-muted/30 opacity-70"
                              : "border-border bg-card hover:border-primary/40 shadow-xs"
                          }`}
                          data-testid={`meal-item-${m.id}`}
                        >
                          <div className="flex items-start gap-2">
                            <Checkbox
                              checked={Boolean(m.done)}
                              onCheckedChange={() => toggleMeal(m)}
                              className="mt-0.5"
                              data-testid={`toggle-meal-${m.id}`}
                            />
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="text-[10px] text-muted-foreground">
                                  {mealType.emoji} {mealType.label}
                                </span>
                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                                  {cat.emoji}
                                </Badge>
                              </div>
                              <p
                                className={`font-medium leading-tight ${
                                  m.done ? "line-through text-muted-foreground" : "text-foreground"
                                }`}
                              >
                                {m.title}
                              </p>

                              {m.ingredients?.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => sendIngredientsToShopping(m.ingredients)}
                                  className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline pt-0.5"
                                  data-testid={`meal-shopping-btn-${m.id}`}
                                >
                                  <ShoppingCart className="h-2.5 w-2.5" />
                                  {m.ingredients.length} bahan
                                </button>
                              )}

                              {(m.notes || m.video_url || m.ingredients?.length > 0) && (
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenRecipePreview(m)}
                                    className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground underline pt-0.5"
                                    data-testid={`preview-meal-recipe-${m.id}`}
                                  >
                                    <BookOpen className="h-2.5 w-2.5" /> Detail Masak
                                  </button>
                                </div>
                              )}
                            </div>

                            {canDeleteMeal(m) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                                onClick={() => removeMeal(m)}
                                data-testid={`delete-meal-${m.id}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ALL SCHEDULED MEALS LIST VIEW */
        <div className="space-y-3" data-testid="all-meals-list">
          {list.length === 0 ? (
            <EmptyState
              icon={ChefHat}
              title="Belum ada rencana menu"
              description="Rencanakan menu harian keluarga untuk makan lebih teratur dan hemat."
              actionLabel="Rencana Menu Baru"
              onAction={() => openAddMealDialog()}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((m) => {
                const mealType = MEAL_TYPES[m.meal_type] || MEAL_TYPES.makan_siang;
                const cat = CATEGORIES[m.category] || CATEGORIES.makanan;

                return (
                  <Card key={m.id} className="relative" data-testid={`all-meal-card-${m.id}`}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={Boolean(m.done)}
                            onCheckedChange={() => toggleMeal(m)}
                            data-testid={`all-toggle-meal-${m.id}`}
                          />
                          <div>
                            <span className="text-xs text-muted-foreground">
                              {mealType.emoji} {mealType.label}
                            </span>
                            <h4
                              className={`font-semibold text-sm ${
                                m.done ? "line-through text-muted-foreground" : ""
                              }`}
                            >
                              {m.title}
                            </h4>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {cat.emoji} {cat.label}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                        <span>{m.date ? formatDate(m.date) : "Tanpa tanggal"}</span>
                        {m.author_name && <span>Oleh {m.author_name}</span>}
                      </div>

                      {m.ingredients?.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {m.ingredients.map((ing, idx) => (
                            <span
                              key={idx}
                              className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                            >
                              {ing}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        {m.ingredients?.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => sendIngredientsToShopping(m.ingredients)}
                          >
                            <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                            Kirim ke Belanja
                          </Button>
                        )}
                        {canDeleteMeal(m) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive ml-auto"
                            onClick={() => removeMeal(m)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* DIALOG ADD MEAL (PILIH DARI RESEP / MENU BEBAS) */}
      <Dialog open={openMealDialog} onOpenChange={setOpenMealDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" data-testid="meal-dialog">
          <DialogHeader>
            <DialogTitle>Rencanakan Menu Makan</DialogTitle>
            <DialogDescription>
              Pilih resep dari buku resep keluarga atau tulis menu bebas harian.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
              <button
                type="button"
                className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                  entryMode === "recipe"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setEntryMode("recipe")}
                data-testid="mode-recipe-btn"
              >
                <BookOpen className="inline-block mr-1 h-3.5 w-3.5" />
                Pilih dari Resep ({combinedRecipes.length})
              </button>
              <button
                type="button"
                className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                  entryMode === "custom"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setEntryMode("custom")}
                data-testid="mode-custom-btn"
              >
                <Plus className="inline-block mr-1 h-3.5 w-3.5" />
                Menu Bebas / Custom
              </button>
            </div>

            {/* Template Selector when in Recipe mode */}
            {entryMode === "recipe" && (
              <div className="space-y-1.5">
                <Label>Pilih Resep</Label>
                <Select value={selectedRecipeId} onValueChange={handleSelectRecipeTemplate}>
                  <SelectTrigger data-testid="recipe-template-select">
                    <SelectValue placeholder="-- Pilih Resep Makanan / Minuman --" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {savedRecipesList.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase">
                          Resep Keluarga
                        </div>
                        {savedRecipesList.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {CATEGORIES[r.category]?.emoji} {r.title}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase">
                      Inspirasi Bawaan
                    </div>
                    {STARTER_RECIPES.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {CATEGORIES[r.category]?.emoji} {r.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Nama Menu *</Label>
              <Input
                placeholder="Contoh: Sate Ayam Madura / Makan di luar"
                value={mealForm.title}
                onChange={(e) => setMealForm({ ...mealForm, title: e.target.value })}
                data-testid="meal-form-title"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Waktu Makan</Label>
                <Select
                  value={mealForm.meal_type}
                  onValueChange={(val) => setMealForm({ ...mealForm, meal_type: val })}
                >
                  <SelectTrigger data-testid="meal-form-type">
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
                <Label>Kategori</Label>
                <Select
                  value={mealForm.category}
                  onValueChange={(val) => setMealForm({ ...mealForm, category: val })}
                >
                  <SelectTrigger data-testid="meal-form-category">
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
            </div>

            <div className="space-y-1.5">
              <Label>Tanggal Jadwal</Label>
              <Input
                type="date"
                value={mealForm.date}
                onChange={(e) => setMealForm({ ...mealForm, date: e.target.value })}
                data-testid="meal-form-date"
              />
            </div>

            {/* Ingredients builder for meal */}
            <div className="space-y-2">
              <Label>Bahan-Bahan ({mealIngredients.length})</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Contoh: 1/2 kg Daging Ayam"
                  value={mealIngInput}
                  onChange={(e) => setMealIngInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addMealIngredient();
                    }
                  }}
                  data-testid="meal-ing-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMealIngredient}
                  data-testid="add-meal-ing-btn"
                >
                  + Tambah
                </Button>
              </div>

              {mealIngredients.length > 0 && (
                <div className="flex flex-wrap gap-1.5 rounded-lg border border-border p-2 max-h-24 overflow-y-auto">
                  {mealIngredients.map((ing, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs"
                    >
                      {ing}
                      <button
                        type="button"
                        onClick={() => removeMealIngredient(idx)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Catatan / Petunjuk Singkat</Label>
              <Textarea
                placeholder="Catatan belanja, persiapan malam sebelumnya, atau info porsi..."
                rows={2}
                value={mealForm.notes}
                onChange={(e) => setMealForm({ ...mealForm, notes: e.target.value })}
                data-testid="meal-form-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenMealDialog(false)}>
              Batal
            </Button>
            <Button onClick={submitMeal} data-testid="submit-meal-btn">
              Simpan Rencana Menu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QUICK PREVIEW RECIPE MODAL */}
      <Dialog open={Boolean(previewRecipe)} onOpenChange={(open) => !open && setPreviewRecipe(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto" data-testid="preview-recipe-dialog">
          {previewRecipe && (
            <>
              <DialogHeader>
                <DialogTitle>{previewRecipe.title}</DialogTitle>
                <DialogDescription>
                  Petunjuk dan bahan persiapan untuk menu yang telah direncanakan.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-sm">
                {previewRecipe.ingredients?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                      Daftar Bahan:
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      {previewRecipe.ingredients.map((ing, idx) => (
                        <li key={idx}>{ing}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {previewRecipe.instructions && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                      Langkah / Catatan:
                    </h4>
                    <p className="rounded-lg bg-muted/40 p-3 text-xs leading-relaxed whitespace-pre-wrap">
                      {previewRecipe.instructions}
                    </p>
                  </div>
                )}

                {previewRecipe.video_url && (
                  <a
                    href={previewRecipe.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline"
                  >
                    Buka Video Tutorial <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setPreviewRecipe(null)}>
                  Tutup
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
