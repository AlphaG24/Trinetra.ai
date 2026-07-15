DO $$
BEGIN
    -- 1. platform_services Table (if exists)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'platform_services') THEN
        ALTER TABLE public.platform_services ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Anyone can view platform_services" ON public.platform_services;
        CREATE POLICY "Anyone can view platform_services" ON public.platform_services 
            FOR SELECT USING (true);
        
        DROP POLICY IF EXISTS "Admins can manage platform_services" ON public.platform_services;
        CREATE POLICY "Admins can manage platform_services" ON public.platform_services 
            FOR ALL TO authenticated 
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;

    -- 2. Services Table (if exists)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'services') THEN
        ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Anyone can view services" ON public.services;
        CREATE POLICY "Anyone can view services" ON public.services 
            FOR SELECT USING (true);
        
        DROP POLICY IF EXISTS "Admins can manage services" ON public.services;
        CREATE POLICY "Admins can manage services" ON public.services 
            FOR ALL TO authenticated 
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;

    -- 3. Tools Table (if exists)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tools') THEN
        ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Anyone can view tools" ON public.tools;
        CREATE POLICY "Anyone can view tools" ON public.tools 
            FOR SELECT USING (true);
        
        DROP POLICY IF EXISTS "Admins can manage tools" ON public.tools;
        CREATE POLICY "Admins can manage tools" ON public.tools 
            FOR ALL TO authenticated 
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;

    -- 4. Blog Posts Table (if exists)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'blog_posts') THEN
        ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Anyone can view blog_posts" ON public.blog_posts;
        CREATE POLICY "Anyone can view blog_posts" ON public.blog_posts 
            FOR SELECT USING (true);
        
        DROP POLICY IF EXISTS "Admins can manage all blog_posts" ON public.blog_posts;
        CREATE POLICY "Admins can manage all blog_posts" ON public.blog_posts 
            FOR ALL TO authenticated 
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END $$;
