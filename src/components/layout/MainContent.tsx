import { useState } from 'react';
import { useBookStore } from '@/store/bookStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, MessageSquare, FileText } from 'lucide-react';
import { ChatView } from '@/components/chat/ChatView';
import { FichamentoView } from '@/components/fichamento/FichamentoView';

interface MainContentProps {
  activeTab?: 'books' | 'chat' | 'fichamento';
}

export function MainContent({ activeTab }: MainContentProps = {}) {
  const { selectedBookId } = useBookStore();
  const [internalTab, setInternalTab] = useState<'chat' | 'fichamento'>('chat');
  
  const currentTab = activeTab || internalTab;

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
    <main className="flex-1 flex flex-col overflow-hidden">
      <Tabs 
        value={currentTab} 
        onValueChange={(value) => setInternalTab(value as 'chat' | 'fichamento')}
        className="flex-1 flex flex-col overflow-hidden"
      >
        {/* Tabs list - sempre visível e flutuante */}
        {!activeTab && (
          <div className="sticky top-0 z-40 border-b px-4 bg-background shadow-sm">
            <TabsList className="h-12">
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Chat</span>
              </TabsTrigger>
              <TabsTrigger value="fichamento" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Fichamento</span>
              </TabsTrigger>
            </TabsList>
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <TabsContent value="chat" className="h-full m-0 p-0 data-[state=active]:flex data-[state=active]:flex-col">
            <ChatView bookId={selectedBookId} />
          </TabsContent>
          <TabsContent value="fichamento" className="h-full m-0 p-0 data-[state=active]:flex data-[state=active]:flex-col">
            <FichamentoView bookId={selectedBookId} />
          </TabsContent>
        </div>
      </Tabs>
    </main>
  );
}
