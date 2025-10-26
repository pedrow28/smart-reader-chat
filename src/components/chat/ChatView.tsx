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
    <div className="flex flex-col h-full bg-background">
      {/* Memory Toggle - Fixed header */}
      <div className="flex-shrink-0 border-b p-3 bg-muted/20">
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

      {/* Messages - Scrollable area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center min-h-[400px] text-center">
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
                    'flex w-full py-4',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-3',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground ml-auto'
                        : 'bg-muted'
                    )}
                  >
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Streaming message - estilo ChatGPT */}
              {isStreaming && (
                <div className="flex w-full py-4 justify-start">
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-muted">
                    {streamingContent ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        <ReactMarkdown>{streamingContent}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Pensando...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Input - Fixed footer */}
      <div className="flex-shrink-0 border-t bg-background p-4">
        <div className="max-w-4xl mx-auto w-full">
          <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Envie uma mensagem..."
                className="resize-none w-full pr-12 min-h-[52px] max-h-[200px] rounded-3xl"
                rows={1}
                disabled={isStreaming}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
            </div>
            {isStreaming ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={handleStopGeneration}
                className="rounded-full h-10 w-10 flex-shrink-0"
              >
                <Square className="h-5 w-5 fill-current" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!message.trim()}
                className="rounded-full h-10 w-10 flex-shrink-0"
              >
                <Send className="h-5 w-5" />
              </Button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
