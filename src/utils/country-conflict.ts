export interface ConflictRule {
  groupA: string[]
  groupB: string[]
  reason?: string
}

export const CONFLICT_RULES: ConflictRule[] = [
  {
    groupA: ['Armenia'],
    groupB: ['Azerbaijan'],
    reason: 'Konflik wilayah Kaukasus',
  },
  {
    groupA: ['India'],
    groupB: ['Pakistan'],
    reason: 'Sensitivitas perbatasan Asia Selatan',
  },
  {
    groupA: ['Serbia'],
    groupB: ['Kosovo', 'Bosnia and Herzegovina'],
    reason: 'Sensitivitas wilayah Balkan',
  },
  {
    groupA: ['Morocco'],
    groupB: ['Algeria'],
    reason: 'Sensitivitas geopolitik Afrika Utara',
  },
  {
    groupA: ['Turkey'],
    groupB: ['Greece', 'Cyprus'],
    reason: 'Sensitivitas Mediterania Timur',
  },
  {
    groupA: ['United Kingdom'],
    groupB: ['Argentina'],
    reason: 'Sensitivitas kedaulatan Kepulauan Falkland',
  },
  {
    groupA: ['Russia'],
    groupB: ['Ukraine'],
    reason: 'Konflik aktif Eropa Timur',
  },
  {
    groupA: ['China'],
    groupB: ['Taiwan', 'Hong Kong'],
    reason: 'Sensitivitas politik & kedaulatan',
  },
  {
    groupA: ['China'],
    groupB: ['Japan', 'South Korea'],
    reason: 'Sensitivitas regional Asia Timur',
  },
]

const CANONICAL_MAP: Record<string, string> = {
  armenia: 'Armenia',
  am: 'Armenia',
  azerbaijan: 'Azerbaijan',
  az: 'Azerbaijan',
  india: 'India',
  in: 'India',
  pakistan: 'Pakistan',
  pk: 'Pakistan',
  serbia: 'Serbia',
  rs: 'Serbia',
  kosovo: 'Kosovo',
  xk: 'Kosovo',
  bosnia: 'Bosnia and Herzegovina',
  'bosnia and herzegovina': 'Bosnia and Herzegovina',
  ba: 'Bosnia and Herzegovina',
  morocco: 'Morocco',
  maroko: 'Morocco',
  ma: 'Morocco',
  algeria: 'Algeria',
  aljazair: 'Algeria',
  dz: 'Algeria',
  turkey: 'Turkey',
  turki: 'Turkey',
  türkiye: 'Turkey',
  tr: 'Turkey',
  greece: 'Greece',
  yunani: 'Greece',
  gr: 'Greece',
  cyprus: 'Cyprus',
  siprus: 'Cyprus',
  cy: 'Cyprus',
  'united kingdom': 'United Kingdom',
  uk: 'United Kingdom',
  inggris: 'United Kingdom',
  gb: 'United Kingdom',
  england: 'United Kingdom',
  great_britain: 'United Kingdom',
  argentina: 'Argentina',
  ar: 'Argentina',
  russia: 'Russia',
  rusia: 'Russia',
  ru: 'Russia',
  russian_federation: 'Russia',
  ukraine: 'Ukraine',
  ukraina: 'Ukraine',
  ua: 'Ukraine',
  china: 'China',
  tiongkok: 'China',
  cn: 'China',
  prc: 'China',
  taiwan: 'Taiwan',
  tw: 'Taiwan',
  'hong kong': 'Hong Kong',
  hongkong: 'Hong Kong',
  hk: 'Hong Kong',
  japan: 'Japan',
  jepang: 'Japan',
  jp: 'Japan',
  'south korea': 'South Korea',
  'korea selatan': 'South Korea',
  korsel: 'South Korea',
  kr: 'South Korea',
  korea: 'South Korea',
  indonesia: 'Indonesia',
  id: 'Indonesia',
  ina: 'Indonesia',
  malaysia: 'Malaysia',
  my: 'Malaysia',
  singapore: 'Singapore',
  sg: 'Singapore',
  singapura: 'Singapore',
  thailand: 'Thailand',
  th: 'Thailand',
  germany: 'Germany',
  jerman: 'Germany',
  de: 'Germany',
  australia: 'Australia',
  au: 'Australia',
  france: 'France',
  prancis: 'France',
  fr: 'France',
  'united states': 'United States',
  usa: 'United States',
  us: 'United States',
  amerika: 'United States',
  netherlands: 'Netherlands',
  belanda: 'Netherlands',
  nl: 'Netherlands',
}

export function canonicalizeCountry(country?: string | null): string {
  if (!country) return 'Indonesia'
  const cleaned = country
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
  return CANONICAL_MAP[cleaned] || country.trim()
}

export function hasCountryConflict(
  countryA?: string | null,
  countryB?: string | null
): boolean {
  if (!countryA || !countryB) return false
  const a = canonicalizeCountry(countryA)
  const b = canonicalizeCountry(countryB)

  // Same canonical country never conflicts with itself
  if (a.toLowerCase() === b.toLowerCase()) return false

  for (const rule of CONFLICT_RULES) {
    const match1 = rule.groupA.includes(a) && rule.groupB.includes(b)
    const match2 = rule.groupB.includes(a) && rule.groupA.includes(b)
    if (match1 || match2) return true
  }
  return false
}

export function findConflictingCountriesInGroup(
  travelerCountry?: string | null,
  participants?: Array<{ nationality?: string | null; country?: string | null }>
): string[] {
  if (!travelerCountry || !participants || participants.length === 0) return []
  const conflicts = new Set<string>()

  for (const p of participants) {
    const pNat = p.nationality || p.country
    if (pNat && hasCountryConflict(travelerCountry, pNat)) {
      conflicts.add(canonicalizeCountry(pNat))
    }
  }

  return Array.from(conflicts)
}

export function isGroupCompatibleWithTraveler(
  group: {
    current_participants?: number
    max_participants?: number
    currentParticipants?: number
    capacity?: number
    participants?: Array<{ nationality?: string | null; country?: string | null }>
  },
  travelerCountry?: string | null,
  requestedPax: number = 1
): boolean {
  const current = group.current_participants ?? group.currentParticipants ?? 0
  const max = group.max_participants ?? group.capacity ?? 6

  // 1. Capacity check
  if (current + requestedPax > max) {
    return false
  }

  // 2. Geopolitical conflict check
  const participants = group.participants || []
  if (participants.length === 0) {
    return true
  }

  const conflicting = findConflictingCountriesInGroup(travelerCountry, participants)
  return conflicting.length === 0
}

export function isGroupCompatibleWithMultipleTravelers(
  group: {
    current_participants?: number
    max_participants?: number
    currentParticipants?: number
    capacity?: number
    participants?: Array<{ nationality?: string | null; country?: string | null }>
  },
  travelerCountries: Array<string | null | undefined>,
  requestedPax?: number
): boolean {
  const pax = requestedPax ?? travelerCountries.length
  const current = group.current_participants ?? group.currentParticipants ?? 0
  const max = group.max_participants ?? group.capacity ?? 6

  if (current + pax > max) {
    return false
  }

  const participants = group.participants || []
  if (participants.length === 0) {
    return true
  }

  for (const country of travelerCountries) {
    if (findConflictingCountriesInGroup(country, participants).length > 0) {
      return false
    }
  }

  return true
}
