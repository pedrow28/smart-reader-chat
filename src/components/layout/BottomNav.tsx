import { BookOpen, MessageSquare, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  activeTab: 'books' | 'chat' | 'fichamento';
  onTabChange: (tab: 'books' | 'chat' | 'fichamento') => void;
  hasSelectedBook: boolean;
}

export function BottomNav({ activeTab, onTabChange, hasSelectedBook }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="flex items-center justify-around h-16 px-4">
        <Button
          variant="ghost"
          size="lg"
          className={cn(
            'flex flex-col items-center gap-1 h-auto py-2 flex-1',
            activeTab === 'books' && 'text-primary'
          )}
          onClick={() => onTabChange('books')}
        >
          <BookOpen className="h-5 w-5" />
          <span className="text-xs">Livros</span>
        </Button>
        
        <Button
          variant="ghost"
          size="lg"
          className={cn(
            'flex flex-col items-center gap-1 h-auto py-2 flex-1',
            activeTab === 'chat' && 'text-primary',
            !hasSelectedBook && 'opacity-50'
          )}
          onClick={() => hasSelectedBook && onTabChange('chat')}
          disabled={!hasSelectedBook}
        >
          <MessageSquare className="h-5 w-5" />
          <span className="text-xs">Chat</span>
        </Button>
        
        <Button
          variant="ghost"
          size="lg"
          className={cn(
            'flex flex-col items-center gap-1 h-auto py-2 flex-1',
            activeTab === 'fichamento' && 'text-primary',
            !hasSelectedBook && 'opacity-50'
          )}
          onClick={() => hasSelectedBook && onTabChange('fichamento')}
          disabled={!hasSelectedBook}
        >
          <FileText className="h-5 w-5" />
          <span className="text-xs">Fichamento</span>
        </Button>
      </div>
    </nav>
  );
}
