-- Cover image URL from the page's og:image. Only the URL is stored: the public
-- catalog shows the image hot-linked from BOOTH and never copies the file.
ALTER TABLE products ADD COLUMN cover_image_url TEXT;
