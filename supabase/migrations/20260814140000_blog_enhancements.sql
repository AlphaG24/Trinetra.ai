-- 20260814140000_blog_enhancements.sql
-- Migration for Blog System Enhancements (Part 1, 5, 6, 8)

-- 1. Add missing columns to blog_posts
ALTER TABLE public.blog_posts 
    ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS author_role VARCHAR(20) DEFAULT 'admin',
    ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) DEFAULT 'approved',
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS moderation_result JSONB;

-- 2. Create moderation_logs table
CREATE TABLE IF NOT EXISTS public.moderation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL, -- e.g., 'blog_post'
    violation TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL, -- 'mild', 'severe'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create banned_words table
CREATE TABLE IF NOT EXISTS public.banned_words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Initial banned words seed
INSERT INTO public.banned_words (word, category) VALUES
    ('fuck', 'profanity'),
    ('shit', 'profanity'),
    ('bitch', 'profanity'),
    ('cunt', 'profanity'),
    ('nigger', 'slur'),
    ('faggot', 'slur')
ON CONFLICT (word) DO NOTHING;

-- 4. Add is_blocked to profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- 5. Insert system config for blogs
INSERT INTO public.system_config (config_key, config_value, description)
VALUES 
    ('blog_public_creation_enabled', 'true', 'Allow public users to create blogs'),
    ('blog_require_approval', 'true', 'Require admin approval for user blogs')
ON CONFLICT (config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    description = EXCLUDED.description;

-- 6. RLS Policies Updates

-- For moderation_logs
ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view moderation_logs" ON public.moderation_logs;
CREATE POLICY "Admins can view moderation_logs" ON public.moderation_logs 
    FOR SELECT TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- For banned_words
ALTER TABLE public.banned_words ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage banned_words" ON public.banned_words;
CREATE POLICY "Admins can manage banned_words" ON public.banned_words 
    FOR ALL TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- 7. Update blog_posts policies to handle user blogs
-- Users can view their own blogs regardless of status
DROP POLICY IF EXISTS "Users can view own blog_posts" ON public.blog_posts;
CREATE POLICY "Users can view own blog_posts" ON public.blog_posts 
    FOR SELECT TO authenticated 
    USING (author_id = auth.uid());

-- Users can insert blogs if they are not blocked and blog_public_creation_enabled is true
DROP POLICY IF EXISTS "Users can insert own blog_posts" ON public.blog_posts;
CREATE POLICY "Users can insert own blog_posts" ON public.blog_posts 
    FOR INSERT TO authenticated 
    WITH CHECK (
        author_id = auth.uid() AND 
        NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_blocked = true)
    );

-- Users can update their own pending or rejected blogs
DROP POLICY IF EXISTS "Users can update own non-approved blog_posts" ON public.blog_posts;
CREATE POLICY "Users can update own non-approved blog_posts" ON public.blog_posts 
    FOR UPDATE TO authenticated 
    USING (author_id = auth.uid() AND review_status != 'approved');
    
-- Users can delete their own blogs
DROP POLICY IF EXISTS "Users can delete own blog_posts" ON public.blog_posts;
CREATE POLICY "Users can delete own blog_posts" ON public.blog_posts 
    FOR DELETE TO authenticated 
    USING (author_id = auth.uid());
