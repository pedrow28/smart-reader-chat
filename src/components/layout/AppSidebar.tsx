import { useState } from 'react';
import { Plus, BookOpen, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { useBookStore } from '@/store/bookStore';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AppSidebarProps {
  onBookSelect?: () => void;
}

export function AppSidebar({ onBookSelect }: AppSidebarProps = {}) {
  const { open } = useSidebar();
  const { user } = useAuthStore();
  const { selectedBookId, setSelectedBookId } = useBookStore();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newBook, setNewBook] = useState({ title: '', author: '', subject: '' });

  const { data: books = [], isLoading } = useQuery({
    queryKey: ['books', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createBookMutation = useMutation({
    mutationFn: async (book: typeof newBook) => {
      const { data, error } = await supabase
        .from('books')
        .insert([{ ...book, user_id: user!.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      setSelectedBookId(data.id);
      setDialogOpen(false);
      setNewBook({ title: '', author: '', subject: '' });
      toast.success('Livro criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar livro');
    },
  });

  const deleteBookMutation = useMutation({
    mutationFn: async (bookId: string) => {
      const { error } = await supabase.from('books').delete().eq('id', bookId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      if (selectedBookId === deleteBookMutation.variables) {
        setSelectedBookId(null);
      }
      toast.success('Livro excluído');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir livro');
    },
  });

  const handleCreateBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBook.title || !newBook.author) {
      toast.error('Preencha título e autor');
      return;
    }
    createBookMutation.mutate(newBook);
  };

  return (
    <Sidebar className={open ? 'w-64' : 'w-14'}>
      <SidebarContent>
        <SidebarGroup>
          <div className="flex items-center justify-between px-3 py-2">
            {open && <SidebarGroupLabel>Meus Livros</SidebarGroupLabel>}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo Livro</DialogTitle>
                  <DialogDescription>
                    Adicione um novo livro à sua biblioteca
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateBook} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título *</Label>
                    <Input
                      id="title"
                      value={newBook.title}
                      onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                      placeholder="O nome do livro"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="author">Autor *</Label>
                    <Input
                      id="author"
                      value={newBook.author}
                      onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                      placeholder="Nome do autor"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Assunto</Label>
                    <Input
                      id="subject"
                      value={newBook.subject}
                      onChange={(e) => setNewBook({ ...newBook, subject: e.target.value })}
                      placeholder="Ex: Filosofia, Ciência..."
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={createBookMutation.isPending}>
                    {createBookMutation.isPending ? 'Criando...' : 'Criar Livro'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Carregando...
                </div>
              ) : books.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  {open ? 'Nenhum livro ainda' : '...'}
                </div>
              ) : (
                books.map((book) => (
                  <SidebarMenuItem key={book.id}>
                    <SidebarMenuButton
                      onClick={() => {
                        setSelectedBookId(book.id);
                        onBookSelect?.();
                      }}
                      className={cn(
                        'group',
                        selectedBookId === book.id && 'bg-accent text-accent-foreground'
                      )}
                    >
                      <BookOpen className="h-4 w-4 flex-shrink-0" />
                      {open && (
                        <>
                          <div className="flex-1 truncate">
                            <div className="truncate font-medium">{book.title}</div>
                            <div className="truncate text-xs text-muted-foreground">
                              {book.author}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Excluir este livro?')) {
                                deleteBookMutation.mutate(book.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
