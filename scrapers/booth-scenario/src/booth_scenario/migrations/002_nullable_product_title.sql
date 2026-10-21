-- Listing discovery records an item ID before its title is verified from the
-- detail page, so products.title must allow NULL (unknown != empty string).
-- SQLite cannot drop NOT NULL in place; rebuild the table.
CREATE TABLE products_new (
  booth_item_id INTEGER PRIMARY KEY,
  publisher_id TEXT REFERENCES publishers(publisher_id),
  product_url TEXT NOT NULL UNIQUE,
  title TEXT,
  category_name TEXT,
  category_path TEXT,
  description_text TEXT,
  description_html TEXT,
  language TEXT,
  like_count INTEGER CHECK(like_count >= 0),
  like_count_source TEXT CHECK(like_count_source IN ('SEARCH_CARD','PRODUCT_PAGE','PUBLIC_STRUCTURED_DATA','UNAVAILABLE')),
  like_observed_at TEXT,
  listing_status TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK(listing_status IN ('AVAILABLE','SOLD_OUT','UNLISTED','UNKNOWN')),
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  detail_fetched_at TEXT,
  content_hash TEXT
);
INSERT INTO products_new SELECT * FROM products;
DROP TABLE products;
ALTER TABLE products_new RENAME TO products;
