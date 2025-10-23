import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { BookOpen, MessageSquare, FileText, Sparkles } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuthStore();

  useEffect(() => {
    if (!loading && user) {
      navigate('/app');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex p-4 bg-primary rounded-2xl mb-4">
            <BookOpen className="h-12 w-12 text-primary-foreground" />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            LumenRead
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Transforme suas leituras em conhecimento consolidado com a ajuda de IA
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" onClick={() => navigate('/auth')} className="text-lg">
              Começar Agora
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/auth')} className="text-lg">
              Fazer Login
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-24 max-w-5xl mx-auto">
          <div className="bg-card border rounded-xl p-6 space-y-4">
            <div className="p-3 bg-primary/10 rounded-lg w-fit">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Chat Inteligente</h3>
            <p className="text-muted-foreground">
              Converse com a IA sobre suas leituras, registrando reflexões e insights de forma natural
            </p>
          </div>

          <div className="bg-card border rounded-xl p-6 space-y-4">
            <div className="p-3 bg-primary/10 rounded-lg w-fit">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Fichamento Automático</h3>
            <p className="text-muted-foreground">
              A IA organiza automaticamente suas anotações em um fichamento estruturado e completo
            </p>
          </div>

          <div className="bg-card border rounded-xl p-6 space-y-4">
            <div className="p-3 bg-primary/10 rounded-lg w-fit">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Quizzes & Flashcards</h3>
            <p className="text-muted-foreground">
              Gere automaticamente quizzes e flashcards para revisar e consolidar o aprendizado
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
