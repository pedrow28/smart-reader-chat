import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface FichamentoViewProps {
  bookId: string;
}

export function FichamentoView({ bookId }: FichamentoViewProps) {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

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

  // Export as PDF
  const exportAsPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;
      let yPosition = margin;

      // Helper function to add text with wrapping and page breaks
      const addText = (text: string, fontSize: number, isBold: boolean = false) => {
        doc.setFontSize(fontSize);
        if (isBold) {
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setFont('helvetica', 'normal');
        }

        const lines = doc.splitTextToSize(text, maxWidth);
        
        for (const line of lines) {
          if (yPosition + 10 > pageHeight - margin) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(line, margin, yPosition);
          yPosition += fontSize / 2 + 2;
        }
      };

      // Title
      addText(`Fichamento: ${book?.title || 'Livro'}`, 18, true);
      yPosition += 5;
      
      if (book?.author) {
        addText(`Autor: ${book.author}`, 12);
        yPosition += 5;
      }

      yPosition += 10;

      // Sections
      sections.forEach((section) => {
        if (section.content) {
          // Section title
          addText(section.title, 14, true);
          yPosition += 5;

          // Section content
          addText(section.content, 11);
          yPosition += 10;
        }
      });

      // Footer
      if (yPosition + 20 > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      yPosition += 10;
      doc.setFontSize(9);
      doc.setTextColor(128);
      doc.text(`Gerado via LumenRead — ${new Date().toLocaleDateString('pt-BR')}`, margin, yPosition);

      // Save file
      const fileName = `fichamento_${book?.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'livro'}.pdf`;
      doc.save(fileName);

      toast.success('Fichamento exportado com sucesso!');
      setIsExportDialogOpen(false);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Erro ao exportar PDF');
    }
  };

  // Export as Markdown
  const exportAsMarkdown = () => {
    try {
      let markdown = `# Fichamento: ${book?.title || 'Livro'}\n\n`;
      
      if (book?.author) {
        markdown += `**Autor:** ${book.author}\n\n`;
      }

      markdown += `---\n\n`;

      sections.forEach((section) => {
        if (section.content) {
          markdown += `## ${section.title}\n\n`;
          markdown += `${section.content}\n\n`;
        }
      });

      markdown += `---\n\n`;
      markdown += `*Gerado via LumenRead — ${new Date().toLocaleDateString('pt-BR')}*\n`;

      // Create and download file
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fichamento_${book?.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'livro'}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Fichamento exportado com sucesso!');
      setIsExportDialogOpen(false);
    } catch (error) {
      console.error('Error exporting Markdown:', error);
      toast.error('Erro ao exportar Markdown');
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 border-b p-4 bg-background">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{book?.title || 'Carregando...'}</h2>
              <p className="text-sm text-muted-foreground">{book?.author}</p>
            </div>
            <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Exportar Fichamento</DialogTitle>
                  <DialogDescription>
                    Escolha o formato de exportação do seu fichamento
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-3 mt-4">
                  <Button onClick={exportAsPDF} className="gap-2">
                    <FileText className="h-4 w-4" />
                    Exportar como PDF
                  </Button>
                  <Button onClick={exportAsMarkdown} variant="outline" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Exportar como Markdown
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
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

          <div className="text-xs text-muted-foreground text-right pb-4">
            Última atualização: {new Date(summary.updated_at).toLocaleString('pt-BR')}
          </div>
        </div>
      </div>
    </div>
  );
}
