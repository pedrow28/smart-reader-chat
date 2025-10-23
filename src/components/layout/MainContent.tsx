import { useBookStore } from '@/store/bookStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, MessageSquare, FileText } from 'lucide-react';
import { ChatView } from '@/components/chat/ChatView';
import { FichamentoView } from '@/components/fichamento/FichamentoView';

export function MainContent() {
  const { selectedBookId } = useBookStore();

  if (!selectedBookId) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Nenhum livro selecionado</h2>
          <p className="text-muted-foreground">
            Selecione ou crie um livro na barra lateral para começar a registrar seus aprendizados
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-hidden">
      <Tabs defaultValue="chat" className="h-full flex flex-col">
        <div className="border-b px-4">
          <TabsList className="h-12">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="fichamento" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Fichamento
            </TabsTrigger>
          </TabsList>
        </div>
        <div className="flex-1 overflow-hidden">
          <TabsContent value="chat" className="h-full m-0 p-0">
            <ChatView bookId={selectedBookId} />
          </TabsContent>
          <TabsContent value="fichamento" className="h-full m-0 p-0">
            <FichamentoView bookId={selectedBookId} />
          </TabsContent>
        </div>
      </Tabs>
    </main>
  );
}
