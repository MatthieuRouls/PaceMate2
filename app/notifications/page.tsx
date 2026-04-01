'use client';

import { useEffect, useState, useTransition } from 'react';
import { Bell, Check, CheckCheck, Users, Calendar, Star, MessageCircle } from 'lucide-react';
import { getNotifications, markNotificationRead, markAllRead, type Notification } from '@/lib/notification-actions';

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  session_join:     { icon: <Calendar className="w-4 h-4" />, color: 'bg-neon-500/15 text-neon-400' },
  session_reminder: { icon: <Calendar className="w-4 h-4" />, color: 'bg-orange-500/15 text-orange-400' },
  friend_request:   { icon: <Users className="w-4 h-4" />,    color: 'bg-blue-500/15 text-blue-400' },
  friend_accepted:  { icon: <Users className="w-4 h-4" />,    color: 'bg-purple-500/15 text-purple-400' },
  badge_earned:     { icon: <Star className="w-4 h-4" />,     color: 'bg-yellow-500/15 text-yellow-400' },
  message:          { icon: <MessageCircle className="w-4 h-4" />, color: 'bg-pink-500/15 text-pink-400' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)   return 'À l\'instant';
  if (m < 60)  return `Il y a ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'Hier' : `Il y a ${d}j`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getNotifications(50).then(res => {
      if (res.success) setNotifications(res.notifications ?? []);
      setLoading(false);
    });
  }, []);

  const handleMarkRead = (id: string) => {
    startTransition(async () => {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    });
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    });
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-dark-900 pt-24 pb-16">
      <div className="max-w-2xl mx-auto px-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-pink-500/15">
              <Bell className="w-5 h-5 text-pink-400" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-white">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-dark-400">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</p>
              )}
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-dark-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Tout marquer lu
            </button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-dark-800/60 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <Bell className="w-7 h-7 text-dark-500" />
            </div>
            <p className="text-dark-300 font-medium">Aucune notification</p>
            <p className="text-dark-500 text-sm mt-1">Les nouvelles activités apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(notif => {
              const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.message;
              return (
                <div
                  key={notif.id}
                  className={`flex items-start gap-4 px-5 py-4 rounded-2xl border transition-colors cursor-pointer ${
                    notif.is_read
                      ? 'bg-dark-800/40 border-white/6 opacity-70'
                      : 'bg-dark-800/80 border-white/10'
                  }`}
                  onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                    {cfg.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white leading-snug">{notif.title}</p>
                    {notif.body && (
                      <p className="text-sm text-dark-400 mt-0.5 truncate">{notif.body}</p>
                    )}
                    <span className="text-xs text-dark-500 mt-1 block">{timeAgo(notif.created_at)}</span>
                  </div>

                  {!notif.is_read && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="w-2 h-2 bg-pink-500 rounded-full" />
                    </div>
                  )}

                  {notif.is_read && (
                    <Check className="w-4 h-4 text-dark-600 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
