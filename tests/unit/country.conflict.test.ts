import {
  canonicalizeCountry,
  findConflictingCountriesInGroup,
  hasCountryConflict,
  isGroupCompatibleWithMultipleTravelers,
  isGroupCompatibleWithTraveler,
} from '../../src/utils/country-conflict'

describe('country-conflict helper', () => {
  describe('canonicalizeCountry', () => {
    it('should map various aliases and codes to canonical names', () => {
      expect(canonicalizeCountry('ID')).toBe('Indonesia')
      expect(canonicalizeCountry('indonesia')).toBe('Indonesia')
      expect(canonicalizeCountry('PK')).toBe('Pakistan')
      expect(canonicalizeCountry('pakistan')).toBe('Pakistan')
      expect(canonicalizeCountry('IN')).toBe('India')
      expect(canonicalizeCountry('india')).toBe('India')
      expect(canonicalizeCountry('UK')).toBe('United Kingdom')
      expect(canonicalizeCountry('Inggris')).toBe('United Kingdom')
      expect(canonicalizeCountry('GB')).toBe('United Kingdom')
      expect(canonicalizeCountry('RU')).toBe('Russia')
      expect(canonicalizeCountry('Rusia')).toBe('Russia')
      expect(canonicalizeCountry('UA')).toBe('Ukraine')
      expect(canonicalizeCountry('Ukraina')).toBe('Ukraine')
      expect(canonicalizeCountry('CN')).toBe('China')
      expect(canonicalizeCountry('Tiongkok')).toBe('China')
      expect(canonicalizeCountry('TW')).toBe('Taiwan')
      expect(canonicalizeCountry('Korsel')).toBe('South Korea')
      expect(canonicalizeCountry('Korea Selatan')).toBe('South Korea')
    })

    it('should fallback to Indonesia for empty/null', () => {
      expect(canonicalizeCountry(null)).toBe('Indonesia')
      expect(canonicalizeCountry('')).toBe('Indonesia')
      expect(canonicalizeCountry(undefined)).toBe('Indonesia')
    })

    it('should keep unlisted country names trimmed', () => {
      expect(canonicalizeCountry('Brazil')).toBe('Brazil')
      expect(canonicalizeCountry('  Norway  ')).toBe('Norway')
    })
  })

  describe('hasCountryConflict', () => {
    it('should recognize Rule 1: Armenia <-> Azerbaijan', () => {
      expect(hasCountryConflict('Armenia', 'Azerbaijan')).toBe(true)
      expect(hasCountryConflict('Azerbaijan', 'Armenia')).toBe(true)
      expect(hasCountryConflict('AM', 'AZ')).toBe(true)
    })

    it('should recognize Rule 2: India <-> Pakistan', () => {
      expect(hasCountryConflict('India', 'Pakistan')).toBe(true)
      expect(hasCountryConflict('Pakistan', 'India')).toBe(true)
      expect(hasCountryConflict('IN', 'PK')).toBe(true)
    })

    it('should recognize Rule 3: Serbia <-> Kosovo / Bosnia and Herzegovina', () => {
      expect(hasCountryConflict('Serbia', 'Kosovo')).toBe(true)
      expect(hasCountryConflict('Kosovo', 'Serbia')).toBe(true)
      expect(hasCountryConflict('Serbia', 'Bosnia and Herzegovina')).toBe(true)
      expect(hasCountryConflict('RS', 'BA')).toBe(true)
    })

    it('should recognize Rule 4: Morocco <-> Algeria', () => {
      expect(hasCountryConflict('Morocco', 'Algeria')).toBe(true)
      expect(hasCountryConflict('Maroko', 'Aljazair')).toBe(true)
      expect(hasCountryConflict('MA', 'DZ')).toBe(true)
    })

    it('should recognize Rule 5: Turkey <-> Greece / Cyprus', () => {
      expect(hasCountryConflict('Turkey', 'Greece')).toBe(true)
      expect(hasCountryConflict('Turki', 'Yunani')).toBe(true)
      expect(hasCountryConflict('Turkey', 'Cyprus')).toBe(true)
      expect(hasCountryConflict('TR', 'GR')).toBe(true)
      expect(hasCountryConflict('TR', 'CY')).toBe(true)
    })

    it('should recognize Rule 6: United Kingdom <-> Argentina', () => {
      expect(hasCountryConflict('United Kingdom', 'Argentina')).toBe(true)
      expect(hasCountryConflict('Inggris', 'Argentina')).toBe(true)
      expect(hasCountryConflict('UK', 'AR')).toBe(true)
      expect(hasCountryConflict('GB', 'AR')).toBe(true)
    })

    it('should recognize Rule 7: Russia <-> Ukraine', () => {
      expect(hasCountryConflict('Russia', 'Ukraine')).toBe(true)
      expect(hasCountryConflict('Rusia', 'Ukraina')).toBe(true)
      expect(hasCountryConflict('RU', 'UA')).toBe(true)
    })

    it('should recognize Rule 8: China <-> Taiwan / Hong Kong', () => {
      expect(hasCountryConflict('China', 'Taiwan')).toBe(true)
      expect(hasCountryConflict('Tiongkok', 'Taiwan')).toBe(true)
      expect(hasCountryConflict('CN', 'TW')).toBe(true)
      expect(hasCountryConflict('China', 'Hong Kong')).toBe(true)
      expect(hasCountryConflict('CN', 'HK')).toBe(true)
    })

    it('should recognize Rule 9: China <-> Japan / South Korea', () => {
      expect(hasCountryConflict('China', 'Japan')).toBe(true)
      expect(hasCountryConflict('Tiongkok', 'Jepang')).toBe(true)
      expect(hasCountryConflict('CN', 'JP')).toBe(true)
      expect(hasCountryConflict('China', 'South Korea')).toBe(true)
      expect(hasCountryConflict('China', 'Korsel')).toBe(true)
      expect(hasCountryConflict('CN', 'KR')).toBe(true)
    })

    it('should NOT conflict between neutral countries or same country', () => {
      expect(hasCountryConflict('Indonesia', 'Malaysia')).toBe(false)
      expect(hasCountryConflict('Indonesia', 'Ukraine')).toBe(false)
      expect(hasCountryConflict('Germany', 'Russia')).toBe(false)
      expect(hasCountryConflict('India', 'India')).toBe(false)
      expect(hasCountryConflict('Russia', 'Russia')).toBe(false)
    })
  })

  describe('findConflictingCountriesInGroup', () => {
    it('should find conflicting country when group contains conflicting participant', () => {
      const participants = [
        { nationality: 'Indonesia' },
        { nationality: 'Ukraine' },
      ]
      const conflicts = findConflictingCountriesInGroup('Russia', participants)
      expect(conflicts).toContain('Ukraine')
    })

    it('should return empty array when no conflict exists', () => {
      const participants = [
        { nationality: 'Indonesia' },
        { nationality: 'Germany' },
        { nationality: 'Malaysia' },
      ]
      const conflicts = findConflictingCountriesInGroup('Russia', participants)
      expect(conflicts).toEqual([])
    })
  })

  describe('isGroupCompatibleWithTraveler', () => {
    it('should return false if group capacity is exceeded', () => {
      const group = {
        current_participants: 6,
        max_participants: 6,
        participants: [{ nationality: 'Indonesia' }],
      }
      expect(isGroupCompatibleWithTraveler(group, 'Indonesia', 1)).toBe(false)
    })

    it('should return false if group contains conflicting nationality', () => {
      const group = {
        current_participants: 2,
        max_participants: 6,
        participants: [{ nationality: 'India' }, { nationality: 'Indonesia' }],
      }
      expect(isGroupCompatibleWithTraveler(group, 'Pakistan', 1)).toBe(false)
    })

    it('should return true if group has space and no conflict', () => {
      const group = {
        current_participants: 2,
        max_participants: 6,
        participants: [{ nationality: 'Indonesia' }, { nationality: 'Malaysia' }],
      }
      expect(isGroupCompatibleWithTraveler(group, 'Pakistan', 1)).toBe(true)
    })
  })

  describe('isGroupCompatibleWithMultipleTravelers', () => {
    it('should return false if any traveler in the party conflicts with existing participants', () => {
      const group = {
        current_participants: 1,
        max_participants: 6,
        participants: [{ nationality: 'Armenia' }],
      }
      expect(
        isGroupCompatibleWithMultipleTravelers(group, ['Indonesia', 'Azerbaijan'], 2)
      ).toBe(false)
    })

    it('should return true if all travelers in the party are compatible', () => {
      const group = {
        current_participants: 1,
        max_participants: 6,
        participants: [{ nationality: 'Indonesia' }],
      }
      expect(
        isGroupCompatibleWithMultipleTravelers(group, ['Germany', 'France'], 2)
      ).toBe(true)
    })
  })
})
