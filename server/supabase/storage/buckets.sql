-- Create storage buckets for GroupSpark platform
-- Run this in your Supabase SQL editor after setting up the project

-- Create bucket for distributor documents (business licenses, verification docs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'distributor-documents',
  'distributor-documents',
  false, -- Private bucket
  50 * 1024 * 1024, -- 50MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Create bucket for receipts and invoices
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts', 
  false, -- Private bucket
  10 * 1024 * 1024, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Create bucket for generated reports and data exports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exports',
  'exports',
  false, -- Private bucket
  100 * 1024 * 1024, -- 100MB limit
  ARRAY['application/json', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for distributor-documents bucket
CREATE POLICY "Distributors can upload their own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'distributor-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Distributors can view their own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'distributor-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can view all distributor documents
CREATE POLICY "Admins can view all distributor documents"
ON storage.objects FOR ALL
USING (
  bucket_id = 'distributor-documents'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Create RLS policies for receipts bucket
CREATE POLICY "Users can upload their receipts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create RLS policies for exports bucket
CREATE POLICY "Authenticated users can access exports"
ON storage.objects FOR ALL
USING (
  bucket_id = 'exports'
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Enable RLS on storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Display created buckets
SELECT 
  id,
  name,
  public,
  file_size_limit / (1024 * 1024) as size_limit_mb,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE id IN ('distributor-documents', 'receipts', 'exports');