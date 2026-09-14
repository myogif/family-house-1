"use client";

import { useState } from "react";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/context/AuthContext";
import { useResource } from "@/hooks/useResource";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatIDR, formatDate } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import { createDebt, payDebt, deleteResource, createTransaction } from "@/lib/data/resources";
import { toast } from "sonner";
import {
  Plus,
  HandCoins,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Trash2,
  CreditCard,
} from "lucide-react";

export default function Debts() {
  const { activeId, activeFamily } = useFamily();
  const { user } = useAuth();

  const { data: debts, reload: reloadDebts } = useResource(
    activeId ? `/families/${activeId}/debts` : null,
    [activeId]
  );
  const { data: wallets } = useResource(
    activeId ? `/families/${activeId}/wallets` : null,
    [activeId]
  );

  const canManage = ["husband", "wife"].includes(activeFamily?.my_role);

  const [tab, setTab] = useState("debt"); // 'debt' (hutang kita) | 'loan' (piutang kita)
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState({
    type: "debt",
    person_name: "",
    total_amount: "",
    paid_amount: "0",
    due_date: "",
    notes: "",
  });

  // Payment modal
  const [payModal, setPayModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payWalletId, setPayWalletId] = useState("");

  const debtList = debts || [];
  const walletList = wallets || [];

  const filteredDebts = debtList.filter((d) => d.type === tab);

  const totalPayable = debtList
    .filter((d) => d.type === "debt" && d.status !== "paid")
    .reduce((s, d) => s + (Number(d.total_amount || 0) - Number(d.paid_amount || 0)), 0);

  const totalReceivable = debtList
    .filter((d) => d.type === "loan" && d.status !== "paid")
    .reduce((s, d) => s + (Number(d.total_amount || 0) - Number(d.paid_amount || 0)), 0);

  const openCreateDialog = (type = "debt") => {
    setForm({
      type,
      person_name: "",
      total_amount: "",
      paid_amount: "0",
      due_date: "",
      notes: "",
    });
    setOpenModal(true);
  };

  const submitDebt = async () => {
    if (!form.person_name.trim()) return toast.error("Nama pihak / peminjam wajib diisi");
    const total = Number(form.total_amount);
    if (isNaN(total) || total <= 0) return toast.error("Nominal hutang/piutang tidak valid");

    try {
      await createDebt(activeId, {
        type: form.type,
        person_name: form.person_name.trim(),
        total_amount: total,
        paid_amount: Number(form.paid_amount || 0),
        due_date: form.due_date || null,
        notes: form.notes.trim(),
      });

      toast.success(
        form.type === "debt" ? "Hutang baru dicatat" : "Piutang baru dicatat"
      );
      setOpenModal(false);
      reloadDebts();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const openPayDialog = (debt) => {
    setSelectedDebt(debt);
    const remaining = Number(debt.total_amount || 0) - Number(debt.paid_amount || 0);
    setPayAmount(String(remaining));
    setPayWalletId(walletList[0]?.id || "");
    setPayModal(true);
  };

  const submitPayment = async () => {
    if (!selectedDebt) return;
    const amt = Number(payAmount);
    if (isNaN(amt) || amt <= 0) return toast.error("Nominal pembayaran tidak valid");

    try {
      await payDebt(activeId, selectedDebt.id, amt);

      // Also record corresponding transaction if a wallet is selected
      if (payWalletId) {
        await createTransaction(activeId, {
          description:
            selectedDebt.type === "debt"
              ? `Bayar Cicilan Hutang: ${selectedDebt.person_name}`
              : `Terima Pelunasan Piutang: ${selectedDebt.person_name}`,
          category: selectedDebt.type === "debt" ? "Tagihan" : "Lainnya",
          amount: amt,
          type: selectedDebt.type === "debt" ? "expense" : "income",
          wallet_id: payWalletId,
          date: new Date().toISOString(),
        });
      }

      toast.success("Pembayaran cicilan berhasil dicatat!");
      setPayModal(false);
      reloadDebts();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const deleteDebtAction = async (d) => {
    if (!confirm(`Hapus catatan "${d.person_name}"?`)) return;
    try {
      await deleteResource(activeId, "debts", d.id);
      toast.success("Catatan dihapus");
      reloadDebts();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="space-y-6" data-testid="debts-page">
      <PageHeader
        title="Hutang & Piutang Keluarga"
        description="Pantau pinjaman keluarga, piutang ke pihak lain, cicilan, dan tanggal jatuh tempo."
      >
        {canManage && (
          <Button data-testid="add-debt-button" onClick={() => openCreateDialog(tab)}>
            <Plus className="mr-2 h-4 w-4" />
            Catat {tab === "debt" ? "Hutang" : "Piutang"} Baru
          </Button>
        )}
      </PageHeader>

      {/* KPI Overview */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-rose-500/20 bg-rose-500/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Hutang Saya (Kewajiban)</p>
                <p className="mt-1 text-2xl font-bold font-display text-rose-600" data-testid="total-debt-val">
                  {formatIDR(totalPayable)}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Harus dibayarkan ke pihak lain</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600">
                <ArrowUpRight className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Piutang Saya (Tagihan)</p>
                <p className="mt-1 text-2xl font-bold font-display text-emerald-600" data-testid="total-loan-val">
                  {formatIDR(totalReceivable)}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Akan diterima dari pihak lain</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
                <ArrowDownLeft className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="debt" data-testid="tab-debt">
            Hutang Keluarga ({debtList.filter((d) => d.type === "debt").length})
          </TabsTrigger>
          <TabsTrigger value="loan" data-testid="tab-loan">
            Piutang Keluarga ({debtList.filter((d) => d.type === "loan").length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Debts Grid */}
      {filteredDebts.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title={`Belum ada data ${tab === "debt" ? "hutang" : "piutang"}`}
          description={`Catat ${
            tab === "debt"
              ? "kewajiban pinjaman atau cicilan"
              : "piutang yang dipinjam oleh rekan/keluarga lain"
          } untuk dipantau pelunasannya.`}
          actionLabel={`+ Catat ${tab === "debt" ? "Hutang" : "Piutang"}`}
          onAction={() => openCreateDialog(tab)}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="debts-grid">
          {filteredDebts.map((d) => {
            const total = Number(d.total_amount || 0);
            const paid = Number(d.paid_amount || 0);
            const remaining = Math.max(0, total - paid);
            const progress = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
            const isPaid = d.status === "paid" || remaining === 0;

            return (
              <Card
                key={d.id}
                className="overflow-hidden transition-all hover:border-primary/50"
                data-testid={`debt-card-${d.id}`}
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={isPaid ? "secondary" : d.type === "debt" ? "destructive" : "default"}
                          className="text-[10px]"
                        >
                          {isPaid ? "Lunas" : d.status === "partial" ? "Cicilan" : "Belum Lunas"}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-base leading-snug">{d.person_name}</h3>
                    </div>

                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteDebtAction(d)}
                        data-testid={`delete-debt-${d.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Total Pinjaman</span>
                      <span className="font-semibold">{formatIDR(total)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Sudah Dibayar</span>
                      <span className="font-semibold text-emerald-600">+{formatIDR(paid)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
                      <span className="font-medium text-foreground">Sisa Nominal</span>
                      <span className="font-bold text-sm text-rose-600 font-display">
                        {formatIDR(remaining)}
                      </span>
                    </div>

                    <div className="pt-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} />
                    </div>
                  </div>

                  {d.due_date && (
                    <p className="text-[11px] text-muted-foreground">
                      Jatuh Tempo: <span className="font-semibold">{formatDate(d.due_date)}</span>
                    </p>
                  )}

                  {d.notes && (
                    <p className="rounded bg-muted/40 p-2 text-[11px] text-muted-foreground">
                      {d.notes}
                    </p>
                  )}

                  {!isPaid && canManage && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => openPayDialog(d)}
                      data-testid={`pay-debt-btn-${d.id}`}
                    >
                      <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                      Catat Pembayaran / Cicilan
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE DEBT MODAL */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-md" data-testid="debt-form-dialog">
          <DialogHeader>
            <DialogTitle>
              {form.type === "debt" ? "Catat Hutang Baru" : "Catat Piutang Baru"}
            </DialogTitle>
            <DialogDescription>
              {form.type === "debt"
                ? "Catat pinjaman dana yang harus dibayarkan ke pihak lain."
                : "Catat dana yang dipinjam oleh pihak lain dan harus ditagih."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Jenis</Label>
              <Select value={form.type} onValueChange={(val) => setForm({ ...form, type: val })}>
                <SelectTrigger data-testid="debt-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debt">Hutang (Kewajiban Saya)</SelectItem>
                  <SelectItem value="loan">Piutang (Pinjaman ke Orang Lain)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Nama Pihak / Lembaga *</Label>
              <Input
                placeholder="Contoh: Toko Elektronik / Budi Santoso"
                value={form.person_name}
                onChange={(e) => setForm({ ...form, person_name: e.target.value })}
                data-testid="debt-person-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Total Nominal (Rp) *</Label>
              <Input
                type="number"
                placeholder="Contoh: 3000000"
                value={form.total_amount}
                onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
                data-testid="debt-amount-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tanggal Jatuh Tempo (Opsional)</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                data-testid="debt-date-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Catatan Tambahan</Label>
              <Input
                placeholder="Contoh: Cicilan bunga 0% tenor 6 bulan"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                data-testid="debt-notes-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenModal(false)}>
              Batal
            </Button>
            <Button onClick={submitDebt} data-testid="submit-debt-btn">
              Simpan Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PAYMENT MODAL */}
      <Dialog open={payModal} onOpenChange={setPayModal}>
        <DialogContent className="max-w-md" data-testid="pay-dialog">
          <DialogHeader>
            <DialogTitle>Catat Pembayaran Cicilan</DialogTitle>
            <DialogDescription>
              Catat cicilan untuk &quot;{selectedDebt?.person_name}&quot;.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nominal Pembayaran (Rp) *</Label>
              <Input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                data-testid="pay-amount-input"
              />
            </div>

            {walletList.length > 0 && (
              <div className="space-y-1.5">
                <Label>Hubungkan ke Dompet (Opsional)</Label>
                <Select value={payWalletId} onValueChange={setPayWalletId}>
                  <SelectTrigger data-testid="pay-wallet-select">
                    <SelectValue placeholder="Pilih Dompet Pengurang/Penambah" />
                  </SelectTrigger>
                  <SelectContent>
                    {walletList.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Jika dipilih, otomatis akan dibuat transaksi kas di dompet terkait.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayModal(false)}>
              Batal
            </Button>
            <Button onClick={submitPayment} data-testid="submit-payment-btn">
              Konfirmasi Pembayaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
