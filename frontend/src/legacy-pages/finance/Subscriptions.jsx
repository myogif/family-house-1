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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatIDR, formatDate } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import {
  createSubscription,
  paySubscription,
  deleteResource,
  createTransaction,
} from "@/lib/data/resources";
import { toast } from "sonner";
import {
  Plus,
  Repeat,
  Calendar,
  Wallet,
  CheckCircle2,
  Trash2,
  Tv,
  Zap,
  Wifi,
  Shield,
  GraduationCap,
} from "lucide-react";

const CYCLES = Object.freeze({
  monthly: "Bulanan",
  weekly: "Mingguan",
  quarterly: "3 Bulan (Kuartal)",
  yearly: "Tahunan",
});

export default function Subscriptions() {
  const { activeId, activeFamily } = useFamily();
  const { user } = useAuth();

  const { data: subscriptions, reload: reloadSubs } = useResource(
    activeId ? `/families/${activeId}/subscriptions` : null,
    [activeId]
  );
  const { data: wallets } = useResource(
    activeId ? `/families/${activeId}/wallets` : null,
    [activeId]
  );

  const canManage = ["husband", "wife"].includes(activeFamily?.my_role);

  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "Tagihan",
    amount: "",
    billing_cycle: "monthly",
    next_billing_date: new Date().toISOString().slice(0, 10),
    wallet_id: "",
    notes: "",
  });

  const subList = subscriptions || [];
  const walletList = wallets || [];

  const totalMonthlyEquivalent = subList
    .filter((s) => s.is_active !== false)
    .reduce((sum, s) => {
      const amt = Number(s.amount || 0);
      if (s.billing_cycle === "yearly") return sum + amt / 12;
      if (s.billing_cycle === "quarterly") return sum + amt / 3;
      if (s.billing_cycle === "weekly") return sum + amt * 4;
      return sum + amt;
    }, 0);

  const openCreateDialog = () => {
    setForm({
      name: "",
      category: "Tagihan",
      amount: "",
      billing_cycle: "monthly",
      next_billing_date: new Date().toISOString().slice(0, 10),
      wallet_id: walletList[0]?.id || "",
      notes: "",
    });
    setOpenModal(true);
  };

  const submitSubscription = async () => {
    if (!form.name.trim()) return toast.error("Nama langganan wajib diisi");
    const amt = Number(form.amount);
    if (isNaN(amt) || amt <= 0) return toast.error("Nominal tagihan tidak valid");

    try {
      await createSubscription(activeId, {
        name: form.name.trim(),
        category: form.category,
        amount: amt,
        billing_cycle: form.billing_cycle,
        next_billing_date: form.next_billing_date,
        wallet_id: form.wallet_id || null,
        notes: form.notes.trim(),
      });

      toast.success("Langganan rutin berhasil disimpan");
      setOpenModal(false);
      reloadSubs();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const handlePayBill = async (sub) => {
    try {
      // 1. Advance subscription next billing date
      await paySubscription(activeId, sub.id);

      // 2. Record expense transaction in family transactions
      await createTransaction(activeId, {
        description: `Bayar Langganan: ${sub.name}`,
        category: sub.category || "Tagihan",
        amount: Number(sub.amount),
        type: "expense",
        wallet_id: sub.wallet_id || null,
        date: new Date().toISOString(),
      });

      toast.success(`Tagihan "${sub.name}" berhasil dibayar & tanggal tagihan diperbarui!`);
      reloadSubs();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const handleDeleteSub = async (sub) => {
    if (!confirm(`Hapus langganan "${sub.name}"?`)) return;
    try {
      await deleteResource(activeId, "subscriptions", sub.id);
      toast.success("Langganan dihapus");
      reloadSubs();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const getWalletName = (walletId) => {
    return walletList.find((w) => w.id === walletId)?.name;
  };

  return (
    <div className="space-y-6" data-testid="subscriptions-page">
      <PageHeader
        title="Langganan & Tagihan Rutin"
        description="Kelola tagihan berulang seperti WiFi, Listrik, Netflix, BPJS, dan SPP agar tidak terlewat."
      >
        {canManage && (
          <Button data-testid="add-subscription-button" onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Tagihan Rutin
          </Button>
        )}
      </PageHeader>

      {/* KPI Banner */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Estimasi Tagihan / Bulan</p>
                <p className="mt-1 text-2xl font-bold font-display text-blue-600" data-testid="monthly-sub-val">
                  {formatIDR(totalMonthlyEquivalent)}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Komitmen pengeluaran tetap</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600">
                <Repeat className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Jumlah Tagihan Aktif</p>
            <p className="mt-1 text-2xl font-bold font-display">{subList.length} Layanan</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Otomasi Pembayaran</p>
            <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>1-Klik Catat Pengeluaran & Perbarui Siklus</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions Grid */}
      {subList.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="Belum ada langganan atau tagihan rutin"
          description="Tambahkan tagihan rutin keluarga seperti WiFi, Listrik, Streaming, atau Asuransi."
          actionLabel="+ Tambah Tagihan Pertama"
          onAction={openCreateDialog}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="subscriptions-grid">
          {subList.map((sub) => {
            const walletName = getWalletName(sub.wallet_id);

            return (
              <Card
                key={sub.id}
                className="transition-all hover:border-primary/50"
                data-testid={`sub-card-${sub.id}`}
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Badge variant="outline" className="text-[10px]">
                          {sub.category || "Tagihan"}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {CYCLES[sub.billing_cycle] || "Bulanan"}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-base leading-snug">{sub.name}</h3>
                    </div>

                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteSub(sub)}
                        data-testid={`delete-sub-${sub.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Nominal Tagihan</p>
                    <p className="text-xl font-bold font-display text-rose-600" data-testid={`sub-amount-${sub.id}`}>
                      {formatIDR(sub.amount)}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Jatuh Tempo:</span>
                      <span className="font-semibold text-foreground" data-testid={`sub-date-${sub.id}`}>
                        {sub.next_billing_date ? formatDate(sub.next_billing_date) : "-"}
                      </span>
                    </div>
                    {walletName && (
                      <div className="flex items-center justify-between">
                        <span>Bayar Lewat:</span>
                        <span className="font-medium text-foreground">{walletName}</span>
                      </div>
                    )}
                  </div>

                  {sub.notes && (
                    <p className="rounded bg-muted/40 p-2 text-[11px] text-muted-foreground">
                      {sub.notes}
                    </p>
                  )}

                  {canManage && (
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full"
                      onClick={() => handlePayBill(sub)}
                      data-testid={`pay-sub-btn-${sub.id}`}
                    >
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      Bayar & Perbarui Siklus
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE SUBSCRIPTION MODAL */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-md" data-testid="sub-form-dialog">
          <DialogHeader>
            <DialogTitle>Tambah Tagihan Rutin</DialogTitle>
            <DialogDescription>
              Catat layanan berlangganan atau tagihan wajib keluarga.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nama Layanan / Tagihan *</Label>
              <Input
                placeholder="Contoh: WiFi Indihome / Listrik PLN / Netflix"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                data-testid="sub-name-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <Select
                  value={form.category}
                  onValueChange={(val) => setForm({ ...form, category: val })}
                >
                  <SelectTrigger data-testid="sub-category-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tagihan">Tagihan Rumah</SelectItem>
                    <SelectItem value="Hiburan">Hiburan & Streaming</SelectItem>
                    <SelectItem value="Pendidikan">Pendidikan & SPP</SelectItem>
                    <SelectItem value="Asuransi">Asuransi & BPJS</SelectItem>
                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Siklus Tagihan</Label>
                <Select
                  value={form.billing_cycle}
                  onValueChange={(val) => setForm({ ...form, billing_cycle: val })}
                >
                  <SelectTrigger data-testid="sub-cycle-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Bulanan</SelectItem>
                    <SelectItem value="weekly">Mingguan</SelectItem>
                    <SelectItem value="quarterly">3 Bulan (Kuartal)</SelectItem>
                    <SelectItem value="yearly">Tahunan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Nominal per Siklus (Rp) *</Label>
              <Input
                type="number"
                placeholder="Contoh: 350000"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                data-testid="sub-amount-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tanggal Jatuh Tempo Berikutnya</Label>
              <Input
                type="date"
                value={form.next_billing_date}
                onChange={(e) => setForm({ ...form, next_billing_date: e.target.value })}
                data-testid="sub-date-input"
              />
            </div>

            {walletList.length > 0 && (
              <div className="space-y-1.5">
                <Label>Dompet Pembayaran Default</Label>
                <Select
                  value={form.wallet_id}
                  onValueChange={(val) => setForm({ ...form, wallet_id: val })}
                >
                  <SelectTrigger data-testid="sub-wallet-select">
                    <SelectValue placeholder="Pilih Dompet" />
                  </SelectTrigger>
                  <SelectContent>
                    {walletList.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Catatan Tambahan</Label>
              <Input
                placeholder="Contoh: ID Pelanggan: 1029384756"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                data-testid="sub-notes-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenModal(false)}>
              Batal
            </Button>
            <Button onClick={submitSubscription} data-testid="submit-sub-btn">
              Simpan Tagihan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
