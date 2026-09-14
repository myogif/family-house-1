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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatIDR, formatDate, CATEGORIES } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import { createTransaction, deleteResource } from "@/lib/data/resources";
import { toast } from "sonner";
import {
  Plus,
  ArrowLeftRight,
  Search,
  Wallet,
  Calendar as CalendarIcon,
  TrendingDown,
  TrendingUp,
  Trash2,
  Filter,
} from "lucide-react";

export default function Transactions() {
  const { activeId, activeFamily } = useFamily();
  const { user } = useAuth();

  const { data: txs, reload: reloadTxs } = useResource(
    activeId ? `/families/${activeId}/transactions` : null,
    [activeId]
  );
  const { data: wallets } = useResource(
    activeId ? `/families/${activeId}/wallets` : null,
    [activeId]
  );

  const canManage = ["husband", "wife"].includes(activeFamily?.my_role);

  const [viewMode, setViewMode] = useState("daily"); // 'daily' | 'all'
  const [openDialog, setOpenDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterWallet, setFilterWallet] = useState("all");

  const [txType, setTxType] = useState("expense"); // 'expense' | 'income' | 'transfer'
  const [form, setForm] = useState({
    description: "",
    category: "Makanan",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    wallet_id: "",
    destination_wallet_id: "",
    transfer_fee: "0",
  });

  const walletList = wallets || [];
  const list = txs || [];

  const openAddDialog = (presetType = "expense") => {
    setTxType(presetType);
    setForm({
      description: "",
      category: presetType === "income" ? "Gaji" : presetType === "transfer" ? "Transfer" : "Makanan",
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      wallet_id: walletList[0]?.id || "",
      destination_wallet_id: walletList[1]?.id || "",
      transfer_fee: "0",
    });
    setOpenDialog(true);
  };

  const submitTransaction = async () => {
    if (!form.description.trim()) return toast.error("Deskripsi transaksi wajib diisi");
    const amt = Number(form.amount);
    if (isNaN(amt) || amt <= 0) return toast.error("Nominal transaksi harus lebih dari 0");

    if (txType === "transfer") {
      if (!form.wallet_id || !form.destination_wallet_id) {
        return toast.error("Pilih dompet asal dan dompet tujuan");
      }
      if (form.wallet_id === form.destination_wallet_id) {
        return toast.error("Dompet asal dan tujuan tidak boleh sama");
      }
    }

    try {
      await createTransaction(activeId, {
        description: form.description.trim(),
        category: txType === "transfer" ? "Transfer" : form.category,
        amount: amt,
        type: txType,
        date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
        wallet_id: form.wallet_id || null,
        destination_wallet_id: txType === "transfer" ? form.destination_wallet_id : null,
        transfer_fee: txType === "transfer" ? Number(form.transfer_fee || 0) : 0,
      });

      toast.success(
        txType === "income"
          ? "Pemasukan dicatat"
          : txType === "transfer"
          ? "Transfer berhasil dicatat"
          : "Pengeluaran dicatat"
      );
      setOpenDialog(false);
      reloadTxs();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const handleDeleteTx = async (tx) => {
    if (!confirm(`Hapus transaksi "${tx.description}"?`)) return;
    try {
      await deleteResource(activeId, "transactions", tx.id);
      toast.success("Transaksi dihapus");
      reloadTxs();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  // Filtered transactions
  const filteredList = useMemo(() => {
    return list.filter((t) => {
      const matchCat = filterCat === "all" || t.category === filterCat;
      const matchType = filterType === "all" || t.type === filterType;
      const matchWallet =
        filterWallet === "all" ||
        t.wallet_id === filterWallet ||
        t.destination_wallet_id === filterWallet;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        t.description.toLowerCase().includes(q) ||
        (t.member_name && t.member_name.toLowerCase().includes(q));
      return matchCat && matchType && matchWallet && matchSearch;
    });
  }, [list, filterCat, filterType, filterWallet, searchQuery]);

  // Group transactions by date for Daily view
  const groupedByDate = useMemo(() => {
    const groups = {};
    filteredList.forEach((t) => {
      const dateKey = t.date ? t.date.slice(0, 10) : "Tanpa Tanggal";
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateKey,
          items: [],
          totalIncome: 0,
          totalExpense: 0,
        };
      }
      groups[dateKey].items.push(t);
      if (t.type === "income") groups[dateKey].totalIncome += Number(t.amount || 0);
      else if (t.type === "expense") groups[dateKey].totalExpense += Number(t.amount || 0);
      else if (t.type === "transfer" && Number(t.transfer_fee || 0) > 0) {
        groups[dateKey].totalExpense += Number(t.transfer_fee);
      }
    });

    return Object.values(groups).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [filteredList]);

  const totalIncome = filteredList
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalExpense = filteredList
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const netCashFlow = totalIncome - totalExpense;

  const getWalletName = (walletId) => {
    if (!walletId) return null;
    return walletList.find((w) => w.id === walletId)?.name;
  };

  return (
    <div className="space-y-6" data-testid="transactions-page">
      <PageHeader
        title="Transaksi Keuangan"
        description="Kelola pencatatan pemasukan, pengeluaran harian, dan transfer antar dompet keluarga."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/finance/accounts">
            <Button variant="outline" data-testid="goto-wallets-btn">
              <Wallet className="mr-2 h-4 w-4" />
              Dompet ({walletList.length})
            </Button>
          </Link>
          <Link href="/finance/calendar">
            <Button variant="outline" data-testid="goto-calendar-btn">
              <CalendarIcon className="mr-2 h-4 w-4" />
              Kalender
            </Button>
          </Link>
          <Button
            data-testid="add-transaction-button"
            onClick={() => openAddDialog("expense")}
          >
            <Plus className="mr-2 h-4 w-4" />
            Catat Transaksi
          </Button>
        </div>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Pemasukan</p>
                <p className="mt-1 text-2xl font-bold font-display text-emerald-600" data-testid="total-income">
                  +{formatIDR(totalIncome)}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-500/20 bg-rose-500/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Pengeluaran</p>
                <p className="mt-1 text-2xl font-bold font-display text-rose-600" data-testid="total-expense">
                  -{formatIDR(totalExpense)}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Arus Kas Bersih (Net)</p>
                <p
                  className={`mt-1 text-2xl font-bold font-display ${
                    netCashFlow >= 0 ? "text-foreground" : "text-rose-600"
                  }`}
                  data-testid="net-flow"
                >
                  {formatIDR(netCashFlow)}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <ArrowLeftRight className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={viewMode} onValueChange={setViewMode}>
          <TabsList>
            <TabsTrigger value="daily" data-testid="view-daily-tab">
              Tampilan Harian (Daily)
            </TabsTrigger>
            <TabsTrigger value="all" data-testid="view-all-tab">
              Semua Transaksi ({filteredList.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {walletList.length > 0 && (
            <Select value={filterWallet} onValueChange={setFilterWallet}>
              <SelectTrigger className="w-[140px]" data-testid="filter-wallet">
                <SelectValue placeholder="Dompet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Dompet</SelectItem>
                {walletList.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[130px]" data-testid="filter-type">
              <SelectValue placeholder="Jenis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Jenis</SelectItem>
              <SelectItem value="expense">Pengeluaran</SelectItem>
              <SelectItem value="income">Pemasukan</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-[140px]" data-testid="filter-cat">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari transaksi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs"
              data-testid="search-tx-input"
            />
          </div>
        </div>
      </div>

      {/* Transactions List */}
      {filteredList.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="Belum ada data transaksi"
          description="Catat pemasukan atau pengeluaran pertama Anda sekarang."
          actionLabel="+ Catat Transaksi Baru"
          onAction={() => openAddDialog("expense")}
        />
      ) : viewMode === "daily" ? (
        /* DAILY GROUPED VIEW */
        <div className="space-y-4" data-testid="daily-grouped-view">
          {groupedByDate.map((group) => (
            <Card key={group.date} className="overflow-hidden" data-testid={`group-${group.date}`}>
              <div className="flex flex-wrap items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5 text-xs">
                <div className="font-semibold text-foreground">
                  {group.date !== "Tanpa Tanggal" ? formatDate(group.date) : "Tanpa Tanggal"}
                </div>
                <div className="flex items-center gap-3">
                  {group.totalIncome > 0 && (
                    <span className="font-semibold text-emerald-600">
                      +{formatIDR(group.totalIncome)}
                    </span>
                  )}
                  {group.totalExpense > 0 && (
                    <span className="font-semibold text-rose-600">
                      -{formatIDR(group.totalExpense)}
                    </span>
                  )}
                </div>
              </div>

              <div className="divide-y divide-border">
                {group.items.map((t) => {
                  const srcWallet = getWalletName(t.wallet_id);
                  const dstWallet = getWalletName(t.destination_wallet_id);
                  const isIncome = t.type === "income";
                  const isTransfer = t.type === "transfer";

                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3.5 text-sm hover:bg-muted/30 transition-colors"
                      data-testid={`tx-row-${t.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                            isIncome
                              ? "bg-emerald-500/10 text-emerald-600"
                              : isTransfer
                              ? "bg-blue-500/10 text-blue-600"
                              : "bg-rose-500/10 text-rose-600"
                          }`}
                        >
                          {isIncome ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : isTransfer ? (
                            <ArrowLeftRight className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground leading-tight">
                              {t.description}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                              {t.category}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {isTransfer ? (
                              <span>
                                {srcWallet || "Dompet"} ➔ {dstWallet || "Tujuan"}
                              </span>
                            ) : (
                              srcWallet && <span>{srcWallet}</span>
                            )}
                            {t.member_name && <span>• {t.member_name}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`font-bold font-display ${
                            isIncome
                              ? "text-emerald-600"
                              : isTransfer
                              ? "text-blue-600"
                              : "text-foreground"
                          }`}
                        >
                          {isIncome ? "+" : isTransfer ? "⇄" : "-"}
                          {formatIDR(t.amount)}
                        </span>

                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteTx(t)}
                            data-testid={`delete-tx-${t.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <Card data-testid="all-tx-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deskripsi</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Dompet</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Pelaku</TableHead>
                <TableHead className="text-right">Nominal</TableHead>
                {canManage && <TableHead className="w-12"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredList.map((t) => {
                const srcWallet = getWalletName(t.wallet_id);
                const isIncome = t.type === "income";
                const isTransfer = t.type === "transfer";

                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{t.category}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {srcWallet || "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t.date ? formatDate(t.date) : "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t.member_name || "-"}
                    </TableCell>
                    <TableCell
                      className={`text-right font-bold font-display ${
                        isIncome
                          ? "text-emerald-600"
                          : isTransfer
                          ? "text-blue-600"
                          : "text-foreground"
                      }`}
                    >
                      {isIncome ? "+" : isTransfer ? "⇄" : "-"}
                      {formatIDR(t.amount)}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteTx(t)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* CREATE TRANSACTION DIALOG */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-md" data-testid="add-transaction-dialog">
          <DialogHeader>
            <DialogTitle>Catat Transaksi</DialogTitle>
            <DialogDescription>
              Catat transaksi pengeluaran, pemasukan, atau transfer antar dompet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Type selector buttons */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted rounded-lg text-xs font-semibold">
              <button
                type="button"
                className={`py-1.5 rounded-md transition-all ${
                  txType === "expense"
                    ? "bg-rose-500 text-white shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTxType("expense")}
                data-testid="type-expense-btn"
              >
                Pengeluaran
              </button>
              <button
                type="button"
                className={`py-1.5 rounded-md transition-all ${
                  txType === "income"
                    ? "bg-emerald-600 text-white shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTxType("income")}
                data-testid="type-income-btn"
              >
                Pemasukan
              </button>
              <button
                type="button"
                className={`py-1.5 rounded-md transition-all ${
                  txType === "transfer"
                    ? "bg-blue-600 text-white shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTxType("transfer")}
                data-testid="type-transfer-btn"
              >
                Transfer
              </button>
            </div>

            <div className="space-y-1.5">
              <Label>Deskripsi / Keterangan *</Label>
              <Input
                placeholder={
                  txType === "income"
                    ? "Contoh: Gaji bulanan / Hasil jualan"
                    : txType === "transfer"
                    ? "Contoh: Pindah saldo BCA ke GoPay"
                    : "Contoh: Belanja bahan dapur mingguan"
                }
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                data-testid="tx-description-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Nominal (Rp) *</Label>
              <Input
                type="number"
                placeholder="Contoh: 150000"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                data-testid="tx-amount-input"
              />
            </div>

            {/* Wallet Selectors */}
            {walletList.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{txType === "transfer" ? "Dari Dompet" : "Dompet / Akun"}</Label>
                  <Select
                    value={form.wallet_id}
                    onValueChange={(val) => setForm({ ...form, wallet_id: val })}
                  >
                    <SelectTrigger data-testid="tx-wallet-select">
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

                {txType === "transfer" ? (
                  <div className="space-y-1.5">
                    <Label>Ke Dompet (Tujuan)</Label>
                    <Select
                      value={form.destination_wallet_id}
                      onValueChange={(val) => setForm({ ...form, destination_wallet_id: val })}
                    >
                      <SelectTrigger data-testid="tx-dest-wallet-select">
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
                ) : (
                  <div className="space-y-1.5">
                    <Label>Kategori</Label>
                    <Select
                      value={form.category}
                      onValueChange={(val) => setForm({ ...form, category: val })}
                    >
                      <SelectTrigger data-testid="tx-category-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Tanggal Transaksi</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                data-testid="tx-date-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>
              Batal
            </Button>
            <Button onClick={submitTransaction} data-testid="tx-submit-button">
              Simpan Transaksi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
