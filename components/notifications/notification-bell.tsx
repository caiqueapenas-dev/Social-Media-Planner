"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { Notification } from "@/lib/types";

export function NotificationBell() {
  const supabase = createClient();
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();

      const channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) {
      setNotifications(data);
      setHasUnread(data.some((n) => !n.is_read));
    }
  };

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    const newNotifications = notifications.map(n => n.id === id ? { ...n, is_read: true } : n);
    setNotifications(newNotifications);
    setHasUnread(newNotifications.some((n) => !n.is_read));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    
    setNotifications(notifications.map(n => ({...n, is_read: true })));
    setHasUnread(false);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-[200]">
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowDropdown(!showDropdown)}
          className="relative rounded-full hover:bg-accent"
        >
          <Bell className="h-5 w-5" />
          {hasUnread && (
            <span className="absolute top-1 right-1.5 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-background" />
          )}
        </Button>

        {showDropdown && (
          <>
            <div
              className="fixed inset-0 z-[200]"
              onClick={() => setShowDropdown(false)}
            />
            <div
              className="absolute top-full right-0 mt-2 w-80 bg-card border rounded-lg shadow-lg z-[201] max-h-96 overflow-y-auto animate-slide-down"
            >
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold">Notificações</h3>
                {hasUnread && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs px-2"
                  >
                    Marcar todas como lidas
                  </Button>
                )}
              </div>
              <div className="divide-y">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Nenhuma notificação
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 cursor-pointer hover:bg-accent/50 transition-colors ${
                        !notification.is_read ? "bg-accent/20 font-semibold" : "text-muted-foreground"
                      }`}
                      onClick={() => {
                        markAsRead(notification.id);
                        if (notification.link) {
                          window.location.href = notification.link;
                        }
                      }}
                    >
                      <p className="text-sm">{notification.title}</p>
                      <p className={`text-xs mt-1 ${!notification.is_read ? 'text-foreground' : ''}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDateTime(notification.created_at)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}