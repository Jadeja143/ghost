import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { ConversationWithDetails, MessageWithSender } from '@shared/schema';

export default function Messages() {
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');

  const { data: conversations } = useQuery<ConversationWithDetails[]>({
    queryKey: ['/api/conversations'],
  });

  const { data: messages } = useQuery<MessageWithSender[]>({
    queryKey: ['/api/messages', selectedConversation],
    enabled: !!selectedConversation,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest('POST', '/api/messages', {
        conversationId: selectedConversation,
        content,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages', selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setMessageText('');
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim() && selectedConversation) {
      sendMessageMutation.mutate(messageText.trim());
    }
  };

  const selectedConv = conversations?.find((c) => c.id === selectedConversation);

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Conversations List */}
      <Card className="w-full md:w-80 rounded-none md:rounded-l-lg border-r">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages"
              className="pl-9"
              data-testid="input-search-conversations"
            />
          </div>
        </div>
        <ScrollArea className="h-[calc(100%-8rem)]">
          {conversations && conversations.length > 0 ? (
            <div className="divide-y">
              {conversations.map((conversation) => {
                const otherParticipants = conversation.participants.filter(
                  (p) => p.id !== user?.id
                );
                const displayUser = otherParticipants[0];

                return (
                  <div
                    key={conversation.id}
                    className={`p-4 cursor-pointer hover-elevate ${
                      selectedConversation === conversation.id ? 'bg-accent' : ''
                    }`}
                    onClick={() => setSelectedConversation(conversation.id)}
                    data-testid={`conversation-${conversation.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={displayUser?.avatarUrl || undefined} />
                        <AvatarFallback>
                          {displayUser?.username[0].toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between mb-1">
                          <p className="font-semibold font-mono truncate">
                            {conversation.title ||
                              otherParticipants.map((p) => p.username).join(', ')}
                          </p>
                          {conversation.lastMessage && conversation.lastMessage.createdAt && (
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(
                                new Date(conversation.lastMessage.createdAt),
                                { addSuffix: false }
                              )}
                            </span>
                          )}
                        </div>
                        {conversation.lastMessage && (
                          <p className="text-sm text-muted-foreground truncate">
                            {conversation.lastMessage.content}
                          </p>
                        )}
                        {conversation.unreadCount && conversation.unreadCount > 0 && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
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
            <div className="p-4 border-b flex items-center gap-3">
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
                      {p.isOnline && (
                        <p className="text-xs text-status-online">Active now</p>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages?.map((message) => {
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
                        <p
                          className={`text-xs mt-1 ${
                            isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}
                        >
                          {message.createdAt ? formatDistanceToNow(new Date(message.createdAt), {
                            addSuffix: true,
                          }) : 'Just now'}
                        </p>
                      </div>
                    </div>
                  );
                })}
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
