"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/theme-provider";
import { NotificationBell } from "@/components/notifications/notification-bell";
import toast from "react-hot-toast";

const navigation = [
  { name: "Dashboard", href: "/client/dashboard", icon: LayoutDashboard },
  { name: "Calendário", href: "/client/calendar", icon: Calendar },
  { name: "Insights", href: "/client/insights", icon: Lightbulb },
];

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { user, setUser, isLoading, setLoading } = useAuthStore();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .single();

        if (userData) {
          setUser(userData as any);
        }
      }
      setLoading(false);
    };

    if (!user) {
      fetchUser();
    }
  }, [supabase, setUser, setLoading, user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
    router.push("/login");
    router.refresh();
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
          <nav className="flex-1 p-4 space-y-1">
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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex-1"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="flex-1 gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="lg:hidden flex items-center justify-between p-4 border-b bg-card">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-lg">
              <Calendar className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold">Social Media Planner</span>
          </div>
          <div className="w-6" />
        </header>
        <main className="p-4 lg:p-8">
          <NotificationBell />
          {children}
        </main>
      </div>
    </div>
  );
}
