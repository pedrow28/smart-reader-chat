import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookId, userMessage } = await req.json();
    
    if (!bookId || !userMessage) {
      throw new Error('bookId and userMessage are required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get book info
    const { data: book } = await supabaseClient
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single();

    if (!book) {
      throw new Error('Book not found');
    }

    // Get chat history
    const { data: chatHistory } = await supabaseClient
      .from('chats')
      .select('*')
      .eq('book_id', bookId)
      .order('created_at', { ascending: true })
      .limit(20);

    // Get current summary
    const { data: currentSummary } = await supabaseClient
      .from('summaries')
      .select('*')
      .eq('book_id', bookId)
      .maybeSingle();

    // Save user message
    await supabaseClient
      .from('chats')
      .insert([{ book_id: bookId, role: 'user', content: userMessage }]);

    // Prepare context for AI
    const conversationContext = chatHistory?.map(m => 
      `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`
    ).join('\n') || '';

    const summaryContext = currentSummary ? `
Fichamento atual:
- Referência: ${currentSummary.reference || 'N/A'}
- Tese Central: ${currentSummary.thesis || 'N/A'}
- Ideias-força: ${currentSummary.key_ideas || 'N/A'}
- Citações: ${currentSummary.citations || 'N/A'}
- Contra-argumentos: ${currentSummary.counterpoints || 'N/A'}
- Aplicações: ${currentSummary.applications || 'N/A'}
- Vocabulário: ${currentSummary.vocabulary || 'N/A'}
- Bibliografia: ${currentSummary.bibliography || 'N/A'}
` : 'Nenhum fichamento ainda.';

    const systemPrompt = `Você é um assistente especializado em ajudar leitores a consolidar aprendizados sobre livros.

Livro atual: "${book.title}" de ${book.author}
${book.subject ? `Assunto: ${book.subject}` : ''}

${summaryContext}

Seu trabalho é:
1. Responder de forma útil e engajadora às reflexões do usuário
2. Fazer perguntas que aprofundem o entendimento
3. Identificar informações importantes para o fichamento

Seja conversacional, empático e ajude o usuário a extrair insights valiosos do livro.`;

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Call AI with streaming enabled
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Histórico recente:\n${conversationContext}\n\nNova mensagem: ${userMessage}` }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'update_fichamento',
              description: 'Atualiza o fichamento estruturado do livro com novas informações extraídas da conversa. Use quando o usuário mencionar informações relevantes.',
              parameters: {
                type: 'object',
                properties: {
                  reference: { 
                    type: 'string',
                    description: 'Referência bibliográfica completa do livro'
                  },
                  thesis: { 
                    type: 'string',
                    description: 'Tese ou argumento central do livro'
                  },
                  key_ideas: { 
                    type: 'string',
                    description: 'Principais ideias e conceitos-chave'
                  },
                  citations: { 
                    type: 'string',
                    description: 'Citações e evidências importantes'
                  },
                  counterpoints: { 
                    type: 'string',
                    description: 'Contra-argumentos ou críticas'
                  },
                  applications: { 
                    type: 'string',
                    description: 'Aplicações práticas das ideias'
                  },
                  vocabulary: { 
                    type: 'string',
                    description: 'Termos e vocabulário importante'
                  },
                  bibliography: { 
                    type: 'string',
                    description: 'Bibliografia e referências citadas'
                  }
                },
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: 'auto',
        stream: true
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        throw new Error('Rate limit excedido. Aguarde um momento.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Créditos esgotados. Adicione créditos em Settings -> Workspace -> Usage.');
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    // Set up streaming response
    const encoder = new TextEncoder();
    let fullMessage = '';
    let toolCalls: any[] = [];

    const stream = new ReadableStream({
      async start(controller) {
        const reader = aiResponse.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        try {
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
                  const delta = parsed.choices?.[0]?.delta;

                  // Stream content tokens
                  if (delta?.content) {
                    fullMessage += delta.content;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                      type: 'content',
                      content: delta.content 
                    })}\n\n`));
                  }

                  // Collect tool calls
                  if (delta?.tool_calls) {
                    for (const toolCall of delta.tool_calls) {
                      if (!toolCalls[toolCall.index]) {
                        toolCalls[toolCall.index] = {
                          id: toolCall.id,
                          type: 'function',
                          function: { name: '', arguments: '' }
                        };
                      }
                      if (toolCall.function?.name) {
                        toolCalls[toolCall.index].function.name = toolCall.function.name;
                      }
                      if (toolCall.function?.arguments) {
                        toolCalls[toolCall.index].function.arguments += toolCall.function.arguments;
                      }
                    }
                  }
                } catch (e) {
                  console.error('Error parsing SSE data:', e);
                }
              }
            }
          }

          // Save assistant message to database
          await supabaseClient
            .from('chats')
            .insert([{ book_id: bookId, role: 'assistant', content: fullMessage }]);

          // Process tool calls (update fichamento)
          let fichamentoUpdated = false;
          if (toolCalls.length > 0) {
            for (const toolCall of toolCalls) {
              if (toolCall.function?.name === 'update_fichamento') {
                try {
                  const fichamentoUpdate = JSON.parse(toolCall.function.arguments);
                  console.log('Updating fichamento:', fichamentoUpdate);

                  // Merge with existing summary
                  const updatedSummary = {
                    book_id: bookId,
                    reference: fichamentoUpdate.reference || currentSummary?.reference || null,
                    thesis: fichamentoUpdate.thesis || currentSummary?.thesis || null,
                    key_ideas: fichamentoUpdate.key_ideas || currentSummary?.key_ideas || null,
                    citations: fichamentoUpdate.citations || currentSummary?.citations || null,
                    counterpoints: fichamentoUpdate.counterpoints || currentSummary?.counterpoints || null,
                    applications: fichamentoUpdate.applications || currentSummary?.applications || null,
                    vocabulary: fichamentoUpdate.vocabulary || currentSummary?.vocabulary || null,
                    bibliography: fichamentoUpdate.bibliography || currentSummary?.bibliography || null,
                  };

                  if (currentSummary) {
                    await supabaseClient
                      .from('summaries')
                      .update(updatedSummary)
                      .eq('book_id', bookId);
                  } else {
                    await supabaseClient
                      .from('summaries')
                      .insert([updatedSummary]);
                  }

                  fichamentoUpdated = true;
                  console.log('Fichamento updated successfully');
                } catch (error) {
                  console.error('Error updating fichamento:', error);
                }
              }
            }
          }

          // Send completion event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'done',
            fichamentoUpdated 
          })}\n\n`));

          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error: any) {
    console.error('Error in chat-with-ai:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro desconhecido' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
