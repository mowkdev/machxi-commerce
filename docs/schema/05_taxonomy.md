# Schema Module: Product Taxonomy (v2.1)

> Shared conventions are defined in `00_conventions.md`. This module relies on handle uniqueness (§12) and translation fallback (§11).

## 1. Categories
### Table: `categories`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `parent_id` | UUID | NULLABLE, FK (categories) ON DELETE RESTRICT | Self-referencing tree. NULL for root. Delete is blocked while children exist — reparent first. |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Visibility toggle. |
| `rank` | INTEGER | NOT NULL, DEFAULT 0 | Ordering within the tree. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

**Indexes:**
```sql
CREATE INDEX idx_categories_parent ON categories(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_categories_active ON categories(is_active) WHERE is_active = true;
-- Tree traversal ordered by rank (unique per parent to ensure deterministic ordering):
CREATE UNIQUE INDEX uk_categories_parent_rank ON categories(parent_id, rank) WHERE parent_id IS NOT NULL;
-- Root-level categories (NULL parent) need a separate unique index:
CREATE UNIQUE INDEX uk_categories_root_rank ON categories(rank) WHERE parent_id IS NULL;
```

### Table: `category_translations`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `category_id` | UUID | NOT NULL, FK (categories) ON DELETE CASCADE | |
| `language_code`| VARCHAR(10) | NOT NULL, FK (languages) ON DELETE RESTRICT | |
| `name` | VARCHAR | NOT NULL | Localized category name. |
| `description` | TEXT | NULLABLE | Localized description. |
| `handle` | VARCHAR | NOT NULL | SEO-friendly URL slug. Unique per language (see index). |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

**Indexes:**
```sql
CREATE INDEX idx_category_translations_category ON category_translations(category_id);
CREATE INDEX idx_category_translations_language ON category_translations(language_code);
CREATE UNIQUE INDEX uk_category_translations_handle
  ON category_translations(language_code, handle);
CREATE UNIQUE INDEX uk_category_translations_category_lang
  ON category_translations(category_id, language_code);
```

## 2. Relationships
### Table: `product_categories`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `product_id` | UUID | COMP PK, FK (products) ON DELETE CASCADE | |
| `category_id` | UUID | COMP PK, FK (categories) ON DELETE CASCADE | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:**
```sql
CREATE INDEX idx_product_categories_category ON product_categories(category_id);
```
