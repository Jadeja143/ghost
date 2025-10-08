import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Search, MoreVertical, Video, Phone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { ConversationWithDetails, MessageWithSender } from '@shared/schema';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/menu';

export default function Messages() {
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchConversations, setSearchConversations] = useState('');
  const [searchMessages, setSearchMessages] = useState('');
  const [filterDate, setFilterDate] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: conversations, isLoading: loadingConversations } = useQuery<ConversationWithDetails[]>({
    queryKey: ['/api/conversations'],
  });

  const { data: messages } = useQuery<MessageWithSender[]>({
    queryKey: ['/api/messages', selectedConversation],
    enabled: !!selectedConversation,
  });

  // Mutations
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest('POST', '/api/messages', { conversationId: selectedConversation, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages', selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setMessageText('');
    },
  });

  const muteConversationMutation = useMutation({
    mutationFn: ({ conversationId, duration }: { conversationId: string; duration: string }) =>
      apiRequest('POST', `/api/conversations/mute`, { conversationId, duration }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/conversations'] }),
  });

  const deleteConversationMutation = useMutation({
    mutationFn: (conversationId: string) =>
      apiRequest('DELETE', `/api/conversations/${conversationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setSelectedConversation(null);
    },
  });

  const blockUserMutation = useMutation({
    mutationFn: (userId: string) => apiRequest('POST', `/api/users/block`, { userId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/conversations'] }),
  });

  const toggleReadReceiptMutation = useMutation({
    mutationFn: (conversationId: string) =>
      apiRequest('POST', `/api/conversations/read-receipt-toggle`, { conversationId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/conversations'] }),
  });

  const selectedConv = useMemo(
    () => conversations?.find((c) => c.id === selectedConversation),
    [conversations, selectedConversation]
  );

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim() && selectedConversation) {
      sendMessageMutation.mutate(messageText.trim());
    }
  };

  const filteredConversations = useMemo(() => {
    return conversations?.filter((c) => {
      const otherParticipants = c.participants.filter((p) => p.id !== user?.id);
      const searchText = searchConversations.toLowerCase();
      return (
        (c.title?.toLowerCase() || '').includes(searchText) ||
        otherParticipants.some((p) => p.username.toLowerCase().includes(searchText))
      );
    });
  }, [conversations, searchConversations, user?.id]);

  const filteredMessages = useMemo(() => {
    return messages?.filter((m) => {
      const textMatch = m.content.toLowerCase().includes(searchMessages.toLowerCase());
      const dateMatch = filterDate && m.createdAt ? new Date(m.createdAt).toDateString() === new Date(filterDate).toDateString() : !filterDate;
      return textMatch && dateMatch;
    });
  }, [messages, searchMessages, filterDate]);

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Conversations List */}
      <Card className="w-full md:w-80 rounded-none md:rounded-l-lg border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations"
              className="pl-9"
              value={searchConversations}
              onChange={(e) => setSearchConversations(e.target.value)}
              data-testid="input-search-conversations"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {loadingConversations ? (
            <div className="p-4 text-center text-muted-foreground" data-testid="loading-conversations">
              Loading...
            </div>
          ) : filteredConversations && filteredConversations.length > 0 ? (
            <div className="divide-y">
              {filteredConversations.map((conversation) => {
                const otherParticipants = conversation.participants.filter(
                  (p) => p.id !== user?.id
                );
                const displayUser = otherParticipants[0];

                return (
                  <div
                    key={conversation.id}
                    className={`p-4 cursor-pointer hover-elevate relative ${
                      selectedConversation === conversation.id ? 'bg-accent' : ''
                    }`}
                    onClick={() => setSelectedConversation(conversation.id)}
                    data-testid={`conversation-${conversation.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={displayUser?.avatarUrl || undefined} />
                        <AvatarFallback>{displayUser?.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between mb-1">
                          <p className="font-semibold font-mono truncate">
                            {conversation.title || otherParticipants.map((p) => p.username).join(', ')}
                          </p>
                          {conversation.lastMessage?.createdAt && (
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(conversation.lastMessage.createdAt), { addSuffix: false })}
                            </span>
                          )}
                        </div>
                        {conversation.lastMessage && (
                          <p className="text-sm text-muted-foreground truncate">{conversation.lastMessage.content}</p>
                        )}
                        {conversation.unreadCount && conversation.unreadCount > 0 && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>

                      {/* 3-dot menu */}
                      <Menu>
                        <MenuTrigger className="absolute top-2 right-2 p-1" data-testid={`menu-trigger-conversation-${conversation.id}`}>
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </MenuTrigger>
                        <MenuContent>
                          <MenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              muteConversationMutation.mutate({ conversationId: conversation.id, duration: 'forever' });
                            }}
                            data-testid={`menu-item-mute-${conversation.id}`}
                          >
                            Mute Chat
                          </MenuItem>
                          <MenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConversationMutation.mutate(conversation.id);
                            }}
                            data-testid={`menu-item-delete-${conversation.id}`}
                          >
                            Delete Chat
                          </MenuItem>
                          <MenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              blockUserMutation.mutate(displayUser?.id || '');
                            }}
                            data-testid={`menu-item-block-${conversation.id}`}
                          >
                            Block User
                          </MenuItem>
                        </MenuContent>
                      </Menu>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground">
              <p>No conversations yet</p>
              <p className="text-sm mt-2">Start a conversation with someone</p>
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Messages View */}
      <Card className="flex-1 rounded-none md:rounded-r-lg flex flex-col">
        {selectedConversation && selectedConv ? (
          <>
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedConv.participants
                  .filter((p) => p.id !== user?.id)
                  .map((p) => (
                    <div key={p.id} className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={p.avatarUrl || undefined} />
                        <AvatarFallback>{p.username[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold font-mono">{p.username}</p>
                        {p.isOnline && <p className="text-xs text-status-online">Active now</p>}
                      </div>
                    </div>
                  ))}
              </div>

              {/* Audio/Video + 3-dot */}
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" onClick={() => alert('Start Video Call')} data-testid="button-video-call">
                  <Video className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => alert('Start Audio Call')} data-testid="button-audio-call">
                  <Phone className="w-4 h-4" />
                </Button>

                <Menu>
                  <MenuTrigger data-testid="menu-trigger-header-actions">
                    <MoreVertical className="w-4 h-4 cursor-pointer" />
                  </MenuTrigger>
                  <MenuContent>
                    <MenuItem
                      onClick={() => toggleReadReceiptMutation.mutate(selectedConversation)}
                      data-testid="menu-item-toggle-read-receipts"
                    >
                      Toggle Read Receipts
                    </MenuItem>
                    <MenuItem
                      onClick={() =>
                        muteConversationMutation.mutate({ conversationId: selectedConversation, duration: 'forever' })
                      }
                      data-testid="menu-item-mute-header"
                    >
                      Mute Chat
                    </MenuItem>
                    <MenuItem 
                      onClick={() => deleteConversationMutation.mutate(selectedConversation)}
                      data-testid="menu-item-delete-header"
                    >
                      Delete Chat
                    </MenuItem>
                    {selectedConv.participants
                      .filter((p) => p.id !== user?.id)
                      .map((p) => (
                        <MenuItem 
                          key={p.id} 
                          onClick={() => blockUserMutation.mutate(p.id)}
                          data-testid={`menu-item-block-user-${p.id}`}
                        >
                          Block {p.username}
                        </MenuItem>
                      ))}
                  </MenuContent>
                </Menu>
              </div>
            </div>

            {/* Message search */}
            <div className="p-2 border-b flex gap-2 items-center">
              <Input
                placeholder="Search messages"
                value={searchMessages}
                onChange={(e) => setSearchMessages(e.target.value)}
                className="flex-1"
                data-testid="input-search-messages"
              />
              <Input
                type="date"
                value={filterDate || ''}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-36"
                data-testid="input-filter-date"
              />
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {filteredMessages?.map((message) => {
                  const isOwn = message.senderId === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      data-testid={`message-${message.id}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          isOwn
                            ? 'bg-primary text-primary-foreground rounded-br-sm'
                            : 'bg-muted text-foreground rounded-bl-sm'
                        }`}
                      >
                        <p className="text-sm break-words">{message.content}</p>
                        <div className="flex justify-between items-center text-xs mt-1 gap-2">
                          <span className={isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}>
                            {message.createdAt
                              ? formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })
                              : 'Just now'}
                          </span>
                          {isOwn && (
                            <span className={isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}>
                              {message.readBy?.some((id) => id !== user?.id) ? '✓✓' : '✓'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
              <Input
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                data-testid="input-message"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!messageText.trim() || sendMessageMutation.isPending}
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg mb-2">Select a conversation</p>
              <p className="text-sm">Choose a conversation to start messaging</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
