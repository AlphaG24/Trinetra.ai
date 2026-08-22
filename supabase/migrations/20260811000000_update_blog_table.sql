-- Migration to update the blog tables schema, setup proper RLS, and add indexes.

-- 1. Alter existing columns in blog_posts if they exist
DO $$
BEGIN
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='blog_posts' AND column_name='cover_image') THEN
        ALTER TABLE public.blog_posts RENAME COLUMN cover_image TO cover_image_url;
    END IF;

    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='blog_posts' AND column_name='author_avatar') THEN
        ALTER TABLE public.blog_posts RENAME COLUMN author_avatar TO author_avatar_url;
    END IF;

    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='blog_posts' AND column_name='views') THEN
        ALTER TABLE public.blog_posts RENAME COLUMN views TO view_count;
    END IF;

    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='blog_posts' AND column_name='read_time') THEN
        ALTER TABLE public.blog_posts RENAME COLUMN read_time TO read_time_minutes;
    END IF;
END $$;

-- 2. Add missing columns to blog_posts
ALTER TABLE public.blog_posts 
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS seo_title VARCHAR(255),
    ADD COLUMN IF NOT EXISTS seo_description TEXT;

-- 3. Set default values and standard data types
ALTER TABLE public.blog_posts 
    ALTER COLUMN title SET DATA TYPE VARCHAR(255),
    ALTER COLUMN slug SET DATA TYPE VARCHAR(255),
    ALTER COLUMN status SET DEFAULT 'draft',
    ALTER COLUMN view_count SET DEFAULT 0,
    ALTER COLUMN created_at SET DEFAULT now(),
    ALTER COLUMN updated_at SET DEFAULT now();

-- Ensure slug is UNIQUE
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'blog_posts_slug_key'
    ) THEN
        ALTER TABLE public.blog_posts ADD CONSTRAINT blog_posts_slug_key UNIQUE (slug);
    END IF;
END $$;

-- 4. Create indexes on blog_posts for optimized querying
CREATE INDEX IF NOT EXISTS blog_posts_slug_idx ON public.blog_posts (slug);
CREATE INDEX IF NOT EXISTS blog_posts_status_idx ON public.blog_posts (status);
CREATE INDEX IF NOT EXISTS blog_posts_category_idx ON public.blog_posts (category);
CREATE INDEX IF NOT EXISTS blog_posts_published_at_idx ON public.blog_posts (published_at);

-- 5. Create subscribers table if not exists
CREATE TABLE IF NOT EXISTS public.subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Setup Row-Level Security (RLS) policies for blog_posts
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view blog_posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Anyone can view published blog_posts" ON public.blog_posts;
CREATE POLICY "Anyone can view published blog_posts" ON public.blog_posts 
    FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "Admins can manage all blog_posts" ON public.blog_posts;
CREATE POLICY "Admins can manage all blog_posts" ON public.blog_posts 
    FOR ALL TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- 7. Setup Row-Level Security (RLS) policies for subscribers
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage subscribers" ON public.subscribers;
CREATE POLICY "Admins can manage subscribers" ON public.subscribers 
    FOR ALL TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Anyone can subscribe" ON public.subscribers;
CREATE POLICY "Anyone can subscribe" ON public.subscribers 
    FOR INSERT WITH CHECK (true);
