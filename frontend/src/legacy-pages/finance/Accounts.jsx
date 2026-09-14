"use client";

import { useState } from "react";
import { useFamily } from "@/context/FamilyContext";
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
import { formatIDR } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import {
  createWallet,
  updateWallet,
  deleteResource,
  createTransaction,
} from "@/lib/data/resources";
import { toast } from "sonner";
import {
  Plus,
  Wallet,
  Landmark,
  Smartphone,
  Coins,
  TrendingUp,
  CreditCard,
  ArrowLeftRight,
  Edit2,
  Trash2,
  CheckCircle2,
} from "lucide-react";

const WALLET_TYPES = Object.freeze({
  bank: { label: "Rekening Bank", icon: Landmark, color: "#1e40af" },
  ewallet: { label: "E-Wallet", icon: Smartphone, color: "#059669" },
  cash: { label: "Uang Tunai / Cash", icon: Coins, color: "#d97706" },
  investment: { label: "Investasi / Emas", icon: TrendingUp, color: "#7c3aed" },
  credit_card: { label: "Kartu Kredit", icon: CreditCard, color: "#dc2626" },
  other: { label: "Lainnya", icon: Wallet, color: "#4b5563" },
});

export default function Accounts() {
  const { activeId, activeFamily } = useFamily();
  const { data: wallets, reload: reloadWallets } = useResource(
    activeId ? `/families/${activeId}/wallets` : null,
    [activeId]
  );
  const { data: txs, reload: reloadTxs } = useResource(
    activeId ? `/families/${activeId}/transactions` : null,
    [activeId]
  );

  const canManage = ["husband", "wife"].includes(activeFamily?.my_role);

  // Add / Edit Modal
  const [openModal, setOpenModal] = useState(false);
  const [editingWalletId, setEditingWalletId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    type: "bank",
    initial_balance: "",
    account_number: "",
    color: "#1e40af",
  });

  // Transfer Modal
  const [openTransferModal, setOpenTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({
    source_wallet_id: "",
    destination_wallet_id: "",
    amount: "",
    transfer_fee: "0",
    notes: "",
  });

  const walletList = wallets || [];
  const transactionList = txs || [];

  // Calculate live balance per wallet based on transactions
  const walletsWithCalculatedBalance = walletList.map((w) => {
    let balance = Number(w.initial_balance || 0);
    transactionList.forEach((t) => {
      const amt = Number(t.amount || 0);
      const fee = Number(t.transfer_fee || 0);
      if (t.wallet_id === w.id) {
        if (t.type === "income") balance += amt;
        else if (t.type === "expense") balance -= amt;
        else if (t.type === "transfer") balance -= amt + fee;
      }
      if (t.destination_wallet_id === w.id && t.type === "transfer") {
        balance += amt;
      }
    });
    return { ...w, calculated_balance: balance };
  });

  const totalBalance = walletsWithCalculatedBalance.reduce(
    (sum, w) => sum + (w.calculated_balance || 0),
    0
  );

  const openCreateDialog = () => {
    setEditingWalletId(null);
    setForm({
      name: "",
      type: "bank",
      initial_balance: "",
      account_number: "",
      color: "#1e40af",
    });
    setOpenModal(true);
  };

  const openEditDialog = (w) => {
    setEditingWalletId(w.id);
    setForm({
      name: w.name,
      type: w.type || "bank",
      initial_balance: String(w.initial_balance || 0),
      account_number: w.account_number || "",
      color: w.color || "#1e40af",
    });
    setOpenModal(true);
  };

  const openTransferDialog = (sourceId = null) => {
    const src = sourceId || walletList[0]?.id || "";
    const dst = walletList.find((w) => w.id !== src)?.id || "";
    setTransferForm({
      source_wallet_id: src,
      destination_wallet_id: dst,
      amount: "",
      transfer_fee: "0",
      notes: "Transfer saldo antar dompet",
    });
    setOpenTransferModal(true);
  };

  const submitWallet = async () => {
    if (!form.name.trim()) return toast.error("Nama dompet wajib diisi");
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        initial_balance: Number(form.initial_balance || 0),
        account_number: form.account_number.trim(),
        color: form.color,
      };

      if (editingWalletId) {
        await updateWallet(activeId, editingWalletId, payload);
        toast.success("Dompet berhasil diperbarui");
      } else {
        await createWallet(activeId, payload);
        toast.success("Dompet baru berhasil ditambahkan");
      }
      setOpenModal(false);
      reloadWallets();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const submitTransfer = async () => {
    if (!transferForm.source_wallet_id || !transferForm.destination_wallet_id) {
      return toast.error("Pilih dompet asal dan tujuan transfer");
    }
    if (transferForm.source_wallet_id === transferForm.destination_wallet_id) {
      return toast.error("Dompet asal dan tujuan tidak boleh sama");
    }
    const amt = Number(transferForm.amount);
    if (isNaN(amt) || amt <= 0) return toast.error("Nominal transfer tidak valid");

    try {
      const src = walletList.find((w) => w.id === transferForm.source_wallet_id);
      const dst = walletList.find((w) => w.id === transferForm.destination_wallet_id);

      await createTransaction(activeId, {
        description: transferForm.notes || `Transfer dari ${src?.name} ke ${dst?.name}`,
        category: "Transfer",
        amount: amt,
        type: "transfer",
        wallet_id: transferForm.source_wallet_id,
        destination_wallet_id: transferForm.destination_wallet_id,
        transfer_fee: Number(transferForm.transfer_fee || 0),
        date: new Date().toISOString(),
      });

      toast.success("Transfer saldo berhasil dicatat!");
      setOpenTransferModal(false);
      reloadTxs();
      reloadWallets();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const deleteWalletAction = async (w) => {
    if (!confirm(`Hapus dompet "${w.name}"?`)) return;
    try {
      await deleteResource(activeId, "wallets", w.id);
      toast.success("Dompet dihapus");
      reloadWallets();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="space-y-6" data-testid="accounts-page">
      <PageHeader
        title="Dompet & Rekening Keluarga"
        description="Kelola rekening bank, e-wallet, uang tunai, dan aset likuid keluarga dalam satu dasbor."
      >
        <div className="flex flex-wrap items-center gap-2">
          {walletList.length >= 2 && (
            <Button
              variant="outline"
              onClick={() => openTransferDialog()}
              data-testid="transfer-wallet-button"
            >
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              Transfer Antar Dompet
            </Button>
          )}
          {canManage && (
            <Button data-testid="add-wallet-button" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Dompet
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Summary Banner */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Saldo Semua Dompet</p>
                <p className="mt-1 text-2xl font-bold font-display text-primary" data-testid="total-balance">
                  {formatIDR(totalBalance)}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Wallet className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Jumlah Rekening & Dompet</p>
            <p className="mt-1 text-2xl font-bold font-display">{walletList.length} Akun</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Status Sinkronisasi</p>
            <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>Multi-Tenant Database Aktif</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wallets Grid */}
      {walletsWithCalculatedBalance.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Belum ada dompet atau rekening"
          description="Tambahkan rekening bank, GoPay/OVO, atau uang tunai pertama keluarga Anda."
          actionLabel="+ Tambah Dompet Pertama"
          onAction={openCreateDialog}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="wallets-grid">
          {walletsWithCalculatedBalance.map((w) => {
            const config = WALLET_TYPES[w.type] || WALLET_TYPES.other;
            const Icon = config.icon;

            return (
              <Card
                key={w.id}
                className="relative overflow-hidden transition-all hover:border-primary/50 hover:shadow-sm"
                data-testid={`wallet-card-${w.id}`}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1.5"
                  style={{ backgroundColor: w.color || config.color }}
                />
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-xs"
                        style={{ backgroundColor: w.color || config.color }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider mb-1">
                          {config.label}
                        </Badge>
                        <h3 className="font-bold text-base leading-snug">{w.name}</h3>
                      </div>
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => openEditDialog(w)}
                          data-testid={`edit-wallet-${w.id}`}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteWalletAction(w)}
                          data-testid={`delete-wallet-${w.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {w.account_number && (
                    <p className="text-xs text-muted-foreground font-mono">
                      No: {w.account_number}
                    </p>
                  )}

                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Saldo Saat Ini</p>
                      <p className="text-xl font-bold font-display" data-testid={`wallet-balance-${w.id}`}>
                        {formatIDR(w.calculated_balance)}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openTransferDialog(w.id)}
                      data-testid={`transfer-from-wallet-${w.id}`}
                    >
                      <ArrowLeftRight className="mr-1.5 h-3.5 w-3.5" />
                      Transfer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT WALLET MODAL */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-md" data-testid="wallet-form-dialog">
          <DialogHeader>
            <DialogTitle>{editingWalletId ? "Edit Dompet" : "Tambah Dompet Baru"}</DialogTitle>
            <DialogDescription>
              Simpan rekening bank, e-wallet, atau pos keuangan terpisah untuk keluarga.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nama Dompet *</Label>
              <Input
                placeholder="Contoh: BCA Utama / GoPay Yogi / Kas Tunai"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                data-testid="wallet-name-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tipe Akun</Label>
              <Select value={form.type} onValueChange={(val) => setForm({ ...form, type: val })}>
                <SelectTrigger data-testid="wallet-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(WALLET_TYPES).map(([key, item]) => (
                    <SelectItem key={key} value={key}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Saldo Awal (Rp)</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.initial_balance}
                onChange={(e) => setForm({ ...form, initial_balance: e.target.value })}
                data-testid="wallet-balance-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Nomor Rekening / No HP (Opsional)</Label>
              <Input
                placeholder="Contoh: 1234567890"
                value={form.account_number}
                onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                data-testid="wallet-acc-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Warna Kartu</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent p-0.5"
                  data-testid="wallet-color-input"
                />
                <span className="text-xs text-muted-foreground font-mono">{form.color}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenModal(false)}>
              Batal
            </Button>
            <Button onClick={submitWallet} data-testid="submit-wallet-btn">
              {editingWalletId ? "Simpan Perubahan" : "Tambah Dompet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TRANSFER ANTAR DOMPET MODAL */}
      <Dialog open={openTransferModal} onOpenChange={setOpenTransferModal}>
        <DialogContent className="max-w-md" data-testid="transfer-dialog">
          <DialogHeader>
            <DialogTitle>Transfer Saldo Antar Dompet</DialogTitle>
            <DialogDescription>
              Pindahkan dana dari satu dompet/rekening ke dompet keluarga lainnya.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Dari Dompet (Asal)</Label>
                <Select
                  value={transferForm.source_wallet_id}
                  onValueChange={(val) => setTransferForm({ ...transferForm, source_wallet_id: val })}
                >
                  <SelectTrigger data-testid="transfer-source-select">
                    <SelectValue placeholder="Pilih Asal" />
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

              <div className="space-y-1.5">
                <Label>Ke Dompet (Tujuan)</Label>
                <Select
                  value={transferForm.destination_wallet_id}
                  onValueChange={(val) =>
                    setTransferForm({ ...transferForm, destination_wallet_id: val })
                  }
                >
                  <SelectTrigger data-testid="transfer-dest-select">
                    <SelectValue placeholder="Pilih Tujuan" />
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
            </div>

            <div className="space-y-1.5">
              <Label>Nominal Transfer (Rp) *</Label>
              <Input
                type="number"
                placeholder="Contoh: 500000"
                value={transferForm.amount}
                onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                data-testid="transfer-amount-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Biaya Admin / Transfer Fee (Rp)</Label>
              <Input
                type="number"
                placeholder="0"
                value={transferForm.transfer_fee}
                onChange={(e) => setTransferForm({ ...transferForm, transfer_fee: e.target.value })}
                data-testid="transfer-fee-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Catatan Transfer</Label>
              <Input
                placeholder="Contoh: Isi saldo GoPay belanja"
                value={transferForm.notes}
                onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                data-testid="transfer-notes-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenTransferModal(false)}>
              Batal
            </Button>
            <Button onClick={submitTransfer} data-testid="submit-transfer-btn">
              Kirim Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
