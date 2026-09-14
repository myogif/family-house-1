"use client";

import { useState } from "react";
import Link from "next/link";
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
import { createAsset, updateAsset, deleteResource } from "@/lib/data/resources";
import { toast } from "sonner";
import {
  Plus,
  Building,
  Car,
  Coins,
  Tv,
  TrendingUp,
  Package,
  Edit2,
  Trash2,
  Wallet,
  Scale,
} from "lucide-react";

const ASSET_CATEGORIES = Object.freeze({
  property: { label: "Properti & Rumah", icon: Building, color: "#1e40af" },
  vehicle: { label: "Kendaraan (Mobil/Motor)", icon: Car, color: "#059669" },
  precious_metal: { label: "Logam Mulia / Emas", icon: Coins, color: "#d97706" },
  electronic: { label: "Elektronik & Gadget", icon: Tv, color: "#7c3aed" },
  investment: { label: "Investasi Portofolio", icon: TrendingUp, color: "#2563eb" },
  other: { label: "Aset Lainnya", icon: Package, color: "#4b5563" },
});

export default function Assets() {
  const { activeId, activeFamily } = useFamily();
  const { user } = useAuth();

  const { data: assets, reload: reloadAssets } = useResource(
    activeId ? `/families/${activeId}/assets` : null,
    [activeId]
  );
  const { data: wallets } = useResource(
    activeId ? `/families/${activeId}/wallets` : null,
    [activeId]
  );
  const { data: debts } = useResource(
    activeId ? `/families/${activeId}/debts` : null,
    [activeId]
  );
  const { data: txs } = useResource(
    activeId ? `/families/${activeId}/transactions` : null,
    [activeId]
  );

  const canManage = ["husband", "wife"].includes(activeFamily?.my_role);

  const [openModal, setOpenModal] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    category: "property",
    estimated_value: "",
    purchase_price: "",
    purchase_date: "",
    location: "",
    notes: "",
  });

  const assetList = assets || [];
  const walletList = wallets || [];
  const debtList = debts || [];
  const txList = txs || [];

  // Calculate total liquid wallet balance
  const totalWalletBalance = walletList.reduce((sum, w) => {
    let b = Number(w.initial_balance || 0);
    txList.forEach((t) => {
      const amt = Number(t.amount || 0);
      const fee = Number(t.transfer_fee || 0);
      if (t.wallet_id === w.id) {
        if (t.type === "income") b += amt;
        else if (t.type === "expense") b -= amt;
        else if (t.type === "transfer") b -= amt + fee;
      }
      if (t.destination_wallet_id === w.id && t.type === "transfer") b += amt;
    });
    return sum + b;
  }, 0);

  const totalAssetsValue = assetList.reduce(
    (sum, a) => sum + Number(a.estimated_value || 0),
    0
  );

  const totalDebts = debtList
    .filter((d) => d.type === "debt" && d.status !== "paid")
    .reduce((sum, d) => sum + (Number(d.total_amount || 0) - Number(d.paid_amount || 0)), 0);

  const totalLoans = debtList
    .filter((d) => d.type === "loan" && d.status !== "paid")
    .reduce((sum, d) => sum + (Number(d.total_amount || 0) - Number(d.paid_amount || 0)), 0);

  // Net Worth: Liquid cash + Assets + Receivables - Debts
  const netWorth = totalWalletBalance + totalAssetsValue + totalLoans - totalDebts;

  const openCreateDialog = () => {
    setEditingAssetId(null);
    setForm({
      name: "",
      category: "property",
      estimated_value: "",
      purchase_price: "",
      purchase_date: "",
      location: "",
      notes: "",
    });
    setOpenModal(true);
  };

  const openEditDialog = (a) => {
    setEditingAssetId(a.id);
    setForm({
      name: a.name,
      category: a.category || "property",
      estimated_value: String(a.estimated_value || 0),
      purchase_price: String(a.purchase_price || 0),
      purchase_date: a.purchase_date || "",
      location: a.location || "",
      notes: a.notes || "",
    });
    setOpenModal(true);
  };

  const submitAsset = async () => {
    if (!form.name.trim()) return toast.error("Nama aset wajib diisi");
    const val = Number(form.estimated_value);
    if (isNaN(val) || val < 0) return toast.error("Nilai taksiran aset tidak valid");

    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        estimated_value: val,
        purchase_price: Number(form.purchase_price || 0),
        purchase_date: form.purchase_date || null,
        location: form.location.trim(),
        notes: form.notes.trim(),
      };

      if (editingAssetId) {
        await updateAsset(activeId, editingAssetId, payload);
        toast.success("Aset berhasil diperbarui");
      } else {
        await createAsset(activeId, payload);
        toast.success("Aset baru berhasil dicatat");
      }
      setOpenModal(false);
      reloadAssets();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const handleDeleteAsset = async (a) => {
    if (!confirm(`Hapus aset "${a.name}"?`)) return;
    try {
      await deleteResource(activeId, "assets", a.id);
      toast.success("Aset dihapus");
      reloadAssets();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="space-y-6" data-testid="assets-page">
      <PageHeader
        title="Aset & Kekayaan Bersih (Net Worth)"
        description="Inventarisasi aset tetap, kendaraan, logam mulia, dan perhitungan kekayaan bersih keluarga."
      >
        {canManage && (
          <Button data-testid="add-asset-button" onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Aset Baru
          </Button>
        )}
      </PageHeader>

      {/* Net Worth Dashboard Card */}
      <Card className="border-primary/20 bg-primary/5 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Kekayaan Bersih Keluarga
              </span>
              <h2 className="text-3xl font-bold font-display text-primary" data-testid="net-worth-display">
                {formatIDR(netWorth)}
              </h2>
              <p className="text-xs text-muted-foreground">
                Kalkulasi otomatis: (Saldo Dompet + Aset Fisik + Piutang) - Hutang
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg bg-background/80 p-3 border border-border">
                <span className="text-muted-foreground block">Kas / Dompet</span>
                <span className="font-bold text-sm text-foreground">{formatIDR(totalWalletBalance)}</span>
              </div>
              <div className="rounded-lg bg-background/80 p-3 border border-border">
                <span className="text-muted-foreground block">Aset Tetap</span>
                <span className="font-bold text-sm text-emerald-600">{formatIDR(totalAssetsValue)}</span>
              </div>
              <div className="rounded-lg bg-background/80 p-3 border border-border">
                <span className="text-muted-foreground block">Piutang</span>
                <span className="font-bold text-sm text-blue-600">{formatIDR(totalLoans)}</span>
              </div>
              <div className="rounded-lg bg-background/80 p-3 border border-border">
                <span className="text-muted-foreground block">Hutang</span>
                <span className="font-bold text-sm text-rose-600">-{formatIDR(totalDebts)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assets Grid */}
      {assetList.length === 0 ? (
        <EmptyState
          icon={Building}
          title="Belum ada aset terdaftar"
          description="Catat rumah tinggal, kendaraan, tabungan emas, atau aset keluarga lainnya."
          actionLabel="+ Tambah Aset Pertama"
          onAction={openCreateDialog}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="assets-grid">
          {assetList.map((a) => {
            const config = ASSET_CATEGORIES[a.category] || ASSET_CATEGORIES.other;
            const Icon = config.icon;
            const estimated = Number(a.estimated_value || 0);
            const purchase = Number(a.purchase_price || 0);
            const growth = purchase > 0 ? estimated - purchase : 0;

            return (
              <Card
                key={a.id}
                className="transition-all hover:border-primary/50"
                data-testid={`asset-card-${a.id}`}
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-xs"
                        style={{ backgroundColor: config.color }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <Badge variant="outline" className="text-[10px] mb-1">
                          {config.label}
                        </Badge>
                        <h3 className="font-bold text-base leading-snug">{a.name}</h3>
                      </div>
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => openEditDialog(a)}
                          data-testid={`edit-asset-${a.id}`}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteAsset(a)}
                          data-testid={`delete-asset-${a.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Nilai Taksiran Sekarang</p>
                    <p className="text-xl font-bold font-display text-emerald-600" data-testid={`asset-val-${a.id}`}>
                      {formatIDR(estimated)}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border space-y-1 text-xs text-muted-foreground">
                    {purchase > 0 && (
                      <div className="flex items-center justify-between">
                        <span>Harga Beli:</span>
                        <span>{formatIDR(purchase)}</span>
                      </div>
                    )}
                    {growth !== 0 && (
                      <div className="flex items-center justify-between">
                        <span>Apresiasi / Selisih:</span>
                        <span className={growth > 0 ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>
                          {growth > 0 ? "+" : ""}{formatIDR(growth)}
                        </span>
                      </div>
                    )}
                    {a.location && (
                      <div className="flex items-center justify-between">
                        <span>Lokasi:</span>
                        <span className="text-foreground font-medium">{a.location}</span>
                      </div>
                    )}
                    {a.purchase_date && (
                      <div className="flex items-center justify-between">
                        <span>Tanggal Beli:</span>
                        <span>{formatDate(a.purchase_date)}</span>
                      </div>
                    )}
                  </div>

                  {a.notes && (
                    <p className="rounded bg-muted/40 p-2 text-[11px] text-muted-foreground">
                      {a.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT ASSET MODAL */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-md" data-testid="asset-form-dialog">
          <DialogHeader>
            <DialogTitle>{editingAssetId ? "Edit Aset" : "Tambah Aset Baru"}</DialogTitle>
            <DialogDescription>
              Catat properti, kendaraan, logam mulia, atau investasi keluarga.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nama Aset *</Label>
              <Input
                placeholder="Contoh: Rumah Tinggal / Honda Vario / Emas Antam 10gr"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                data-testid="asset-name-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Kategori Aset</Label>
              <Select
                value={form.category}
                onValueChange={(val) => setForm({ ...form, category: val })}
              >
                <SelectTrigger data-testid="asset-category-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ASSET_CATEGORIES).map(([key, item]) => (
                    <SelectItem key={key} value={key}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nilai Taksiran Sekarang (Rp) *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.estimated_value}
                  onChange={(e) => setForm({ ...form, estimated_value: e.target.value })}
                  data-testid="asset-value-input"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Harga Beli (Rp)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.purchase_price}
                  onChange={(e) => setForm({ ...form, purchase_price: e.target.value })}
                  data-testid="asset-price-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tanggal Perolehan</Label>
                <Input
                  type="date"
                  value={form.purchase_date}
                  onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                  data-testid="asset-date-input"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Lokasi / Penyimpanan</Label>
                <Input
                  placeholder="Misal: Garasi / Brankas"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  data-testid="asset-loc-input"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Catatan Tambahan</Label>
              <Input
                placeholder="Contoh: No Sertifikat SHM / No BPKB"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                data-testid="asset-notes-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenModal(false)}>
              Batal
            </Button>
            <Button onClick={submitAsset} data-testid="submit-asset-btn">
              {editingAssetId ? "Simpan Perubahan" : "Simpan Aset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
