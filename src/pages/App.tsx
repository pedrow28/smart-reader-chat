import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useBookStore } from '@/store/bookStore';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { MainContent } from '@/components/layout/MainContent';
import { BottomNav } from '@/components/layout/BottomNav';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { Sheet, SheetContent } from '@/components/ui/sheet';

const AppPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuthStore();
  const { selectedBookId } = useBookStore();
  const breakpoint = useBreakpoint();
  const [mobileTab, setMobileTab] = useState<'books' | 'chat' | 'fichamento'>('books');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  
  const isMobile = breakpoint === 'mobile';

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* Desktop Sidebar */}
        {!isMobile && <AppSidebar />}
        
        {/* Mobile Sidebar via Sheet */}
        {isMobile && (
          <Sheet open={showMobileSidebar} onOpenChange={setShowMobileSidebar}>
            <SheetContent side="left" className="p-0 w-64">
              <AppSidebar onBookSelect={() => {
                setShowMobileSidebar(false);
                setMobileTab('chat');
              }} />
            </SheetContent>
          </Sheet>
        )}
        
        <div className="flex-1 flex flex-col pb-16 md:pb-0">
          <AppHeader onMenuClick={() => setShowMobileSidebar(true)} />
          
          {/* Desktop: sempre mostra MainContent */}
          {!isMobile && <MainContent />}
          
          {/* Mobile: mostra baseado na tab */}
          {isMobile && (
            <>
              {mobileTab === 'books' && (
                <div className="flex-1 overflow-auto p-4">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">
                      Toque no menu para ver seus livros
                    </p>
                  </div>
                </div>
              )}
              {(mobileTab === 'chat' || mobileTab === 'fichamento') && (
                <MainContent activeTab={mobileTab} />
              )}
            </>
          )}
        </div>
        
        {/* Bottom Navigation (Mobile only) */}
        {isMobile && (
          <BottomNav
            activeTab={mobileTab}
            onTabChange={setMobileTab}
            hasSelectedBook={!!selectedBookId}
          />
        )}
      </div>
    </SidebarProvider>
  );
};

export default AppPage;
