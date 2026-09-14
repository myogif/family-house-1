"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useFamily } from "@/context/FamilyContext";
import { useResource } from "@/hooks/useResource";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { formatIDR, formatDate } from "@/lib/format";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  TrendingDown,
  TrendingUp,
  ArrowLeftRight,
  Plus,
} from "lucide-react";

const DOW = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export default function FinanceCalendar() {
  const { activeId } = useFamily();
  const { data: txs } = useResource(
    activeId ? `/families/${activeId}/transactions` : null,
    [activeId]
  );
  const { data: wallets } = useResource(
    activeId ? `/families/${activeId}/wallets` : null,
    [activeId]
  );

  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [selectedDayTxs, setSelectedDayTxs] = useState(null);
  const [selectedDateStr, setSelectedDateStr] = useState("");

  const list = txs || [];
  const walletList = wallets || [];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calendar matrix calculations
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        dayNumber: prevMonthDays - i,
        isCurrentMonth: false,
        dateStr: new Date(year, month - 1, prevMonthDays - i).toISOString().slice(0, 10),
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dayNumber: d,
        isCurrentMonth: true,
        dateStr,
      });
    }

    // Next month padding to fill full grid (up to 35 or 42)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        dayNumber: i,
        isCurrentMonth: false,
        dateStr: new Date(year, month + 1, i).toISOString().slice(0, 10),
      });
    }

    return days;
  }, [year, month]);

  // Aggregate daily totals map
  const dailySummaryMap = useMemo(() => {
    const map = {};
    list.forEach((t) => {
      const dateKey = t.date ? t.date.slice(0, 10) : "";
      if (!dateKey) return;
      if (!map[dateKey]) {
        map[dateKey] = { income: 0, expense: 0, items: [] };
      }
      map[dateKey].items.push(t);
      if (t.type === "income") map[dateKey].income += Number(t.amount || 0);
      else if (t.type === "expense") map[dateKey].expense += Number(t.amount || 0);
    });
    return map;
  }, [list]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const todayMonth = () => {
    const d = new Date();
    setCurrentDate(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  const handleDayClick = (dayObj) => {
    const dayData = dailySummaryMap[dayObj.dateStr] || { income: 0, expense: 0, items: [] };
    setSelectedDayTxs(dayData.items);
    setSelectedDateStr(dayObj.dateStr);
  };

  const getWalletName = (walletId) => {
    if (!walletId) return null;
    return walletList.find((w) => w.id === walletId)?.name;
  };

  return (
    <div className="space-y-6" data-testid="finance-calendar-page">
      <PageHeader
        title="Kalender Keuangan"
        description="Visualisasikan arus kas pemasukan dan pengeluaran harian keluarga secara kalender bulanan."
      >
        <div className="flex items-center gap-2">
          <Link href="/finance/transactions">
            <Button variant="outline" data-testid="goto-transactions-btn">
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              Daftar Transaksi
            </Button>
          </Link>
          <Link href="/finance/accounts">
            <Button variant="outline">
              Dompet Keluarga
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* Calendar Header Navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={prevMonth}
            data-testid="cal-prev-month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[170px] text-center text-lg font-bold font-display" data-testid="cal-month-title">
            {MONTH_NAMES[month]} {year}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={nextMonth}
            data-testid="cal-next-month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={todayMonth}
            data-testid="cal-today-btn"
          >
            Bulan Ini
          </Button>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Pemasukan</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-rose-500" />
            <span className="text-muted-foreground">Pengeluaran</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="overflow-hidden" data-testid="calendar-grid">
        <div className="grid grid-cols-7 border-b border-border bg-muted/50 text-center text-xs font-bold text-muted-foreground py-2.5">
          {DOW.map((day, i) => (
            <div key={i}>{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 divide-x divide-y divide-border bg-card">
          {calendarDays.map((dayObj, idx) => {
            const summary = dailySummaryMap[dayObj.dateStr];
            const hasIncome = summary && summary.income > 0;
            const hasExpense = summary && summary.expense > 0;
            const isToday = dayObj.dateStr === new Date().toISOString().slice(0, 10);

            return (
              <div
                key={idx}
                onClick={() => handleDayClick(dayObj)}
                className={`min-h-[90px] p-2 transition-all cursor-pointer hover:bg-muted/40 ${
                  !dayObj.isCurrentMonth
                    ? "opacity-30 bg-muted/10"
                    : isToday
                    ? "bg-primary/[0.04] ring-1 ring-inset ring-primary/40 font-semibold"
                    : ""
                }`}
                data-testid={`cal-day-${dayObj.dateStr}`}
              >
                <div className="flex items-center justify-between pb-1">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                      isToday ? "bg-primary text-primary-foreground font-bold" : "text-foreground"
                    }`}
                  >
                    {dayObj.dayNumber}
                  </span>
                  {summary && summary.items.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {summary.items.length} tx
                    </span>
                  )}
                </div>

                <div className="space-y-1 mt-1">
                  {hasIncome && (
                    <div className="rounded bg-emerald-500/10 px-1 py-0.5 text-[10px] font-bold text-emerald-600 truncate">
                      +{formatIDR(summary.income)}
                    </div>
                  )}
                  {hasExpense && (
                    <div className="rounded bg-rose-500/10 px-1 py-0.5 text-[10px] font-bold text-rose-600 truncate">
                      -{formatIDR(summary.expense)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* DAY TRANSACTION DETAILS MODAL */}
      <Dialog
        open={Boolean(selectedDayTxs)}
        onOpenChange={(open) => !open && setSelectedDayTxs(null)}
      >
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto" data-testid="day-details-dialog">
          <DialogHeader>
            <DialogTitle>Transaksi {selectedDateStr ? formatDate(selectedDateStr) : ""}</DialogTitle>
            <DialogDescription>
              Daftar transaksi yang tercatat pada tanggal ini.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {!selectedDayTxs || selectedDayTxs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Tidak ada transaksi pada tanggal ini.
              </p>
            ) : (
              <div className="divide-y divide-border rounded-lg border border-border">
                {selectedDayTxs.map((t) => {
                  const isIncome = t.type === "income";
                  const isTransfer = t.type === "transfer";
                  const srcWallet = getWalletName(t.wallet_id);

                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3 text-xs"
                      data-testid={`day-tx-${t.id}`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground text-sm">
                            {t.description}
                          </span>
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                            {t.category}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-[11px]">
                          {srcWallet && `${srcWallet} • `}
                          {t.member_name || "Anggota"}
                        </p>
                      </div>

                      <div
                        className={`text-sm font-bold font-display ${
                          isIncome
                            ? "text-emerald-600"
                            : isTransfer
                            ? "text-blue-600"
                            : "text-rose-600"
                        }`}
                      >
                        {isIncome ? "+" : isTransfer ? "⇄" : "-"}
                        {formatIDR(t.amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDayTxs(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
