-- Create books table
CREATE TABLE public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  author text NOT NULL,
  subject text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- RLS Policies for books
CREATE POLICY "Users can view their own books"
  ON public.books FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own books"
  ON public.books FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own books"
  ON public.books FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own books"
  ON public.books FOR DELETE
  USING (auth.uid() = user_id);

-- Create chats table
CREATE TABLE public.chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chats (via book ownership)
CREATE POLICY "Users can view chats for their books"
  ON public.chats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = chats.book_id
      AND books.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create chats for their books"
  ON public.chats FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = chats.book_id
      AND books.user_id = auth.uid()
    )
  );

-- Create summaries table (fichamento)
CREATE TABLE public.summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL UNIQUE REFERENCES public.books(id) ON DELETE CASCADE,
  reference text,
  thesis text,
  key_ideas text,
  citations text,
  counterpoints text,
  applications text,
  vocabulary text,
  bibliography text,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for summaries
CREATE POLICY "Users can view summaries for their books"
  ON public.summaries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = summaries.book_id
      AND books.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create summaries for their books"
  ON public.summaries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = summaries.book_id
      AND books.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update summaries for their books"
  ON public.summaries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = summaries.book_id
      AND books.user_id = auth.uid()
    )
  );

-- Create quizzes table
CREATE TABLE public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  options jsonb,
  type text NOT NULL CHECK (type IN ('multiple_choice', 'true_false')),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quizzes
CREATE POLICY "Users can view quizzes for their books"
  ON public.quizzes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = quizzes.book_id
      AND books.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create quizzes for their books"
  ON public.quizzes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = quizzes.book_id
      AND books.user_id = auth.uid()
    )
  );

-- Create flashcards table
CREATE TABLE public.flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  front text NOT NULL,
  back text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for flashcards
CREATE POLICY "Users can view flashcards for their books"
  ON public.flashcards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = flashcards.book_id
      AND books.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create flashcards for their books"
  ON public.flashcards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = flashcards.book_id
      AND books.user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER set_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_summaries_updated_at
  BEFORE UPDATE ON public.summaries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for chats (for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.summaries;