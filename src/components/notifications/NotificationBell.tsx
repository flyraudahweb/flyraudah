import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, Check, CheckCheck, Trash2, Info, CheckCircle, AlertTriangle, XCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link: string | null;
  created_at: string;
}

const typeIcons: Record<string, typeof Info> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

const typeColors: Record<string, string> = {
  info: "text-primary",
  success: "text-chart-2",
  warning: "text-chart-4",
  error: "text-destructive",
};

const typeBg: Record<string, string> = {
  info: "bg-primary/10",
  success: "bg-emerald-500/10",
  warning: "bg-yellow-500/10",
  error: "bg-destructive/10",
};

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
};

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Fetch notifications + subscribe to realtime
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetchNotifications = async () => {
      try {
        const { data } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);
        if (!cancelled && data) setNotifications(data as Notification[]);
      } catch {
        // Network failure — bell shows empty, will reload on reconnect
      }
    };

    fetchNotifications();

    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`notifications-realtime-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (!cancelled) {
              setNotifications((prev) => [payload.new as Notification, ...prev]);
            }
          }
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.warn("[NotificationBell] Realtime degraded:", status);
          }
        });
    } catch {
      // WebSocket failed — non-fatal
    }

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await supabase.from("notifications").update({ read: true }).eq("id", id);
    } catch { }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    } catch { }
  };

  const deleteNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await supabase.from("notifications").delete().eq("id", id);
    } catch { }
  };

  const handleClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.link) {
      setOpen(false);
      navigate(notification.link);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Shared bell button
  const BellTrigger = (
    <Button variant="ghost" size="icon" className="relative">
      <Bell className="h-4 w-4 text-muted-foreground" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Button>
  );

  // Notification list — shared between Popover and Sheet
  const NotificationList = () => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
              {unreadCount} new
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={markAllAsRead}>
            <CheckCheck className="h-3 w-3" />
            Mark all read
          </Button>
        )}
      </div>

      {/* List */}
      <ScrollArea className="flex-1 max-h-[60vh] md:max-h-80">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No notifications yet</p>
            <p className="text-xs mt-1 opacity-60">We'll notify you when something happens</p>
          </div>
        ) : (
          notifications.map((notification) => {
            const Icon = typeIcons[notification.type] || Info;
            const color = typeColors[notification.type] || "text-primary";
            const bg = typeBg[notification.type] || "bg-primary/10";
            return (
              <div key={notification.id}>
                <div
                  className={`flex gap-3 p-4 cursor-pointer hover:bg-accent/60 transition-colors ${!notification.read ? "bg-primary/5 border-l-2 border-l-primary" : ""
                    }`}
                  onClick={() => handleClick(notification)}
                >
                  {/* Icon circle */}
                  <div className={`shrink-0 w-8 h-8 rounded-full ${bg} flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-snug ${!notification.read ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>
                        {notification.title}
                      </p>
                      <div className="flex items-center gap-1 shrink-0 mt-0.5">
                        {!notification.read && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title="Mark as read"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/50 mt-1">
                      {formatTime(notification.created_at)}
                    </p>
                  </div>
                </div>
                <Separator />
              </div>
            );
          })
        )}
      </ScrollArea>
    </>
  );

  // Mobile: full-width bottom sheet
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{BellTrigger}</SheetTrigger>
        <SheetContent side="bottom" className="p-0 rounded-t-2xl max-h-[85vh] flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>Notifications</SheetTitle>
          </SheetHeader>
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>
          <NotificationList />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: compact popover
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{BellTrigger}</PopoverTrigger>
      <PopoverContent className="w-96 p-0 flex flex-col" align="end" sideOffset={8}>
        <NotificationList />
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
