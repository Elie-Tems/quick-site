CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE INDEX IF NOT EXISTS blog_posts_business_id_idx ON blog_posts (business_id);
CREATE INDEX IF NOT EXISTS blog_posts_published_idx ON blog_posts (business_id) WHERE status = 'published';

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Owner: full access, matching the pattern used in businesses policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'blog_posts' AND policyname = 'owner_all'
  ) THEN
    CREATE POLICY "owner_all" ON blog_posts
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM businesses b
          JOIN profiles pr ON pr.id = b.owner_id
          WHERE b.id = blog_posts.business_id
            AND pr.user_id = (SELECT auth.uid())
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM businesses b
          JOIN profiles pr ON pr.id = b.owner_id
          WHERE b.id = blog_posts.business_id
            AND pr.user_id = (SELECT auth.uid())
        )
      );
  END IF;
END $$;

-- Public: only published posts of published businesses
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'blog_posts' AND policyname = 'public_read_published'
  ) THEN
    CREATE POLICY "public_read_published" ON blog_posts
      FOR SELECT
      TO anon, authenticated
      USING (
        status = 'published'
        AND business_id IN (
          SELECT id FROM businesses WHERE is_published = true
        )
      );
  END IF;
END $$;
