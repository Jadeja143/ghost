import { Home, Search, MessageCircle, User, Settings, Plus } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CreatePostDialog } from './create-post-dialog';
import { MayaLogo } from './maya-logo';
import { useState } from 'react';

export function AppSidebar() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [showCreatePost, setShowCreatePost] = useState(false);

  const menuItems = [
    { title: 'Home', icon: Home, path: '/', testId: 'link-home' },
    { title: 'Search', icon: Search, path: '/search', testId: 'link-search' },
    { title: 'Messages', icon: MessageCircle, path: '/messages', testId: 'link-messages' },
    { title: 'Profile', icon: User, path: `/profile/${user?.id}`, testId: 'link-profile' },
    { title: 'Settings', icon: Settings, path: '/settings', testId: 'link-settings' },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="p-6">
        <MayaLogo />
        {user && (
          <div className="flex items-center gap-3 mt-4 p-3 rounded-lg bg-sidebar-accent">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatarUrl || undefined} />
              <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold font-mono text-sm truncate">
                {user.username}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.displayName || user.email}
              </p>
            </div>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.path)}
                    isActive={location === item.path}
                    data-testid={item.testId}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="text-primary font-semibold hidden md:flex"
                  data-testid="button-create-post-sidebar"
                >
                  <Plus className="h-5 w-5" />
                  <span>Create</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
