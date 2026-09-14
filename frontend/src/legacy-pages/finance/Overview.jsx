"use client";

import Link from "next/link";
import { useFamily } from "@/context/FamilyContext";
import { useResource } from "@/hooks/useResource";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatIDR } from "@/lib/format";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Wallet,
  Building,
  Landmark,
  HandCoins,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#059669",
  "#d97706",
  "#7c3aed",
  "#dc2626",
];

export default function Overview() {
  const { activeId } = useFamily();
  const { data: txs } = useResource(
    activeId ? `/families/${activeId}/transactions` : null,
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
  const { data: assets } = useResource(
    activeId ? `/families/${activeId}/assets` : null,
    [activeId]
  );

  const list = txs || [];
  const walletList = wallets || [];
  const debtList = debts || [];
  const assetList = assets || [];

  const income = list
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const expense = list
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const netCashFlow = income - expense;
  const savingsRate = income > 0 ? Math.max(0, Math.round((netCashFlow / income) * 100)) : 0;

  // Wallet balances
  const totalWalletBalance = walletList.reduce((sum, w) => {
    let b = Number(w.initial_balance || 0);
    list.forEach((t) => {
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

  // Debts and Loans
  const totalDebt = debtList
    .filter((d) => d.type === "debt" && d.status !== "paid")
    .reduce((sum, d) => sum + (Number(d.total_amount || 0) - Number(d.paid_amount || 0)), 0);

  const totalLoan = debtList
    .filter((d) => d.type === "loan" && d.status !== "paid")
    .reduce((sum, d) => sum + (Number(d.total_amount || 0) - Number(d.paid_amount || 0)), 0);

  // Total Assets
  const totalAssetsValue = assetList.reduce(
    (sum, a) => sum + Number(a.estimated_value || 0),
    0
  );

  // Net Worth: Total Wallets + Total Assets + Total Piutang - Total Hutang
  const netWorth = totalWalletBalance + totalAssetsValue + totalLoan - totalDebt;

  // Category chart
  const byCat = {};
  list
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      byCat[t.category] = (byCat[t.category] || 0) + Number(t.amount || 0);
    });
  const pieData = Object.entries(byCat).map(([name, value]) => ({ name, value }));

  // Member chart
  const byMember = {};
  list
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const name = t.member_name || "Lainnya";
      byMember[name] = (byMember[name] || 0) + Number(t.amount || 0);
    });
  const barData = Object.entries(byMember).map(([name, total]) => ({
    name: name.split(" ")[0],
    total,
  }));

  // Wallet distribution chart
  const walletBarData = walletList.map((w) => {
    let b = Number(w.initial_balance || 0);
    list.forEach((t) => {
      const amt = Number(t.amount || 0);
      const fee = Number(t.transfer_fee || 0);
      if (t.wallet_id === w.id) {
        if (t.type === "income") b += amt;
        else if (t.type === "expense") b -= amt;
        else if (t.type === "transfer") b -= amt + fee;
      }
      if (t.destination_wallet_id === w.id && t.type === "transfer") b += amt;
    });
    return { name: w.name, total: b };
  });

  return (
    <div className="space-y-6" data-testid="overview-page">
      <PageHeader
        title="Ikhtisar & Statistik Keuangan"
        description="Ringkasan arus kas, kekayaan bersih, dan pola pengeluaran keluarga."
      >
        <div className="flex items-center gap-2">
          <Link href="/finance/accounts">
            <Button variant="outline">
              <Wallet className="mr-2 h-4 w-4" />
              Dompet ({walletList.length})
            </Button>
          </Link>
          <Link href="/finance/assets">
            <Button variant="outline">
              <Building className="mr-2 h-4 w-4" />
              Aset ({assetList.length})
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* Primary KPI Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Kekayaan Bersih (Net Worth)</p>
            <p className="mt-1 text-2xl font-bold text-primary font-display" data-testid="net-worth-val">
              {formatIDR(netWorth)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Kas + Aset + Piutang - Hutang
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Total Pemasukan</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600 font-display">
              {formatIDR(income)}
            </p>
            <p className="mt-1 text-[11px] text-emerald-600 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> Arus kas masuk
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Total Pengeluaran</p>
            <p className="mt-1 text-2xl font-bold text-rose-600 font-display">
              {formatIDR(expense)}
            </p>
            <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-0.5">
              <TrendingDown className="h-3 w-3" /> Arus kas keluar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Rasio Tabungan (Savings Rate)</p>
            <p className="mt-1 text-2xl font-bold font-display">{savingsRate}%</p>
            <div className="mt-2">
              <Progress value={savingsRate} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Badges Banner */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/finance/accounts" className="block">
          <Card className="hover:border-primary/40 transition-colors p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                  <Landmark className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Saldo Dompet</p>
                  <p className="font-bold text-sm">{formatIDR(totalWalletBalance)}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Card>
        </Link>

        <Link href="/finance/assets" className="block">
          <Card className="hover:border-primary/40 transition-colors p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                  <Building className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Nilai Aset</p>
                  <p className="font-bold text-sm">{formatIDR(totalAssetsValue)}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Card>
        </Link>

        <Link href="/finance/debts" className="block">
          <Card className="hover:border-primary/40 transition-colors p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
                  <HandCoins className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sisa Hutang Keluarga</p>
                  <p className="font-bold text-sm text-rose-600">{formatIDR(totalDebt)}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Card>
        </Link>
      </div>

      {/* Visual Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pengeluaran per Kategori</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {pieData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatIDR(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-20">Belum ada data pengeluaran.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pengeluaran per Anggota Keluarga</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {barData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis
                    tickFormatter={(v) => `${v / 1000000}jt`}
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />
                  <Tooltip formatter={(v) => formatIDR(v)} />
                  <Bar dataKey="total" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-20">Belum ada data.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
