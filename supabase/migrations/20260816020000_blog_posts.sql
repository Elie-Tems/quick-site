CREATE TABLE IF NOT EXISTS blog_posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title       text NOT NULL,
  content     text NOT NULL DEFAULT '',
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Business owner: full access to their own posts
CREATE POLICY "owner_all" ON blog_posts
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Public: read published posts only
CREATE POLICY "public_read_published" ON blog_posts
  FOR SELECT USING (status = 'published');
