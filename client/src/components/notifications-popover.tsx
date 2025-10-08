import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { NotificationWithActor } from '@shared/schema';

export function NotificationsPopover() {
  const { data: notifications } = useQuery<NotificationWithActor[]>({
    queryKey: ['/api/notifications'],
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest('POST', `/api/notifications/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const unreadCount = notifications?.filter((n) => !n.read).length || 0;

  const getNotificationText = (notification: NotificationWithActor) => {
    switch (notification.type) {
      case 'like':
        return 'liked your post';
      case 'comment':
        return 'commented on your post';
      case 'follow':
        return 'started following you';
      default:
        return 'interacted with you';
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
        </div>
        <ScrollArea className="h-[400px]">
          {notifications && notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 flex items-start gap-3 hover-elevate cursor-pointer ${
                    !notification.read ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => {
                    if (!notification.read) {
                      markReadMutation.mutate(notification.id);
                    }
                  }}
                  data-testid={`notification-${notification.id}`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={notification.actor.avatarUrl || undefined} />
                    <AvatarFallback>
                      {notification.actor.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold font-mono">
                        {notification.actor.username}
                      </span>{' '}
                      <span className="text-muted-foreground">
                        {getNotificationText(notification)}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notification.createdAt ? formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      }) : 'Just now'}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="h-2 w-2 bg-primary rounded-full mt-2" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No notifications yet</p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
