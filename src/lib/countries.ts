export type Country = { code: string; flag: string; name: string };

export const COUNTRIES: Country[] = [
  { code: "US", flag: "🇺🇸", name: "USA" },
  { code: "BR", flag: "🇧🇷", name: "Brazil" },
  { code: "JP", flag: "🇯🇵", name: "Japan" },
  { code: "KR", flag: "🇰🇷", name: "Korea" },
  { code: "FR", flag: "🇫🇷", name: "France" },
  { code: "MX", flag: "🇲🇽", name: "Mexico" },
  { code: "DE", flag: "🇩🇪", name: "Germany" },
  { code: "IN", flag: "🇮🇳", name: "India" },
  { code: "GB", flag: "🇬🇧", name: "UK" },
  { code: "IT", flag: "🇮🇹", name: "Italy" },
  { code: "ES", flag: "🇪🇸", name: "Spain" },
  { code: "CA", flag: "🇨🇦", name: "Canada" },
];

export const countryByCode = (code: string | null | undefined): Country | undefined =>
  COUNTRIES.find((c) => c.code === code);
