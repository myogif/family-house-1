"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useFamily } from "@/context/FamilyContext";
import { useResource } from "@/hooks/useResource";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatIDR, CATEGORIES } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import { createBudget, updateBudget, deleteResource } from "@/lib/data/resources";
import { toast } from "sonner";
import {
  Plus,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Pencil,
  Trash2,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default function Budget() {
  const { activeId, activeFamily } = useFamily();
  const { data: budgets, reload } = useResource(
    activeId ? `/families/${activeId}/budgets` : null,
    [activeId]
  );

  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);

  const [form, setForm] = useState({ category: "Makanan", limit: "" });
  const [editForm, setEditForm] = useState({ category: "", limit: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage = ["husband", "wife"].includes(activeFamily?.my_role);
  const budgetList = budgets || [];

  // Summary Calculations
  const stats = useMemo(() => {
    const totalLimit = budgetList.reduce((acc, b) => acc + Number(b.limit || 0), 0);
    const totalSpent = budgetList.reduce((acc, b) => acc + Number(b.spent || 0), 0);
    const remaining = Math.max(0, totalLimit - totalSpent);
    const percent = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;
    const overbudgetCount = budgetList.filter((b) => (b.spent || 0) >= (b.limit || 0)).length;
    const warningCount = budgetList.filter(
      (b) => (b.spent || 0) >= (b.limit || 0) * 0.8 && (b.spent || 0) < (b.limit || 0)
    ).length;

    return { totalLimit, totalSpent, remaining, percent, overbudgetCount, warningCount };
  }, [budgetList]);

  const handleAddSubmit = async () => {
    if (!form.limit || Number(form.limit) <= 0) {
      return toast.error("Masukkan batas limit anggaran yang valid");
    }
    setIsSubmitting(true);
    try {
      await createBudget(activeId, {
        category: form.category,
        limit: Number(form.limit),
      });
      toast.success(`Anggaran kategori ${form.category} berhasil disimpan`);
      setOpenAdd(false);
      setForm({ category: "Makanan", limit: "" });
      reload();
    } catch (e) {
      toast.error(errorMessage(e, "Gagal menyimpan anggaran"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (budget) => {
    setEditingBudget(budget);
    setEditForm({
      category: budget.category,
      limit: String(budget.limit),
    });
    setOpenEdit(true);
  };

  const handleEditSubmit = async () => {
    if (!editForm.limit || Number(editForm.limit) <= 0) {
      return toast.error("Masukkan batas limit anggaran yang valid");
    }
    setIsSubmitting(true);
    try {
      await updateBudget(activeId, editingBudget.id, {
        category: editForm.category,
        limit: Number(editForm.limit),
      });
      toast.success("Anggaran berhasil diperbarui");
      setOpenEdit(false);
      setEditingBudget(null);
      reload();
    } catch (e) {
      toast.error(errorMessage(e, "Gagal memperbarui anggaran"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (budget) => {
    if (!confirm(`Hapus anggaran untuk kategori "${budget.category}"?`)) return;
    try {
      await deleteResource(activeId, "budgets", budget.id);
      toast.success("Anggaran dihapus");
      reload();
    } catch (e) {
      toast.error(errorMessage(e, "Gagal menghapus anggaran"));
    }
  };

  // Helper for available categories when creating new budget
  const availableCategories = CATEGORIES.filter(
    (cat) => !budgetList.some((b) => b.category === cat)
  );

  return (
    <div className="space-y-6" data-testid="budget-page">
      <PageHeader
        title="Anggaran Bulanan"
        description="Pantau batas pagu pengeluaran keluarga per kategori secara real-time (SSOT)."
      >
        {canManage && (
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button data-testid="add-budget-button" className="shadow-sm">
                <Plus className="mr-2 h-4 w-4" />
                Atur Anggaran Baru
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="add-budget-dialog">
              <DialogHeader>
                <DialogTitle>Atur Pagu Anggaran Kategori</DialogTitle>
                <DialogDescription>
                  Tentukan batas maksimal pengeluaran bulanan untuk kategori tertentu.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Kategori Pengeluaran</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm({ ...form, category: v })}
                  >
                    <SelectTrigger data-testid="budget-category-select">
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {(availableCategories.length > 0 ? availableCategories : CATEGORIES).map(
                        (c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Batas Maksimal Bulanan (Rp)</Label>
                  <Input
                    data-testid="budget-limit-input"
                    type="number"
                    value={form.limit}
                    onChange={(e) => setForm({ ...form, limit: e.target.value })}
                    placeholder="Contoh: 2500000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Pengeluaran di kategori ini akan otomatis terakumulasi dari transaksi bulan berjalan.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenAdd(false)}>
                  Batal
                </Button>
                <Button
                  data-testid="budget-submit-button"
                  onClick={handleAddSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Anggaran"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      {/* KPI Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Pagu</span>
              <Wallet className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2 text-xl font-bold">{formatIDR(stats.totalLimit)}</div>
            <p className="mt-1 text-xs text-muted-foreground">{budgetList.length} pos anggaran aktif</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Terpakai Bulan Ini</span>
              <TrendingDown className="h-4 w-4 text-rose-500" />
            </div>
            <div className="mt-2 text-xl font-bold text-rose-600 dark:text-rose-400">
              {formatIDR(stats.totalSpent)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{stats.percent}% dari total pagu</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Sisa Anggaran</span>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatIDR(stats.remaining)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Dana aman yang tersisa</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Status Evaluasi</span>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 text-xl font-bold">
              {stats.overbudgetCount > 0 ? (
                <span className="text-destructive">{stats.overbudgetCount} Over</span>
              ) : stats.warningCount > 0 ? (
                <span className="text-amber-600 dark:text-amber-400">{stats.warningCount} Waspada</span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400">Semua Terkendali</span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Monitoring otomatis SSOT</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget List */}
      {budgetList.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Belum ada anggaran bulanan"
          description="Atur batas pagu pengeluaran per kategori agar keuangan keluarga tetap terencana dan terukur."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgetList.map((b) => {
            const spent = Number(b.spent || 0);
            const limit = Number(b.limit || 0);
            const remaining = Math.max(0, limit - spent);
            const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
            const isOver = pct >= 100;
            const isWarn = pct >= 80 && pct < 100;

            return (
              <Card
                key={b.id}
                data-testid={`budget-card-${b.category}`}
                className={`transition-all hover:shadow-md ${
                  isOver
                    ? "border-destructive/40 bg-destructive/5"
                    : isWarn
                    ? "border-amber-500/40 bg-amber-500/5"
                    : ""
                }`}
              >
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base">{b.category}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Bulan Ini</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isOver ? (
                        <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                          <AlertTriangle className="h-3 w-3" />
                          Over {pct}%
                        </Badge>
                      ) : isWarn ? (
                        <Badge
                          variant="outline"
                          className="border-amber-500 text-amber-600 dark:text-amber-400 flex items-center gap-1 text-xs"
                        >
                          <AlertCircle className="h-3 w-3" />
                          Waspada {pct}%
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          Aman {pct}%
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar with Contextual Styling */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Terpakai: {formatIDR(spent)}</span>
                      <span>Pagu: {formatIDR(limit)}</span>
                    </div>
                    <Progress
                      value={Math.min(100, pct)}
                      className={`h-2.5 ${
                        isOver
                          ? "[&>div]:bg-destructive"
                          : isWarn
                          ? "[&>div]:bg-amber-500"
                          : "[&>div]:bg-emerald-500"
                      }`}
                    />
                  </div>

                  {/* Sisa & Aksi */}
                  <div className="flex items-center justify-between pt-2 border-t text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground block">
                        {isOver ? "Kelebihan:" : "Sisa Pagu:"}
                      </span>
                      <span
                        className={`font-semibold ${
                          isOver
                            ? "text-destructive"
                            : isWarn
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {isOver ? formatIDR(spent - limit) : formatIDR(remaining)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Link href={`/finance/transactions?category=${encodeURIComponent(b.category)}`}>
                          Transaksi <ArrowUpRight className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>

                      {canManage && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenEdit(b)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(b)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Budget Dialog */}
      {editingBudget && (
        <Dialog open={openEdit} onOpenChange={setOpenEdit}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ubah Anggaran: {editingBudget.category}</DialogTitle>
              <DialogDescription>
                Sesuaikan batas pagu pengeluaran untuk kategori ini.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Batas Maksimal Bulanan (Rp)</Label>
                <Input
                  type="number"
                  value={editForm.limit}
                  onChange={(e) => setEditForm({ ...editForm, limit: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenEdit(false)}>
                Batal
              </Button>
              <Button onClick={handleEditSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
