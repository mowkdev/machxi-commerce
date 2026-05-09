/**
 * Static specifications for the demo catalog.
 * Pure data — no DB access, no side effects. Imported by `seed-demo.ts`
 * and validated by unit tests.
 *
 * Image strategy: Unsplash product photography via CDN (format param picks
 * the best codec per browser; q=80 keeps file size reasonable).
 */

export interface LanguageSpec {
  code: string;
  name: string;
  isDefault: boolean;
}

export interface CurrencySpec {
  code: string;
  name: string;
  symbol: string;
  decimalDigits: number;
  displayOrder: number;
  isDefault: boolean;
}

export interface CategorySpec {
  handle: string;
  /** Display names keyed by language code. */
  names: Record<string, string>;
  parentHandle?: string;
  rank: number;
}

export interface ProductTranslation {
  name: string;
  description: string;
}

export interface ProductSpec {
  sku: string;
  /** URL slug — shared across all locales so existing links stay valid. */
  handle: string;
  /** Translated name + description keyed by language code. */
  translations: Record<string, ProductTranslation>;
  /** Price in EUR minor units (cents). USD is derived at seeding time. */
  amount: number;
  /** Unsplash photo path, e.g. `photo-1521572163474-6864f9cf17ab`. */
  unsplashId: string;
  categoryHandles: string[];
  colors?: string[];
  sizes?: string[];
}

export interface StockLocationSpec {
  name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// LANGUAGES
// ─────────────────────────────────────────────────────────────────────────────

export const LANGUAGE_SPECS: LanguageSpec[] = [
  { code: 'en', name: 'English', isDefault: true },
  { code: 'lv', name: 'Latvian', isDefault: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// CURRENCIES
// ─────────────────────────────────────────────────────────────────────────────

export const CURRENCY_SPECS: CurrencySpec[] = [
  { code: 'EUR', name: 'Euro',                 symbol: '€', decimalDigits: 2, displayOrder: 10, isDefault: true  },
  { code: 'USD', name: 'United States Dollar', symbol: '$', decimalDigits: 2, displayOrder: 20, isDefault: false },
];

/** Approximate EUR → USD factor used to derive USD demo prices. */
export const EUR_TO_USD = 1.08;

// ─────────────────────────────────────────────────────────────────────────────
// OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

/** Option definition names keyed by option code → language code → label. */
export const OPTION_NAMES: Record<string, Record<string, string>> = {
  color: { en: 'Color',   lv: 'Krāsa'  },
  size:  { en: 'Size',    lv: 'Izmērs' },
};

/** Unsplash photo IDs for per-color swatch images shared across all products. */
export const COLOR_UNSPLASH: Record<string, string> = {
  red:      'photo-1571945153237-4929e783af4a',
  blue:     'photo-1584972191378-5f0e4dbe8baa',
  green:    'photo-1543622748-5ee7237e8565',
  black:    'photo-1624378439575-d8705ad7ae80',
  white:    'photo-1583743814966-8936f5b7be1a',
  gray:     'photo-1508830524289-0adcbe822b40',
  navy:     'photo-1608503396060-49f0df0de5e2',
  burgundy: 'photo-1598522325074-042db73aa4e6',
  tan:      'photo-1557672172-83c984aebe8c',
};

/** Color option value labels keyed by value code → language code → label. */
export const COLOR_LABELS: Record<string, Record<string, string>> = {
  red:      { en: 'Red',      lv: 'Sarkans'    },
  blue:     { en: 'Blue',     lv: 'Zils'       },
  green:    { en: 'Green',    lv: 'Zaļš'       },
  black:    { en: 'Black',    lv: 'Melns'      },
  white:    { en: 'White',    lv: 'Balts'      },
  gray:     { en: 'Gray',     lv: 'Pelēks'     },
  navy:     { en: 'Navy',     lv: 'Tumši zils' },
  burgundy: { en: 'Burgundy', lv: 'Bordo'      },
  tan:      { en: 'Tan',      lv: 'Smilšains'  },
};

/** Size option value labels keyed by value code → language code → label. */
export const SIZE_LABELS: Record<string, Record<string, string>> = {
  xs: { en: 'XS', lv: 'XS' },
  s:  { en: 'S',  lv: 'S'  },
  m:  { en: 'M',  lv: 'M'  },
  l:  { en: 'L',  lv: 'L'  },
  xl: { en: 'XL', lv: 'XL' },
};

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────

export const CATEGORY_SPECS: CategorySpec[] = [
  // Root categories
  {
    handle: 'apparel',
    names: { en: 'Apparel',      lv: 'Apģērbs'           },
    rank: 0,
  },
  {
    handle: 'accessories',
    names: { en: 'Accessories',  lv: 'Aksesuāri'         },
    rank: 1,
  },
  {
    handle: 'drinkware',
    names: { en: 'Drinkware',    lv: 'Trauki dzērieniem' },
    rank: 2,
  },
  {
    handle: 'home-living',
    names: { en: 'Home & Living',lv: 'Mājas preces'      },
    rank: 3,
  },
  {
    handle: 'stationery',
    names: { en: 'Stationery',   lv: 'Kancelejas preces' },
    rank: 4,
  },
  // Apparel children
  {
    handle: 'tshirts',
    names: { en: 'T-Shirts',              lv: 'T-krekli'   },
    parentHandle: 'apparel',
    rank: 0,
  },
  {
    handle: 'hoodies-sweats',
    names: { en: 'Hoodies & Sweatshirts', lv: 'Džemperi'   },
    parentHandle: 'apparel',
    rank: 1,
  },
  {
    handle: 'outerwear',
    names: { en: 'Outerwear',             lv: 'Virsdrēbes' },
    parentHandle: 'apparel',
    rank: 2,
  },
  {
    handle: 'bottoms',
    names: { en: 'Bottoms',               lv: 'Apakšdaļas' },
    parentHandle: 'apparel',
    rank: 3,
  },
  // Accessories children
  {
    handle: 'bags',
    names: { en: 'Bags & Totes', lv: 'Somas'    },
    parentHandle: 'accessories',
    rank: 0,
  },
  {
    handle: 'hats',
    names: { en: 'Hats & Caps',  lv: 'Cepures'  },
    parentHandle: 'accessories',
    rank: 1,
  },
  {
    handle: 'socks',
    names: { en: 'Socks',        lv: 'Zeķes'    },
    parentHandle: 'accessories',
    rank: 2,
  },
  // Drinkware children
  {
    handle: 'mugs',
    names: { en: 'Mugs',    lv: 'Krūzes'  },
    parentHandle: 'drinkware',
    rank: 0,
  },
  {
    handle: 'bottles',
    names: { en: 'Bottles', lv: 'Pudeles' },
    parentHandle: 'drinkware',
    rank: 1,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// STOCK LOCATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const STOCK_LOCATION_SPECS: StockLocationSpec[] = [
  { name: 'Main Warehouse' },
  { name: 'Retail Store' },
];

// ─────────────────────────────────────────────────────────────────────────────
// STORE SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

export interface StoreSettingsSpec {
  companyName: string;
  addressStreet: string;
  addressCity: string;
  addressZip: string;
  addressCountry: string;
  taxId: string;
  vatNumber: string;
  bankName: string;
  iban: string;
  bic: string;
  accountHolder: string;
  invoicePrefix: string;
  invoiceFooterText: string;
}

export const STORE_SETTINGS_SPEC: StoreSettingsSpec = {
  companyName: 'MachXi Demo Store',
  addressStreet: 'Brivibas iela 1',
  addressCity: 'Riga',
  addressZip: 'LV-1010',
  addressCountry: 'LV',
  taxId: 'LV40003012345',
  vatNumber: 'LV40003012345',
  bankName: 'Swedbank AS',
  iban: 'LV12HABA0551000000001',
  bic: 'HABALV22',
  accountHolder: 'MachXi Demo Store SIA',
  invoicePrefix: 'INV',
  invoiceFooterText: 'Thank you for your order! Payment is due within 14 days.',
};

// ─────────────────────────────────────────────────────────────────────────────
// SHIPPING OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface ShippingOptionSpec {
  name: string;
  /** Price in EUR minor units. */
  amount: number;
}

export const SHIPPING_OPTION_SPECS: ShippingOptionSpec[] = [
  { name: 'Standard Shipping', amount: 499 },
  { name: 'Express Shipping',  amount: 999 },
];

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────

export const PRODUCT_SPECS: ProductSpec[] = [
  // ── Simple products ──────────────────────────────────────────────────────
  {
    sku: 'SIMPLE-MUG',
    handle: 'ceramic-mug',
    translations: {
      en: {
        name: 'Ceramic Mug',
        description: 'A classic 11oz ceramic mug with a comfortable handle and vibrant print.',
      },
      lv: {
        name: 'Keramikas krūze',
        description: 'Klasisks 11oz keramikas krūze ar ērti turamu rokturi un spilgtu apdruku.',
      },
    },
    amount: 1299,
    unsplashId: 'photo-1514228742587-6b1558fcca3d',
    categoryHandles: ['drinkware', 'mugs'],
  },
  {
    sku: 'SIMPLE-ENAMEL-MUG',
    handle: 'enamel-camp-mug',
    translations: {
      en: {
        name: 'Enamel Camp Mug',
        description: 'Durable enamel mug built for the campfire. 12oz capacity, chip-resistant coating.',
      },
      lv: {
        name: 'Emaljēta kempinga krūze',
        description: 'Izturīga emaljēta krūze kempingam. 12oz tilpums, skrambu izturīgs pārklājums.',
      },
    },
    amount: 1799,
    unsplashId: 'photo-1544078751-58808863830f',
    categoryHandles: ['drinkware', 'mugs'],
  },
  {
    sku: 'SIMPLE-TOTE',
    handle: 'canvas-tote-bag',
    translations: {
      en: {
        name: 'Canvas Tote Bag',
        description: 'Heavy-duty 12oz canvas tote with reinforced stitching. 15L capacity.',
      },
      lv: {
        name: 'Auduma soma',
        description: 'Izturīga 12oz auduma soma ar pastiprinātām šuvēm. 15L tilpums.',
      },
    },
    amount: 1899,
    unsplashId: 'photo-1547949003-9792a18a2601',
    categoryHandles: ['accessories', 'bags'],
  },
  {
    sku: 'SIMPLE-DRAWSTRING',
    handle: 'drawstring-bag',
    translations: {
      en: {
        name: 'Drawstring Bag',
        description: 'Lightweight polyester drawstring bag. Perfect for gym and travel.',
      },
      lv: {
        name: 'Savilkuma soma',
        description: 'Viegla poliestera savilkuma soma. Ideāla sporta zālei un ceļojumiem.',
      },
    },
    amount: 999,
    unsplashId: 'photo-1553062407-98eeb64c6a62',
    categoryHandles: ['accessories', 'bags'],
  },
  {
    sku: 'SIMPLE-CAP',
    handle: 'classic-dad-cap',
    translations: {
      en: {
        name: 'Classic Dad Cap',
        description: 'Unstructured cotton twill cap with a pre-curved brim. One size fits most.',
      },
      lv: {
        name: 'Klasisks sporta vāciņš',
        description: 'Nestruktūrēts kokvilnas caps ar iepriekš izliektiem bortiem. Viens izmērs der lielākajai daļai.',
      },
    },
    amount: 2199,
    unsplashId: 'photo-1588850561407-ed78c282e89b',
    categoryHandles: ['accessories', 'hats'],
  },
  {
    sku: 'SIMPLE-BEANIE',
    handle: 'knit-beanie',
    translations: {
      en: {
        name: 'Knit Beanie',
        description: 'Soft acrylic knit beanie with a folded cuff. One size fits most.',
      },
      lv: {
        name: 'Adīta cepure',
        description: 'Mīksta akrila adīta cepure ar salocītu aproces daļu. Viens izmērs der lielākajai daļai.',
      },
    },
    amount: 1699,
    unsplashId: 'photo-1576871337622-98d48d1cf531',
    categoryHandles: ['accessories', 'hats'],
  },
  {
    sku: 'SIMPLE-STICKERS',
    handle: 'sticker-pack',
    translations: {
      en: {
        name: 'Sticker Pack',
        description: 'Set of 10 die-cut vinyl stickers. Weatherproof and dishwasher safe.',
      },
      lv: {
        name: 'Uzlīmju komplekts',
        description: '10 vinila uzlīmju komplekts. Izturīgs pret laika apstākļiem un trauku mazgājamā mašīnā.',
      },
    },
    amount: 499,
    unsplashId: 'photo-1606107557195-0e29a4b5b4aa',
    categoryHandles: ['home-living'],
  },
  {
    sku: 'SIMPLE-NOTEBOOK',
    handle: 'softcover-notebook-a5',
    translations: {
      en: {
        name: 'Softcover Notebook A5',
        description: '120-page ruled softcover notebook in A5. Perfect for notes, sketches, and journaling.',
      },
      lv: {
        name: 'Mīksto vāku piezīmjgrāmata A5',
        description: '120 lappušu lineēta mīksto vāku piezīmjgrāmata A5 formātā. Ideāla piezīmēm, skicēm un dienasgrāmatai.',
      },
    },
    amount: 1299,
    unsplashId: 'photo-1531346878377-a5be20888e57',
    categoryHandles: ['stationery'],
  },
  {
    sku: 'SIMPLE-LAPTOP-SLEEVE',
    handle: 'laptop-sleeve-13',
    translations: {
      en: {
        name: 'Laptop Sleeve 13"',
        description: 'Neoprene laptop sleeve fits most 13-inch laptops. Front pocket for accessories.',
      },
      lv: {
        name: 'Klēpjdatora apvalks 13"',
        description: 'Neoprēna apvalks der lielākajai daļai 13 collu datoru. Priekšpuses kabata aksesuāriem.',
      },
    },
    amount: 2999,
    unsplashId: 'photo-1587033867847-84e13b3f1a68',
    categoryHandles: ['accessories'],
  },
  {
    sku: 'SIMPLE-PHONE-CASE',
    handle: 'snap-phone-case',
    translations: {
      en: {
        name: 'Snap Phone Case',
        description: 'Hard-shell snap case with a matte finish. Compatible with latest flagship models.',
      },
      lv: {
        name: 'Tālruņa aizsargvāciņš',
        description: 'Cietā korpusa noslēgšanās vāciņš ar matētu apdari. Saderīgs ar jaunākajiem flagmaņu modeļiem.',
      },
    },
    amount: 1499,
    unsplashId: 'photo-1601784551446-20c9e07cdbdb',
    categoryHandles: ['accessories'],
  },
  // ── Variable products ────────────────────────────────────────────────────
  {
    sku: 'VAR-TEE',
    handle: 'classic-t-shirt',
    translations: {
      en: {
        name: 'Classic T-Shirt',
        description: 'Unisex 100% combed ring-spun cotton tee. Preshrunk, side-seamed, tear-away label.',
      },
      lv: {
        name: 'Klasisks T-krekls',
        description: 'Uniseksa 100% ķemmēta gredzenveidīgi vērpta kokvilna. Iepriekš samazināts, sānu šuves, noraujama etiķete.',
      },
    },
    amount: 2499,
    unsplashId: 'photo-1521572163474-6864f9cf17ab',
    categoryHandles: ['apparel', 'tshirts'],
    colors: ['red', 'blue', 'black', 'white'],
    sizes: ['s', 'm', 'l', 'xl'],
  },
  {
    sku: 'VAR-HOODIE',
    handle: 'zip-up-hoodie',
    translations: {
      en: {
        name: 'Zip-Up Hoodie',
        description: '80% cotton / 20% polyester fleece hoodie with full zip, kangaroo pockets, and rib cuffs.',
      },
      lv: {
        name: 'Rāvējslēdzēja džemperis',
        description: '80% kokvilna / 20% poliestera flīsa džemperis ar pilnu rāvējslēdzēju, kengura kabatām un ribu aprocēm.',
      },
    },
    amount: 5999,
    unsplashId: 'photo-1556821840-3a63f15732ce',
    categoryHandles: ['apparel', 'hoodies-sweats'],
    colors: ['black', 'white', 'gray'],
    sizes: ['s', 'm', 'l', 'xl'],
  },
  {
    sku: 'VAR-BOTTLE',
    handle: 'insulated-water-bottle',
    translations: {
      en: {
        name: 'Insulated Water Bottle',
        description: '500ml double-wall stainless steel bottle. Keeps drinks cold 24h, hot 12h.',
      },
      lv: {
        name: 'Siltumizolēta ūdens pudele',
        description: '500ml divsienu nerūsējošā tērauda pudele. Saglabā dzērienus aukstus 24h, karstus 12h.',
      },
    },
    amount: 3499,
    unsplashId: 'photo-1602143407151-7111542de6e8',
    categoryHandles: ['drinkware', 'bottles'],
    colors: ['red', 'green', 'blue'],
  },
  {
    sku: 'VAR-SWEATSHIRT',
    handle: 'crew-sweatshirt',
    translations: {
      en: {
        name: 'Crew Sweatshirt',
        description: 'Classic crew neck sweatshirt in 50/50 cotton-polyester blend. Pill-resistant fleece.',
      },
      lv: {
        name: 'Apaļās apkakles džemperis',
        description: 'Klasisks apaļās apkakles džemperis 50/50 kokvilnas-poliestera maisījumā. Pretbumbulīšu flīss.',
      },
    },
    amount: 4499,
    unsplashId: 'photo-1562157873-818bc0726f68',
    categoryHandles: ['apparel', 'hoodies-sweats'],
    colors: ['black', 'gray'],
    sizes: ['s', 'm', 'l', 'xl'],
  },
  {
    sku: 'VAR-JOGGERS',
    handle: 'jogger-pants',
    translations: {
      en: {
        name: 'Jogger Pants',
        description: 'French terry joggers with tapered fit, elastic waistband, and zip pockets.',
      },
      lv: {
        name: 'Sporta bikses',
        description: 'Franču frotē sporta bikses ar sašaurinātu piegriezumu, elastīgu jostas daļu un rāvējslēdzēju kabatām.',
      },
    },
    amount: 4999,
    unsplashId: 'photo-1609873814058-a8928924184a',
    categoryHandles: ['apparel', 'bottoms'],
    colors: ['black', 'gray'],
    sizes: ['s', 'm', 'l', 'xl'],
  },
  {
    sku: 'VAR-SWEATER',
    handle: 'knit-sweater',
    translations: {
      en: {
        name: 'Knit Sweater',
        description: 'Fine-knit sweater in a relaxed fit. 100% merino wool. Machine washable.',
      },
      lv: {
        name: 'Adīts džemperis',
        description: 'Smalkadīts džemperis brīvā piegriezumā. 100% merino vilna. Mazgājams mašīnā.',
      },
    },
    amount: 7999,
    unsplashId: 'photo-1434389677669-e08b4cac3105',
    categoryHandles: ['apparel', 'hoodies-sweats'],
    colors: ['navy', 'burgundy'],
    sizes: ['m', 'l', 'xl'],
  },
  {
    sku: 'VAR-JACKET',
    handle: 'windbreaker-jacket',
    translations: {
      en: {
        name: 'Windbreaker Jacket',
        description: 'Lightweight nylon windbreaker with packable hood and zippered chest pocket.',
      },
      lv: {
        name: 'Vēja jaka',
        description: 'Viegla neilona vēja jaka ar saliekamu kapuci un rāvējslēdzēja krūšu kabatu.',
      },
    },
    amount: 8999,
    unsplashId: 'photo-1544022613-e87ca75a784a',
    categoryHandles: ['apparel', 'outerwear'],
    colors: ['black', 'navy'],
    sizes: ['s', 'm', 'l', 'xl'],
  },
  {
    sku: 'VAR-SOCKS',
    handle: 'athletic-crew-socks',
    translations: {
      en: {
        name: 'Athletic Crew Socks',
        description: 'Cushioned athletic crew socks in 75% cotton / 25% spandex blend. Sold as a 3-pack.',
      },
      lv: {
        name: 'Sporta zeķes',
        description: 'Amortizētas sporta zeķes 75% kokvilna / 25% spandeks maisījumā. Pārdotas kā 3 pāru komplekts.',
      },
    },
    amount: 1299,
    unsplashId: 'photo-1586350977771-b3b0abd50c82',
    categoryHandles: ['accessories', 'socks'],
    sizes: ['s', 'm', 'l'],
  },
  {
    sku: 'VAR-BUCKET-HAT',
    handle: 'bucket-hat',
    translations: {
      en: {
        name: 'Bucket Hat',
        description: '100% cotton bucket hat with a wide brim and adjustable drawstring.',
      },
      lv: {
        name: 'Zvejnieka cepure',
        description: '100% kokvilnas zvejnieka cepure ar platu malu un regulējamu auklu.',
      },
    },
    amount: 2499,
    unsplashId: 'photo-1556306535-0f09a537f0a3',
    categoryHandles: ['accessories', 'hats'],
    colors: ['black', 'white', 'tan'],
  },
  {
    sku: 'VAR-SHORTS',
    handle: 'running-shorts',
    translations: {
      en: {
        name: 'Running Shorts',
        description: 'Lightweight 4" running shorts with liner and side pockets. Quick-dry fabric.',
      },
      lv: {
        name: 'Skriešanas šorti',
        description: 'Viegli 4 collu skriešanas šorti ar oderējumu un sānu kabatām. Ātri žūstošs audums.',
      },
    },
    amount: 3499,
    unsplashId: 'photo-1562886877-bf3b7a97bb7c',
    categoryHandles: ['apparel', 'bottoms'],
    colors: ['black', 'navy'],
    sizes: ['s', 'm', 'l', 'xl'],
  },
];
