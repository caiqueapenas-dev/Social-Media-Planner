"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { useClientsStore } from "@/store/useClientsStore";
import { usePostsStore } from "@/store/usePostsStore";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Users,
  LayoutDashboard,
  Settings,
  LogOut,
  Menu,
  X,
  Lightbulb,
  Star,
  Download,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

import toast from "react-hot-toast";
import { GlobalSearch } from "./global-search";

const navigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Calendário", href: "/admin/calendar", icon: Calendar },
  { name: "Clientes", href: "/admin/clients", icon: Users },
  { name: "Datas Especiais", href: "/admin/special-dates", icon: Star },
  { name: "Importar", href: "/admin/import", icon: Download },
  { name: "Insights", href: "/admin/insights", icon: Lightbulb },
  { name: "Configurações", href: "/admin/settings", icon: Settings },
];

import { User } from "@/lib/types";

function AdminLayoutContent({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: User | null;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { user, isLoading, initializeUser, setUser } = useAuthStore();
  const { setClients } = useClientsStore();
  const { setPosts } = usePostsStore();

  useEffect(() => {
    initializeUser(initialUser);
  }, [initialUser, initializeUser]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setClients([]);
    setPosts([]);
    toast.success("Logout realizado com sucesso!");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-2">
              <div className="bg-primary p-2 rounded-lg">
                <Calendar className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">SMP</span>
            </div>
            <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto p-4">
            <Button asChild className="w-full gap-2">
              <Link href="/admin/posts/new">
                <Plus className="h-4 w-4" />
                Novo Post
              </Link>
            </Button>
          </div>
          <div className="p-4 border-t space-y-2">
            {isLoading ? (
              <div className="px-3 py-2 space-y-2">
                <div className="h-4 w-3/4 rounded bg-muted animate-pulse"></div>
                <div className="h-3 w-full rounded bg-muted animate-pulse"></div>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2">
                <div className="flex-1">
                  <p className="text-sm font-medium">{user?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
            )}
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="flex items-center justify-between p-4 border-b bg-card sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1 flex justify-center lg:justify-start">
            <GlobalSearch />
          </div>
          <div className="lg:hidden flex items-center gap-2">
            <div className="bg-primary p-2 rounded-lg">
              <Calendar className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold">Social Media Planner</span>
          </div>
          <div className="w-6" />
        </header>
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export function AdminLayout({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: User | null;
}) {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <AdminLayoutContent initialUser={initialUser}>
        {children}
      </AdminLayoutContent>
    </Suspense>
  );
}
