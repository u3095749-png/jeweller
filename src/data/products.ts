export type MainCategory = string;

export type Subcategory =
  | 'Engagement Rings'
  | 'Wedding Rings'
  | 'Diamond Stud Earrings'
  | 'Hoop Earrings'
  | 'Choker Necklaces'
  | 'Pendant Necklaces'
  | 'Gold Bangles'
  | 'Bridal Sets'
  | string;

export type JewelleryCollection =
  | 'Royal Heritage'
  | 'Noor Bridal'
  | 'Minimalist 22K'
  | 'Polki & Kundan'
  | 'Solitaire Edit'
  | 'Sterling Archive'
  | string;

export type Model3DType =
  | 'solitaire-ring'
  | 'wedding-band'
  | 'pendant-necklace'
  | 'gold-bangle'
  | 'hoop-earrings'
  | 'signet-ring';

export interface CategoryCardItem {
  category: MainCategory;
  description: string;
  image: string;
  subcategories?: Subcategory[];
}

export interface JewelleryProduct {
  id: string;
  slug: string;
  sku: string;
  name: string;
  category: MainCategory;
  categories: MainCategory[];
  subcategory?: Subcategory;
  collection: JewelleryCollection;
  pricePkr: number;
  compareAtPricePkr?: number;
  rating: number;
  reviewCount: number;
  material: string;
  weightGrams: string;
  gemstones: string;
  availableSizes: string[];
  shortDescription: string;
  description: string;
  careNote: string;
  images: string[];
  model3dType?: Model3DType;
  default3dFinish?: 'champagne-gold' | 'white-gold' | 'sterling-silver' | 'rose-gold';
  isNewArrival: boolean;
  isBestSeller: boolean;
  popularityScore: number;
  inStock: boolean;
  stockQuantity?: number;
  lowStockThreshold?: number;
  releasedOrder: number;
}

export const MAIN_CATEGORIES: MainCategory[] = [
  'Rings',
  'Necklaces',
  'Earrings',
  'Bracelets',
  'Bangles',
  'Luxury Jewellery',
  'Gold Jewellery',
  'Diamond Jewellery',
  'Silver Jewellery',
  'Pendants',
  'Bridal Jewellery',
  "Men's Jewellery",
];

export const SUBCATEGORIES: Subcategory[] = [
  'Engagement Rings',
  'Wedding Rings',
  'Diamond Stud Earrings',
  'Hoop Earrings',
  'Choker Necklaces',
  'Pendant Necklaces',
  'Gold Bangles',
  'Bridal Sets',
];

export const COLLECTIONS: JewelleryCollection[] = [
  'Royal Heritage',
  'Noor Bridal',
  'Minimalist 22K',
  'Polki & Kundan',
  'Solitaire Edit',
  'Sterling Archive',
];

export const CATEGORY_CARDS: CategoryCardItem[] = [
  {
    category: 'Rings',
    description: 'Solitaire engagements, pavé wedding bands, and stackables.',
    image: '/src/assets/images/cat_rings_solitaire_1795173688192.jpg',
    subcategories: ['Engagement Rings', 'Wedding Rings'],
  },
  {
    category: 'Necklaces',
    description: 'Sculpted chokers, diamond rivières, and filigree collars.',
    image: '/src/assets/images/cat_necklaces_gold_1795173687371.jpg',
    subcategories: ['Choker Necklaces', 'Pendant Necklaces'],
  },
  {
    category: 'Earrings',
    description: 'Solitaire diamond studs, gold hoops, and pearl jhumkas.',
    image: '/src/assets/images/cat_earrings_jhumka_1795173687924.jpg',
    subcategories: ['Diamond Stud Earrings', 'Hoop Earrings'],
  },
  {
    category: 'Bracelets',
    description: 'Articulated diamond tennis lines and 22K sculpted cuffs.',
    image: '/src/assets/images/cat_bracelets_chain_1795173686866.jpg',
  },
  {
    category: 'Bangles',
    description: 'Hinged heirloom gold karas with concealed safety clasps.',
    image: '/src/assets/images/cat_bangles_kara_1795173688625.jpg',
    subcategories: ['Gold Bangles'],
  },
  {
    category: 'Luxury Jewellery',
    description: 'High-jewellery collector commissions and one-of-a-kind works.',
    image: '/src/assets/images/hero_luxury_jewellery_1795173687556.jpg',
  },
  {
    category: 'Gold Jewellery',
    description: 'Hallmarked 22K & 18K hand-forged yellow gold silhouettes.',
    image: '/src/assets/images/cat_wedding_bands_1795174246552.jpg',
    subcategories: ['Choker Necklaces', 'Gold Bangles'],
  },
  {
    category: 'Diamond Jewellery',
    description: 'Certified VVS brilliant-cut solitaires, studs, and tennis lines.',
    image: '/src/assets/images/cat_diamond_necklace_render_1795174246914.jpg',
    subcategories: ['Engagement Rings', 'Diamond Stud Earrings'],
  },
  {
    category: 'Silver Jewellery',
    description: 'Architectural 925 sterling silver hoops and polished link chains.',
    image: '/src/assets/images/cat_silver_jewellery_render_1795174246954.jpg',
    subcategories: ['Hoop Earrings'],
  },
  {
    category: 'Pendants',
    description: 'Natural Swat Valley emeralds and filigree sovereign medallions.',
    image: '/src/assets/images/cat_pendants_emerald_1795173687582.jpg',
    subcategories: ['Pendant Necklaces'],
  },
  {
    category: 'Bridal Jewellery',
    description: 'Hand-set Polki Kundan collars, jhumars, and full bridal sets.',
    image: '/src/assets/images/cat_bridal_polki_1795173686381.jpg',
    subcategories: ['Bridal Sets'],
  },
  {
    category: "Men's Jewellery",
    description: 'Brushed 18K gold signet rings, black onyx, and curb links.',
    image: '/src/assets/images/cat_mens_jewellery_render_1795174247389.jpg',
  },
];

export const FEATURED_COLLECTIONS: Array<{
  collection: JewelleryCollection;
  tagline: string;
  image: string;
}> = [
  {
    collection: 'Solitaire Edit',
    tagline: 'Precision-cut VVS diamonds and clean architectural mounts.',
    image: '/src/assets/images/cat_rings_solitaire_1795173688192.jpg',
  },
  {
    collection: 'Noor Bridal',
    tagline: 'Heirloom Polki Kundan and freshwater pearl bridal sets.',
    image: '/src/assets/images/cat_bridal_polki_1795173686381.jpg',
  },
  {
    collection: 'Royal Heritage',
    tagline: 'Mughal filigree, hand-chiseled karas, and Swat emeralds.',
    image: '/src/assets/images/cat_bangles_kara_1795173688625.jpg',
  },
  {
    collection: 'Sterling Archive',
    tagline: 'Contemporary 925 sterling silver crafted for daily poise.',
    image: '/src/assets/images/cat_silver_jewellery_render_1795174246954.jpg',
  },
];

export const TESTIMONIALS: Array<{
  id: string;
  quote: string;
  author: string;
  city: string;
  piece: string;
}> = [
  {
    id: 't-1',
    quote:
      'We ordered the Mehr Uncut Polki Set for my sister’s walima in Lahore. The gold finish and pearl balance matched the studio photographs down to the finest detail, and the WhatsApp video sizing session made fitting effortless.',
    author: 'Maham Tariq',
    city: 'Gulberg, Lahore',
    piece: 'Mehr Uncut Polki Collar Set',
  },
  {
    id: 't-2',
    quote:
      'Inspecting the Ayra Solitaire Ring in 3D before ordering gave me complete confidence in the prong profile. Insured courier delivery arrived in Islamabad within 48 hours with full hallmark certification.',
    author: 'Hamza Siddiqui',
    city: 'F-7, Islamabad',
    piece: 'Ayra Oval Solitaire Ring',
  },
  {
    id: 't-3',
    quote:
      'The Noor Engraved Kara Pair sits comfortably all day thanks to the concealed hinge. Their champagne gold tone is rich without feeling overly yellow—truly international craftsmanship.',
    author: 'Sana Raza',
    city: 'Clifton, Karachi',
    piece: 'Noor Engraved Diamond Kara Pair',
  },
];

/**
 * Editable Jewellery Product Catalog (Prices in PKR)
 * --------------------------------------------------
 * `compareAtPricePkr` is ONLY set where an authentic price reduction applies.
 * `model3dType` is ONLY set on pieces with a real interactive Three.js 3D model.
 */
export const PRODUCTS: JewelleryProduct[] = [
  {
    id: 'za-002',
    slug: 'ayra-oval-solitaire-ring',
    sku: 'ZA-RNG-204',
    name: 'Ayra Oval Solitaire Ring',
    category: 'Rings',
    categories: ['Rings', 'Diamond Jewellery', 'Gold Jewellery'],
    subcategory: 'Engagement Rings',
    collection: 'Solitaire Edit',
    pricePkr: 148000,
    rating: 4.9,
    reviewCount: 42,
    material: '22K Solid Yellow Gold',
    weightGrams: '4.6 g',
    gemstones: '0.85 ct VVS1 Oval Brilliant Diamond',
    availableSizes: ['10', '12', '14', '16', '18'],
    shortDescription: 'Low-profile four-prong oval solitaire set on a softly tapered 22K gold band.',
    description:
      'Engineered to maximize light return while resting comfortably for daily wear, the Ayra Solitaire celebrates clean architectural proportions in warm 22K yellow gold.',
    careNote: 'Clean gently with warm water, mild soap, and a soft-bristle brush.',
    images: [
      '/src/assets/images/cat_rings_solitaire_1795173688192.jpg',
      '/src/assets/images/atelier_craftsmanship_1795173687131.jpg',
    ],
    model3dType: 'solitaire-ring',
    default3dFinish: 'champagne-gold',
    isNewArrival: true,
    isBestSeller: true,
    popularityScore: 98,
    inStock: true,
    releasedOrder: 16,
  },
  {
    id: 'za-001',
    slug: 'mehr-polki-collar-set',
    sku: 'ZA-BRD-101',
    name: 'Mehr Uncut Polki Bridal Set',
    category: 'Bridal Jewellery',
    categories: ['Bridal Jewellery', 'Gold Jewellery', 'Luxury Jewellery', 'Necklaces'],
    subcategory: 'Bridal Sets',
    collection: 'Noor Bridal',
    pricePkr: 345000,
    rating: 5.0,
    reviewCount: 31,
    material: '22K Hallmarked Yellow Gold with Sterling Silver Foil',
    weightGrams: '68.4 g',
    gemstones: 'Uncut Syndicate Polki & Freshwater Pearls',
    availableSizes: ['Standard Collar (Adjustable Dori)', 'Custom Neck Fit'],
    shortDescription: 'Hand-set uncut Polki bridal collar accompanied by matching chandbali drops and tikka.',
    description:
      'Crafted over 140 hours by master karigars in our Lahore atelier, the Mehr Collar pairs traditional kundan-foil framing with luminous pearl droplets for nikah and walima ensembles.',
    careNote: 'Store wrapped in acid-free muslin away from perfume and moisture.',
    images: [
      '/src/assets/images/cat_bridal_polki_1795173686381.jpg',
      '/src/assets/images/hero_luxury_jewellery_1795173687556.jpg',
    ],
    isNewArrival: true,
    isBestSeller: true,
    popularityScore: 99,
    inStock: true,
    releasedOrder: 15,
  },
  {
    id: 'za-015',
    slug: 'celeste-diamond-riviere-necklace',
    sku: 'ZA-DIA-901',
    name: 'Celeste Graduated Diamond Necklace',
    category: 'Diamond Jewellery',
    categories: ['Diamond Jewellery', 'Necklaces', 'Luxury Jewellery'],
    subcategory: 'Choker Necklaces',
    collection: 'Solitaire Edit',
    pricePkr: 465000,
    compareAtPricePkr: 515000,
    rating: 4.9,
    reviewCount: 19,
    material: '18K White Gold & Platinum Clasp',
    weightGrams: '29.2 g',
    gemstones: '11.40 ctw Graduated Round Brilliant VVS-EF Diamonds',
    availableSizes: ['16 inches', '17.5 inches'],
    shortDescription: 'Graduated round brilliant diamonds articulated in four-prong platinum baskets.',
    description:
      'Designed with fluid link articulation so every stone sits flush against the collarbone, delivering uninterrupted fire under both candlelight and daylight.',
    careNote: 'Clean with non-abrasive diamond solution; store flat in velvet case.',
    images: [
      '/src/assets/images/cat_diamond_necklace_render_1795174246914.jpg',
    ],
    isNewArrival: true,
    isBestSeller: true,
    popularityScore: 97,
    inStock: true,
    releasedOrder: 18,
  },
  {
    id: 'za-016',
    slug: 'noor-pave-wedding-bands',
    sku: 'ZA-RNG-225',
    name: 'Noor Pavé & Brushed Wedding Bands',
    category: 'Rings',
    categories: ['Rings', 'Gold Jewellery', 'Diamond Jewellery'],
    subcategory: 'Wedding Rings',
    collection: 'Solitaire Edit',
    pricePkr: 118000,
    compareAtPricePkr: 132000,
    rating: 4.8,
    reviewCount: 27,
    material: '22K Champagne Gold',
    weightGrams: '8.4 g (Matched Pair)',
    gemstones: '0.55 ctw Micro-Pavé VS Diamonds',
    availableSizes: ['10 / 16', '12 / 18', '14 / 20', 'Custom Pair'],
    shortDescription: 'Interlocking comfort-fit 22K gold wedding bands with hand-set diamond eternity rim.',
    description:
      'Crafted as a harmonious couple pairing—one full micro-pavé diamond eternity band paired with a satin-brushed comfort band accented by a discreet diamond bridge.',
    careNote: 'Remove during heavy gym activity; polish with soft chamois.',
    images: [
      '/src/assets/images/cat_wedding_bands_1795174246552.jpg',
    ],
    model3dType: 'wedding-band',
    default3dFinish: 'champagne-gold',
    isNewArrival: true,
    isBestSeller: false,
    popularityScore: 91,
    inStock: true,
    releasedOrder: 17,
  },
  {
    id: 'za-007',
    slug: 'zarin-swat-emerald-pendant',
    sku: 'ZA-PND-703',
    name: 'Zarin Swat Emerald Pendant',
    category: 'Pendants',
    categories: ['Pendants', 'Gold Jewellery', 'Luxury Jewellery', 'Necklaces'],
    subcategory: 'Pendant Necklaces',
    collection: 'Royal Heritage',
    pricePkr: 96000,
    rating: 4.9,
    reviewCount: 36,
    material: '22K Yellow Gold with 18" Box Chain',
    weightGrams: '7.8 g',
    gemstones: '1.60 ct Natural Swat Valley Oval Emerald',
    availableSizes: ['16 inches', '18 inches', '20 inches'],
    shortDescription: 'Vibrant Pakistani Swat emerald framed inside a hand-pierced 22K gold rosette.',
    description:
      'Celebrating Pakistan’s finest gemstone heritage, the Zarin Pendant showcases an intensely saturated natural Swat emerald secured in a scalloped filigree bezel.',
    careNote: 'Never clean natural emeralds in ultrasonic baths; wipe softly.',
    images: [
      '/src/assets/images/cat_pendants_emerald_1795173687582.jpg',
    ],
    model3dType: 'pendant-necklace',
    default3dFinish: 'champagne-gold',
    isNewArrival: true,
    isBestSeller: true,
    popularityScore: 95,
    inStock: true,
    releasedOrder: 14,
  },
  {
    id: 'za-006',
    slug: 'noor-engraved-kara-pair',
    sku: 'ZA-BNG-601',
    name: 'Noor Engraved Diamond Kara Pair',
    category: 'Bangles',
    categories: ['Bangles', 'Gold Jewellery', 'Diamond Jewellery'],
    subcategory: 'Gold Bangles',
    collection: 'Royal Heritage',
    pricePkr: 215000,
    rating: 4.9,
    reviewCount: 24,
    material: '22K Solid Yellow Gold',
    weightGrams: '32.0 g (Pair)',
    gemstones: 'Flush-set Champagne & White Melee Diamonds',
    availableSizes: ['2.2', '2.4', '2.6', '2.8'],
    shortDescription: 'Hand-chiseled floral scrollwork karas accented with flush-set champagne diamonds.',
    description:
      'Equipped with discreet concealed hinges and double safety clasps, this pair of heritage karas brings heirloom artistry to modern daily wear.',
    careNote: 'Check clasp click securely before wear; store individually.',
    images: [
      '/src/assets/images/cat_bangles_kara_1795173688625.jpg',
    ],
    model3dType: 'gold-bangle',
    default3dFinish: 'champagne-gold',
    isNewArrival: true,
    isBestSeller: true,
    popularityScore: 93,
    inStock: true,
    releasedOrder: 13,
  },
  {
    id: 'za-017',
    slug: 'lumiere-diamond-studs-hoops',
    sku: 'ZA-EAR-425',
    name: 'Lumière Solitaire Diamond Studs',
    category: 'Earrings',
    categories: ['Earrings', 'Diamond Jewellery'],
    subcategory: 'Diamond Stud Earrings',
    collection: 'Solitaire Edit',
    pricePkr: 138000,
    rating: 4.8,
    reviewCount: 33,
    material: '18K White Gold',
    weightGrams: '3.8 g',
    gemstones: '1.20 ctw Matched Round Brilliant VVS2 Diamonds',
    availableSizes: ['Screw-Back Post', 'La Poussette Push Back'],
    shortDescription: 'Four-prong gallery-set solitaire diamond studs engineered for maximum light dispersion.',
    description:
      'Each diamond is hand-matched for cut symmetry and colour grade, mounted in minimal 18K white gold baskets so only light meets the eye.',
    careNote: 'Inspect screw backs weekly; clean gently with warm water.',
    images: [
      '/src/assets/images/cat_diamond_stud_hoops_1795174247335.jpg',
    ],
    model3dType: 'hoop-earrings',
    default3dFinish: 'white-gold',
    isNewArrival: true,
    isBestSeller: false,
    popularityScore: 90,
    inStock: true,
    releasedOrder: 16,
  },
  {
    id: 'za-018',
    slug: 'verona-sterling-hoop-bracelet-set',
    sku: 'ZA-SLV-810',
    name: 'Verona 925 Sterling Hoops & Link Set',
    category: 'Silver Jewellery',
    categories: ['Silver Jewellery', 'Earrings', 'Bracelets'],
    subcategory: 'Hoop Earrings',
    collection: 'Sterling Archive',
    pricePkr: 24500,
    compareAtPricePkr: 28500,
    rating: 4.7,
    reviewCount: 45,
    material: 'Hallmarked 925 Sterling Silver with Rhodium Anti-Tarnish',
    weightGrams: '28.5 g',
    gemstones: 'Mirror-lapped Sterling Silver',
    availableSizes: ['18mm Hoops · 7.5" Bracelet', '18mm Hoops · 8.0" Bracelet'],
    shortDescription: 'Faceted 925 sterling silver huggie hoops paired with an Italian-cut curb bracelet.',
    description:
      'Forged in solid 925 sterling silver and finished with rhodium protection to preserve bright mirror reflections for effortless everyday wear.',
    careNote: 'Store inside anti-tarnish pouch provided.',
    images: [
      '/src/assets/images/cat_silver_jewellery_render_1795174246954.jpg',
    ],
    model3dType: 'hoop-earrings',
    default3dFinish: 'sterling-silver',
    isNewArrival: false,
    isBestSeller: true,
    popularityScore: 87,
    inStock: true,
    releasedOrder: 12,
  },
  {
    id: 'za-019',
    slug: 'sovereign-onyx-mens-signet',
    sku: 'ZA-MEN-301',
    name: 'Sovereign Onyx & 18K Gold Signet Ring',
    category: "Men's Jewellery",
    categories: ["Men's Jewellery", 'Rings', 'Gold Jewellery'],
    collection: 'Minimalist 22K',
    pricePkr: 134000,
    rating: 4.9,
    reviewCount: 16,
    material: '18K Brushed Champagne Gold',
    weightGrams: '12.8 g',
    gemstones: 'Hand-Cut Matte Black Onyx Cushion',
    availableSizes: ['18', '20', '22', '24'],
    shortDescription: 'Architectural cushion signet ring in satin-brushed 18K gold with bezel-set black onyx.',
    description:
      'Designed with substantial wrist-and-hand weight and a silky comfort interior, pairing brushed 18K champagne gold with deep mirror-polished black onyx.',
    careNote: 'Wipe onyx face with soft lint-free cloth.',
    images: [
      '/src/assets/images/cat_mens_jewellery_render_1795174247389.jpg',
    ],
    model3dType: 'signet-ring',
    default3dFinish: 'champagne-gold',
    isNewArrival: true,
    isBestSeller: false,
    popularityScore: 88,
    inStock: true,
    releasedOrder: 17,
  },
  {
    id: 'za-003',
    slug: 'shahi-filigree-medallion-necklace',
    sku: 'ZA-NCK-308',
    name: 'Shahi Filigree Medallion Necklace',
    category: 'Necklaces',
    categories: ['Necklaces', 'Gold Jewellery'],
    subcategory: 'Choker Necklaces',
    collection: 'Royal Heritage',
    pricePkr: 192000,
    rating: 4.8,
    reviewCount: 22,
    material: '22K Solid Brushed Yellow Gold',
    weightGrams: '26.8 g',
    gemstones: 'Hand-granulated pure goldwork',
    availableSizes: ['16 inches', '18 inches'],
    shortDescription: 'Nine articulated 22K gold filigree discs linked along a hand-soldered oval chain.',
    description:
      'Drawing on Mughal jaali lattice geometry, each medallion is pierced and coiled by hand in pure 22K gold, creating effortless drape against silk or linen.',
    careNote: 'Lay flat inside velvet-lined box to preserve filigree links.',
    images: [
      '/src/assets/images/cat_necklaces_gold_1795173687371.jpg',
      '/src/assets/images/atelier_craftsmanship_1795173687131.jpg',
    ],
    isNewArrival: false,
    isBestSeller: true,
    popularityScore: 94,
    inStock: true,
    releasedOrder: 10,
  },
  {
    id: 'za-004',
    slug: 'gulbahar-tiered-jhumka-earrings',
    sku: 'ZA-EAR-412',
    name: 'Gulbahar Tiered Pearl Jhumkas',
    category: 'Earrings',
    categories: ['Earrings', 'Gold Jewellery', 'Bridal Jewellery'],
    collection: 'Royal Heritage',
    pricePkr: 84500,
    rating: 4.9,
    reviewCount: 38,
    material: '22K Yellow Gold',
    weightGrams: '14.2 g',
    gemstones: 'Seed Freshwater Pearls',
    availableSizes: ['Standard Post & Screw Back'],
    shortDescription: 'Triple-bell 22K gold jhumkas fringed with hand-strung ivory freshwater pearls.',
    description:
      'Balanced for all-evening comfort despite their statement silhouette, the Gulbahar Jhumkas feature floral stud tops and delicate micro-granulation across every dome.',
    careNote: 'Wipe gently with a dry chamois cloth after wearing.',
    images: [
      '/src/assets/images/cat_earrings_jhumka_1795173687924.jpg',
    ],
    isNewArrival: false,
    isBestSeller: true,
    popularityScore: 92,
    inStock: true,
    releasedOrder: 9,
  },
  {
    id: 'za-005',
    slug: 'zayna-sculpted-gold-cuff',
    sku: 'ZA-BRC-502',
    name: 'Zayna Sculpted Cuff & Tennis Line',
    category: 'Bracelets',
    categories: ['Bracelets', 'Gold Jewellery', 'Diamond Jewellery'],
    collection: 'Minimalist 22K',
    pricePkr: 112000,
    rating: 4.8,
    reviewCount: 29,
    material: '22K Solid Yellow Gold',
    weightGrams: '16.5 g',
    gemstones: 'High-polish mirror finish gold',
    availableSizes: ['Small (2.2)', 'Medium (2.4)', 'Large (2.6)'],
    shortDescription: 'Fluid, open-ended wrist cuff forged from solid 22K gold with rounded comfort edges.',
    description:
      'Designed as an everyday heirloom, the Zayna Cuff pairs effortlessly with a classic timepiece or layers cleanly beside diamond tennis bracelets.',
    careNote: 'Avoid harsh abrasives; polish lightly with a soft gold cloth.',
    images: [
      '/src/assets/images/cat_bracelets_chain_1795173686866.jpg',
    ],
    isNewArrival: false,
    isBestSeller: true,
    popularityScore: 89,
    inStock: true,
    releasedOrder: 8,
  },
  {
    id: 'za-008',
    slug: 'maharani-jadau-hasli-choker',
    sku: 'ZA-LUX-801',
    name: 'Maharani Jadau Heritage Choker',
    category: 'Luxury Jewellery',
    categories: ['Luxury Jewellery', 'Bridal Jewellery', 'Necklaces', 'Gold Jewellery'],
    subcategory: 'Choker Necklaces',
    collection: 'Polki & Kundan',
    pricePkr: 285000,
    rating: 5.0,
    reviewCount: 18,
    material: '22K Yellow Gold & Hand-Painted Meenakari Reverse',
    weightGrams: '54.0 g',
    gemstones: 'Uncut Polki Diamonds & Micro-Granulated Gold Beads',
    availableSizes: ['Adjustable Silk Tassel Fit'],
    shortDescription: 'Architectural teardrop Polki choker finished with heirloom granulation along every scallop.',
    description:
      'One of our signature Luxury Jewellery commissions, the Maharani Choker balances sculptural presence with supple articulation so it contours gracefully around the neck.',
    careNote: 'Store flat in silk-lined travel vault provided with purchase.',
    images: [
      '/src/assets/images/hero_luxury_jewellery_1795173687556.jpg',
      '/src/assets/images/cat_bridal_polki_1795173686381.jpg',
    ],
    isNewArrival: false,
    isBestSeller: true,
    popularityScore: 96,
    inStock: true,
    releasedOrder: 11,
  },
  {
    id: 'za-012',
    slug: 'firdous-bridal-polki-suite',
    sku: 'ZA-BRD-115',
    name: 'Firdous Full Bridal Polki Suite',
    category: 'Bridal Jewellery',
    categories: ['Bridal Jewellery', 'Luxury Jewellery', 'Gold Jewellery'],
    subcategory: 'Bridal Sets',
    collection: 'Noor Bridal',
    pricePkr: 425000,
    rating: 4.9,
    reviewCount: 14,
    material: '22K Yellow Gold & Pure Silver Kundan Setting',
    weightGrams: '84.5 g',
    gemstones: 'Uncut Polki Diamonds & South Sea Pearl Drops',
    availableSizes: ['Made-to-Measure Bridal Fit'],
    shortDescription: 'Complete 4-piece bridal suite: Statement Collar, Jhumar Earrings, Maang Tikka, and Passa.',
    description:
      'Commissioned individually for brides across Pakistan and abroad. Each Firdous Suite is accompanied by an atelier purity dossier and bespoke fitting session via WhatsApp video consultation.',
    careNote: 'Complimentary annual ultrasonic & pearl re-stringing included.',
    images: [
      '/src/assets/images/cat_bridal_polki_1795173686381.jpg',
      '/src/assets/images/hero_luxury_jewellery_1795173687556.jpg',
    ],
    isNewArrival: true,
    isBestSeller: false,
    popularityScore: 92,
    inStock: false,
    releasedOrder: 15,
  },
];

export function getProductBySlug(slug: string): JewelleryProduct | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getProductById(id: string): JewelleryProduct | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function getDiscountPercentage(product: JewelleryProduct): number | null {
  if (!product.compareAtPricePkr || product.compareAtPricePkr <= product.pricePkr) {
    return null;
  }
  return Math.round(((product.compareAtPricePkr - product.pricePkr) / product.compareAtPricePkr) * 100);
}
