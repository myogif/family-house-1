"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FamilySwitcher } from "./FamilySwitcher";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, PieChart, ArrowLeftRight, Wallet, Target,
  BookOpen, Users, Calendar, UserCheck, MailPlus, UserPlus, History,
  CheckSquare, CalendarDays, ShoppingCart, Settings, HeartHandshake, ChefHat,
  HandCoins, Repeat, Building,
} from "lucide-react";

const GROUPS = [
  { title: "Utama", items: [{ label: "Dasbor", icon: LayoutDashboard, path: "/dashboard" }] },
  { title: "Keuangan", items: [
    { label: "Ikhtisar & Statistik", icon: PieChart, path: "/finance/overview" },
    { label: "Dompet & Rekening", icon: Wallet, path: "/finance/accounts" },
    { label: "Transaksi Harian", icon: ArrowLeftRight, path: "/finance/transactions" },
    { label: "Kalender Keuangan", icon: Calendar, path: "/finance/calendar" },
    { label: "Anggaran", icon: Target, path: "/finance/budget" },
    { label: "Target Tabungan", icon: Target, path: "/finance/goals" },
    { label: "Hutang & Piutang", icon: HandCoins, path: "/finance/debts" },
    { label: "Langganan Rutin", icon: Repeat, path: "/finance/subscriptions" },
    { label: "Aset & Kekayaan", icon: Building, path: "/finance/assets" },
  ] },
  { title: "Jurnal & Catatan", items: [
    { label: "Jurnal Saya", icon: BookOpen, path: "/journal/my" },
    { label: "Jurnal Keluarga", icon: Users, path: "/journal/family" },
    { label: "Kalender Jurnal", icon: Calendar, path: "/journal/calendar" },
  ] },
  { title: "Manajemen Keluarga", items: [
    { label: "Anggota Keluarga", icon: UserCheck, path: "/family/members" },
    { label: "Undangan", icon: MailPlus, path: "/family/invitations" },
    { label: "Permintaan Bergabung", icon: UserPlus, path: "/family/requests" },
    { label: "Log Aktivitas", icon: History, path: "/family/audit" },
  ] },
  { title: "Perencanaan", items: [
    { label: "Perencanaan Menu", icon: ChefHat, path: "/planning/meals" },
    { label: "Buku Resep", icon: BookOpen, path: "/planning/recipes" },
    { label: "Daftar Belanja", icon: ShoppingCart, path: "/planning/shopping" },
    { label: "Tugas & Jadwal", icon: CheckSquare, path: "/planning/tasks" },
    { label: "Kalender Acara", icon: CalendarDays, path: "/planning/calendar" },
  ] },
  { title: "Pengaturan", items: [{ label: "Pengaturan Keluarga", icon: Settings, path: "/settings" }] },
];

export function SidebarContent({ onNavigate }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center gap-2 px-5 pb-3 pt-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><HeartHandshake className="h-5 w-5" /></div>
        <span className="font-display text-base font-bold tracking-tight">KeluargaKita</span>
      </div>
      <div className="px-3 pb-2"><FamilySwitcher /></div>
      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-5 py-3">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <p className="px-3 pb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">{group.title}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.path || pathname.startsWith(`${item.path}/`);
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={onNavigate}
                      data-testid={`sidebar-nav-${item.path.replace(/\//g, "-").replace(/^-/, "")}`}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                      )}
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" />{item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>
    </div>
  );
}
