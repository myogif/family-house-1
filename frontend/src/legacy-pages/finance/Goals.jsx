"use client";

import { useState, useMemo } from "react";
import { useFamily } from "@/context/FamilyContext";
import { useResource } from "@/hooks/useResource";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatIDR, formatDate } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import {
  createGoal,
  updateGoal,
  allocateToGoal,
  withdrawFromGoal,
  deleteResource,
} from "@/lib/data/resources";
import { toast } from "sonner";
import {
  Plus,
  Target,
  PiggyBank,
  ArrowDownLeft,
  ArrowUpRight,
  Pencil,
  Trash2,
  Trophy,
  Calendar,
  Sparkles,
  Wallet,
  ShieldCheck,
} from "lucide-react";

export default function Goals() {
  const { activeId, activeFamily } = useFamily();
  const { data: goals, reload: reloadGoals } = useResource(
    activeId ? `/families/${activeId}/goals` : null,
    [activeId]
  );
  const { data: wallets, reload: reloadWallets } = useResource(
    activeId ? `/families/${activeId}/wallets` : null,
    [activeId]
  );

  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openSave, setOpenSave] = useState(false);
  const [openWithdraw, setOpenWithdraw] = useState(false);

  const [selectedGoal, setSelectedGoal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forms
  const [form, setForm] = useState({
    name: "",
    target_amount: "",
    current_amount: "0",
    target_date: "",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    target_amount: "",
    current_amount: "",
    target_date: "",
  });

  const [saveForm, setSaveForm] = useState({
    walletId: "",
    amount: "",
    notes: "",
  });

  const [withdrawForm, setWithdrawForm] = useState({
    walletId: "",
    amount: "",
    notes: "",
  });

  const canManage = ["husband", "wife"].includes(activeFamily?.my_role);
  const goalList = goals || [];
  const walletList = wallets || [];

  const reloadAll = () => {
    reloadGoals();
    reloadWallets();
  };

  // KPIs
  const stats = useMemo(() => {
    const totalTarget = goalList.reduce((acc, g) => acc + Number(g.target_amount || 0), 0);
    const totalSaved = goalList.reduce((acc, g) => acc + Number(g.current_amount || 0), 0);
    const remaining = Math.max(0, totalTarget - totalSaved);
    const completedCount = goalList.filter(
      (g) => Number(g.current_amount || 0) >= Number(g.target_amount || 0)
    ).length;
    const progress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

    return { totalTarget, totalSaved, remaining, completedCount, progress };
  }, [goalList]);

  // Create Goal
  const handleAddSubmit = async () => {
    if (!form.name || !form.target_amount || Number(form.target_amount) <= 0) {
      return toast.error("Masukkan nama dan target nominal yang valid");
    }
    setIsSubmitting(true);
    try {
      await createGoal(activeId, {
        name: form.name,
        target_amount: Number(form.target_amount),
        current_amount: Number(form.current_amount || 0),
        target_date: form.target_date || null,
      });
      toast.success("Target tabungan berhasil dibuat");
      setOpenAdd(false);
      setForm({ name: "", target_amount: "", current_amount: "0", target_date: "" });
      reloadAll();
    } catch (e) {
      toast.error(errorMessage(e, "Gagal membuat target tabungan"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit
  const handleOpenEdit = (goal) => {
    setSelectedGoal(goal);
    setEditForm({
      name: goal.name,
      target_amount: String(goal.target_amount),
      current_amount: String(goal.current_amount || 0),
      target_date: goal.target_date ? goal.target_date.slice(0, 10) : "",
    });
    setOpenEdit(true);
  };

  // Edit Goal
  const handleEditSubmit = async () => {
    if (!editForm.name || !editForm.target_amount || Number(editForm.target_amount) <= 0) {
      return toast.error("Masukkan nama dan target nominal yang valid");
    }
    setIsSubmitting(true);
    try {
      await updateGoal(activeId, selectedGoal.id, {
        name: editForm.name,
        target_amount: Number(editForm.target_amount),
        current_amount: Number(editForm.current_amount || 0),
        target_date: editForm.target_date || null,
      });
      toast.success("Target tabungan berhasil diperbarui");
      setOpenEdit(false);
      setSelectedGoal(null);
      reloadAll();
    } catch (e) {
      toast.error(errorMessage(e, "Gagal memperbarui target tabungan"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Save / Top-up
  const handleOpenSave = (goal) => {
    setSelectedGoal(goal);
    setSaveForm({
      walletId: walletList[0]?.id || "",
      amount: "",
      notes: `Alokasi tabungan untuk ${goal.name}`,
    });
    setOpenSave(true);
  };

  // Execute Save / Top-up (SSOT: deduct wallet, increase goal, create transaction)
  const handleSaveSubmit = async () => {
    if (!saveForm.walletId) return toast.error("Pilih dompet sumber");
    if (!saveForm.amount || Number(saveForm.amount) <= 0) {
      return toast.error("Masukkan nominal tabungan yang valid");
    }
    setIsSubmitting(true);
    try {
      await allocateToGoal(activeId, selectedGoal.id, {
        walletId: saveForm.walletId,
        amount: Number(saveForm.amount),
        notes: saveForm.notes,
      });
      toast.success(`Berhasil menabung ${formatIDR(Number(saveForm.amount))} ke ${selectedGoal.name}`);
      setOpenSave(false);
      setSelectedGoal(null);
      reloadAll();
    } catch (e) {
      toast.error(errorMessage(e, "Gagal menabung ke target"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Withdraw
  const handleOpenWithdraw = (goal) => {
    setSelectedGoal(goal);
    setWithdrawForm({
      walletId: walletList[0]?.id || "",
      amount: "",
      notes: `Pencairan dana dari target ${goal.name}`,
    });
    setOpenWithdraw(true);
  };

  // Execute Withdraw (SSOT: increase wallet, decrease goal, create transaction)
  const handleWithdrawSubmit = async () => {
    if (!withdrawForm.walletId) return toast.error("Pilih dompet tujuan");
    if (!withdrawForm.amount || Number(withdrawForm.amount) <= 0) {
      return toast.error("Masukkan nominal penarikan yang valid");
    }
    setIsSubmitting(true);
    try {
      await withdrawFromGoal(activeId, selectedGoal.id, {
        walletId: withdrawForm.walletId,
        amount: Number(withdrawForm.amount),
        notes: withdrawForm.notes,
      });
      toast.success(`Berhasil mencairkan ${formatIDR(Number(withdrawForm.amount))} ke dompet`);
      setOpenWithdraw(false);
      setSelectedGoal(null);
      reloadAll();
    } catch (e) {
      toast.error(errorMessage(e, "Gagal mencairkan dana target"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Goal
  const handleDelete = async (goal) => {
    if (!confirm(`Hapus target tabungan "${goal.name}"?`)) return;
    try {
      await deleteResource(activeId, "goals", goal.id);
      toast.success("Target tabungan dihapus");
      reloadAll();
    } catch (e) {
      toast.error(errorMessage(e, "Gagal menghapus target tabungan"));
    }
  };

  // Helper: selected wallet in save form
  const activeSaveWallet = walletList.find((w) => w.id === saveForm.walletId);
  const activeWithdrawWallet = walletList.find((w) => w.id === withdrawForm.walletId);

  return (
    <div className="space-y-6" data-testid="goals-page">
      <PageHeader
        title="Target Tabungan (Celengan)"
        description="Kumpulkan dana untuk impian bersama keluarga, terintegrasi langsung dengan saldo dompet (SSOT)."
      >
        {canManage && (
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button data-testid="add-goal-button" className="shadow-sm">
                <Plus className="mr-2 h-4 w-4" />
                Target Tabungan Baru
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="add-goal-dialog">
              <DialogHeader>
                <DialogTitle>Buat Target Tabungan Baru</DialogTitle>
                <DialogDescription>
                  Tetapkan target impian keluarga seperti liburan, dana darurat, atau renovasi.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Nama Target / Impian</Label>
                  <Input
                    data-testid="goal-name-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Contoh: Dana Liburan ke Bali"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Target Nominal (Rp)</Label>
                    <Input
                      data-testid="goal-target-input"
                      type="number"
                      value={form.target_amount}
                      onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
                      placeholder="15000000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Saldo Awal (Opsional)</Label>
                    <Input
                      data-testid="goal-current-input"
                      type="number"
                      value={form.current_amount}
                      onChange={(e) => setForm({ ...form, current_amount: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Target Tanggal Pencapaian</Label>
                  <Input
                    data-testid="goal-date-input"
                    type="date"
                    value={form.target_date}
                    onChange={(e) => setForm({ ...form, target_date: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenAdd(false)}>
                  Batal
                </Button>
                <Button
                  data-testid="goal-submit-button"
                  onClick={handleAddSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Target"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      {/* KPI Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Target</span>
              <Target className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2 text-xl font-bold">{formatIDR(stats.totalTarget)}</div>
            <p className="mt-1 text-xs text-muted-foreground">{goalList.length} tujuan terencana</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Terkumpul Saat Ini</span>
              <PiggyBank className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatIDR(stats.totalSaved)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{stats.progress}% total progres</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Sisa Kebutuhan</span>
              <ShieldCheck className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 text-xl font-bold text-amber-600 dark:text-amber-400">
              {formatIDR(stats.remaining)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Dana yang masih harus ditabung</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Target Tercapai</span>
              <Trophy className="h-4 w-4 text-purple-500" />
            </div>
            <div className="mt-2 text-xl font-bold text-purple-600 dark:text-purple-400">
              {stats.completedCount} / {goalList.length} Goal
            </div>
            <p className="mt-1 text-xs text-muted-foreground">100% lunas & terkumpul</p>
          </CardContent>
        </Card>
      </div>

      {/* Goal Cards List */}
      {goalList.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Belum ada target tabungan"
          description="Rencanakan masa depan dan tujuan keluarga bersama dengan membuat celengan target tabungan."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goalList.map((g) => {
            const target = Number(g.target_amount || 0);
            const current = Number(g.current_amount || 0);
            const remaining = Math.max(0, target - current);
            const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
            const isCompleted = current >= target;

            return (
              <Card
                key={g.id}
                data-testid={`goal-card-${g.id}`}
                className={`transition-all hover:shadow-md ${
                  isCompleted ? "border-emerald-500/40 bg-emerald-500/5" : ""
                }`}
              >
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold text-base">{g.name}</h3>
                        {isCompleted && <Sparkles className="h-4 w-4 text-amber-500" />}
                      </div>
                      {g.target_date && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Calendar className="h-3 w-3" />
                          <span>Target: {formatDate(g.target_date)}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      {isCompleted ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1">
                          <Trophy className="h-3 w-3" />
                          Tercapai 100%
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="font-bold">
                          {pct}%
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Terkumpul: {formatIDR(current)}</span>
                      <span>Target: {formatIDR(target)}</span>
                    </div>
                    <Progress
                      value={pct}
                      className={`h-2.5 ${isCompleted ? "[&>div]:bg-emerald-500" : "[&>div]:bg-primary"}`}
                    />
                    <div className="text-right text-xs">
                      {!isCompleted ? (
                        <span className="text-muted-foreground">
                          Kurang <strong className="text-foreground">{formatIDR(remaining)}</strong> lagi
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Target telah terpenuhi! 🎉
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons: Nabung & Tarik Dana */}
                  <div className="pt-2 border-t flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-1">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-8 text-xs flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleOpenSave(g)}
                      >
                        <ArrowDownLeft className="mr-1 h-3.5 w-3.5" />
                        Nabung
                      </Button>

                      {current > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs flex-1"
                          onClick={() => handleOpenWithdraw(g)}
                        >
                          <ArrowUpRight className="mr-1 h-3.5 w-3.5" />
                          Tarik Dana
                        </Button>
                      )}
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenEdit(g)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(g)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Nabung / Top-Up Dialog */}
      {selectedGoal && (
        <Dialog open={openSave} onOpenChange={setOpenSave}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-emerald-600" />
                Nabung ke: {selectedGoal.name}
              </DialogTitle>
              <DialogDescription>
                Pilih dompet sumber dana. Saldo dompet akan terpotong otomatis dan masuk ke celengan target.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Pilih Dompet Sumber</Label>
                <Select
                  value={saveForm.walletId}
                  onValueChange={(v) => setSaveForm({ ...saveForm, walletId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih dompet" />
                  </SelectTrigger>
                  <SelectContent>
                    {walletList.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name} (Saldo: {formatIDR(w.current_balance || 0)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {activeSaveWallet && (
                  <p className="text-xs text-muted-foreground">
                    Saldo tersedia: <strong>{formatIDR(activeSaveWallet.current_balance || 0)}</strong>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Nominal Tabungan (Rp)</Label>
                <Input
                  type="number"
                  value={saveForm.amount}
                  onChange={(e) => setSaveForm({ ...saveForm, amount: e.target.value })}
                  placeholder="Contoh: 500000"
                />
              </div>

              <div className="space-y-2">
                <Label>Catatan (Opsional)</Label>
                <Input
                  value={saveForm.notes}
                  onChange={(e) => setSaveForm({ ...saveForm, notes: e.target.value })}
                  placeholder="Catatan alokasi dana..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenSave(false)}>
                Batal
              </Button>
              <Button
                onClick={handleSaveSubmit}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSubmitting ? "Memproses..." : "Konfirmasi Nabung"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Tarik Dana Dialog */}
      {selectedGoal && (
        <Dialog open={openWithdraw} onOpenChange={setOpenWithdraw}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5 text-blue-600" />
                Tarik Dana: {selectedGoal.name}
              </DialogTitle>
              <DialogDescription>
                Pindahkan dana yang terkumpul dari target kembali ke saldo dompet pilihan Anda.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Pilih Dompet Tujuan</Label>
                <Select
                  value={withdrawForm.walletId}
                  onValueChange={(v) => setWithdrawForm({ ...withdrawForm, walletId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih dompet tujuan" />
                  </SelectTrigger>
                  <SelectContent>
                    {walletList.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name} (Saldo saat ini: {formatIDR(w.current_balance || 0)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Nominal Penarikan (Rp)</Label>
                  <span className="text-xs text-muted-foreground">
                    Maks: {formatIDR(selectedGoal.current_amount || 0)}
                  </span>
                </div>
                <Input
                  type="number"
                  value={withdrawForm.amount}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                  placeholder="Contoh: 1000000"
                />
              </div>

              <div className="space-y-2">
                <Label>Catatan (Opsional)</Label>
                <Input
                  value={withdrawForm.notes}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, notes: e.target.value })}
                  placeholder="Pencairan target tabungan..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenWithdraw(false)}>
                Batal
              </Button>
              <Button onClick={handleWithdrawSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Memproses..." : "Konfirmasi Penarikan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Goal Dialog */}
      {selectedGoal && (
        <Dialog open={openEdit} onOpenChange={setOpenEdit}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ubah Target Tabungan</DialogTitle>
              <DialogDescription>Perbarui nama, target nominal, atau target tanggal.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Nama Target</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Target Nominal (Rp)</Label>
                  <Input
                    type="number"
                    value={editForm.target_amount}
                    onChange={(e) => setEditForm({ ...editForm, target_amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Terkumpul (Rp)</Label>
                  <Input
                    type="number"
                    value={editForm.current_amount}
                    onChange={(e) => setEditForm({ ...editForm, current_amount: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Target Tanggal</Label>
                <Input
                  type="date"
                  value={editForm.target_date}
                  onChange={(e) => setEditForm({ ...editForm, target_date: e.target.value })}
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
