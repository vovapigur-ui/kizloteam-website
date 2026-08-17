// Single source of truth for the facts that appear in structured data.
// Everything else in the JSON-LD is derived from the rendered HTML so the
// markup can never drift from what a visitor actually sees.

export const SITE = "https://www.kizloteam.com";

export const AGENCY_ID = `${SITE}/#agency`;
export const VLAD_ID = `${SITE}/#vlad`;
export const ANASTASIIA_ID = `${SITE}/#anastasiia`;

// Verified against the assets actually in the repo:
//   apple-touch-icon.png  180x180  (Google requires >= 112x112 for logo)
//   img/team-portrait-960.jpg  960x1200
export const LOGO = `${SITE}/apple-touch-icon.png`;
export const TEAM_IMAGE = `${SITE}/img/team-portrait-960.jpg`;

// These coordinates come from the team's own Google Business Profile place URL
// (see sameAs below), which is the authoritative fix for the office location.
export const GEO = { latitude: 28.4632431, longitude: -81.5821345 };

export const RATING = { ratingValue: "4.9", reviewCount: "120" };

export const agency = () => ({
  "@type": "RealEstateAgent",
  "@id": AGENCY_ID,
  name: "The Kizlo Team - Realtors",
  url: `${SITE}/`,
  description:
    "Husband and wife Realtor team serving Windermere, Winter Garden, Horizon West and West Orlando. Buyers, sellers and investors.",
  logo: LOGO,
  image: TEAM_IMAGE,
  telephone: "+18139923073",
  email: "thekizloteam@kw.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "7107 Beek St",
    addressLocality: "Windermere",
    addressRegion: "FL",
    postalCode: "34786",
    addressCountry: "US",
  },
  geo: { "@type": "GeoCoordinates", ...GEO },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    opens: "08:00",
    closes: "20:00",
  },
  areaServed: [
    { "@type": "City", name: "Windermere" },
    { "@type": "City", name: "Winter Garden" },
    { "@type": "Place", name: "Horizon West" },
    { "@type": "City", name: "Clermont" },
    { "@type": "Place", name: "Hamlin" },
    { "@type": "City", name: "Orlando" },
  ],
  parentOrganization: {
    "@type": "Organization",
    name: "Keller Williams Realty At The Lakes",
  },
  knowsLanguage: ["en", "uk"],
  knowsAbout: [
    "Windermere real estate",
    "Winter Garden homes for sale",
    "Horizon West new construction",
    "Luxury golf communities",
    "Investment property",
    "Fix and flip",
  ],
  priceRange: "$$",
  slogan: "Real estate in West Orlando, done properly.",
  employee: [{ "@id": VLAD_ID }, { "@id": ANASTASIIA_ID }],
  // aggregateRating is deliberately NOT here. Google treats review markup on a
  // business's own site as self-serving, so the rating is attached only on
  // /reviews/, where all 120 reviews' worth of quotes are actually visible.
  sameAs: [
    "https://www.google.com/maps/place/The+Kizlo+Team+-+Realtors+-+Windermere%2FWinter+Garden/@28.4632431,-81.5821345,17z",
    "https://www.instagram.com/thekizloteam_realestate",
    "https://www.facebook.com/TheKizloTeam",
    "https://www.zillow.com/profile/Vlad%20Kizlo",
    "https://www.kthomesforsale.com/",
  ],
});

export const people = () => [
  {
    "@type": "Person",
    "@id": VLAD_ID,
    name: "Vlad Kizlo",
    alternateName: "Volodymyr Kizlo",
    image: `${SITE}/img/vlad-kizlo-1280.jpg`,
    jobTitle: "Realtor",
    worksFor: { "@id": AGENCY_ID },
    telephone: "+18139923073",
    knowsLanguage: ["en", "uk"],
    knowsAbout: [
      "Windermere FL real estate",
      "Winter Garden FL real estate",
      "Horizon West",
      "Investment property",
      "Fix and flip",
    ],
    hasCredential: {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "license",
      name: "Florida Real Estate License SL3475553",
    },
    sameAs: [
      "https://www.zillow.com/profile/Vlad%20Kizlo",
      "https://www.linkedin.com/in/vlad-kizlo-399a1b254",
    ],
  },
  {
    "@type": "Person",
    "@id": ANASTASIIA_ID,
    name: "Anastasiia Zbihla",
    image: `${SITE}/img/anastasiia-zbihla-1280.jpg`,
    jobTitle: "Realtor",
    worksFor: { "@id": AGENCY_ID },
    knowsLanguage: ["en", "uk"],
    knowsAbout: [
      "Home staging",
      "Listing preparation",
      "Windermere FL real estate",
      "Winter Garden FL real estate",
    ],
    hasCredential: {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "license",
      name: "Florida Real Estate License SL3469407",
    },
  },
];

// hreflang clusters. Each entry lists every alternate for the pages in it.
export const HREFLANG_CLUSTERS = [
  {
    pages: ["index.html", "ukrainian-realtor-orlando/index.html"],
    alternates: [
      { hreflang: "en", href: `${SITE}/` },
      { hreflang: "uk", href: `${SITE}/ukrainian-realtor-orlando/` },
      { hreflang: "x-default", href: `${SITE}/` },
    ],
  },
];

// Pages that are intentionally not part of the generated-schema pass.
export const SKIP = new Set([
  "studio/index.html",
  "404.html",
  "google62632eb78b18f226.html",
  "russian-ukrainian-realtor-orlando/index.html",
]);
