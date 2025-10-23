import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FileText, Loader2 } from 'lucide-react';

interface FichamentoViewProps {
  bookId: string;
}

export function FichamentoView({ bookId }: FichamentoViewProps) {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['summary', bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('summaries')
        .select('*')
        .eq('book_id', bookId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!bookId,
  });

  const { data: book } = useQuery({
    queryKey: ['book', bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!bookId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center max-w-md">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Fichamento vazio</h3>
          <p className="text-muted-foreground">
            Continue conversando no chat para que a IA possa gerar automaticamente seu fichamento estruturado.
          </p>
        </div>
      </div>
    );
  }

  const sections = [
    { title: 'Referência', content: summary.reference },
    { title: 'Tese Central', content: summary.thesis },
    { title: 'Ideias-força', content: summary.key_ideas },
    { title: 'Evidências / Citações', content: summary.citations },
    { title: 'Contra-argumentos', content: summary.counterpoints },
    { title: 'Aplicações Práticas', content: summary.applications },
    { title: 'Vocabulário', content: summary.vocabulary },
    { title: 'Bibliografia', content: summary.bibliography },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{book?.title}</CardTitle>
            <CardDescription>{book?.author}</CardDescription>
          </CardHeader>
        </Card>

        {sections.map((section, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-lg">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {section.content ? (
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {section.content}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Nenhum conteúdo ainda
                </p>
              )}
            </CardContent>
          </Card>
        ))}

        <div className="text-xs text-muted-foreground text-right">
          Última atualização: {new Date(summary.updated_at).toLocaleString('pt-BR')}
        </div>
      </div>
    </div>
  );
}
