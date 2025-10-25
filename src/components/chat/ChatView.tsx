import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Send, Loader2, Square, Brain } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface ChatViewProps {
  bookId: string;
}

export function ChatView({ bookId }: ChatViewProps) {
  const [message, setMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [useContextMemory, setUseContextMemory] = useState(true);
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['chats', bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('book_id', bookId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!bookId,
  });

  // Auto-scroll to bottom when messages or streaming content changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Setup realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('chat-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chats',
          filter: `book_id=eq.${bookId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chats', bookId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookId, queryClient]);

  // Handle streaming chat with AI
  const handleStreamingChat = async (userMessage: string) => {
    setIsStreaming(true);
    setStreamingContent('');
    setMessage('');

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-with-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            bookId, 
            userMessage,
            useContextMemory 
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let buffer = '';
      let fichamentoUpdated = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'content') {
                console.log('Received streaming content:', parsed.content);
                setStreamingContent(prev => prev + parsed.content);
              } else if (parsed.type === 'done') {
                fichamentoUpdated = parsed.fichamentoUpdated;
              }
            } catch (e) {
              console.error('Error parsing stream data:', e);
            }
          }
        }
      }

      // Refresh messages and summary
      queryClient.invalidateQueries({ queryKey: ['chats', bookId] });
      queryClient.invalidateQueries({ queryKey: ['summary', bookId] });

      if (fichamentoUpdated) {
        toast.success('Fichamento atualizado!', {
          description: 'Confira na aba Fichamento'
        });
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast.info('Geração interrompida pelo usuário');
        queryClient.invalidateQueries({ queryKey: ['chats', bookId] });
      } else {
        console.error('Streaming error:', error);
        toast.error(error.message || 'Erro ao enviar mensagem');
      }
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
      setAbortController(null);
    }
  };

  const handleStopGeneration = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isStreaming) return;
    
    handleStreamingChat(message.trim());
  };

  return (
    <div className="flex flex-col h-full">
      {/* Memory Toggle */}
      <div className="border-b p-3 bg-muted/30">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="memory-toggle" className="text-sm cursor-pointer">
              Memória de contexto
            </Label>
          </div>
          <Switch
            id="memory-toggle"
            checked={useContextMemory}
            onCheckedChange={setUseContextMemory}
          />
        </div>
        {useContextMemory && (
          <p className="text-xs text-muted-foreground mt-1 text-center">
            💭 IA está usando contexto das últimas conversas
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div className="max-w-md">
              <h3 className="text-lg font-semibold mb-2">Comece sua conversa</h3>
              <p className="text-muted-foreground">
                Compartilhe suas reflexões, citações e insights sobre este livro. A IA ajudará você a organizar e consolidar seus aprendizados.
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-4 py-2',
                    msg.role === 'user'
                      ? 'bg-[hsl(var(--chat-user-bg))] text-foreground'
                      : 'bg-[hsl(var(--chat-assistant-bg))] border'
                  )}
                >
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Streaming message */}
            {isStreaming && streamingContent && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg px-4 py-2 bg-[hsl(var(--chat-assistant-bg))] border">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{streamingContent}</ReactMarkdown>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>IA está respondendo…</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="resize-none w-full"
            rows={3}
            disabled={isStreaming}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <div className="flex sm:flex-col gap-2">
            {isStreaming ? (
              <Button
                type="button"
                size="icon"
                variant="destructive"
                onClick={handleStopGeneration}
                className="h-full min-h-[44px] min-w-[44px]"
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!message.trim()}
                className="h-full min-h-[44px] min-w-[44px]"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
