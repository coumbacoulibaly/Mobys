// src/utils/phone-validation.ts
// Comprehensive phone number validation for West African countries

export interface CountryPhoneConfig {
  code: string;
  name: string;
  flag: string;
  patterns: RegExp[];
  minLength: number;
  maxLength: number;
  example: string;
  supportedProviders: string[];
}

// West African countries with their phone number configurations
export const WEST_AFRICAN_COUNTRIES: Record<string, CountryPhoneConfig> = {
  // Mali
  ML: {
    code: '+223',
    name: 'Mali',
    flag: '🇲🇱',
    patterns: [/^\+223[0-9]{8}$/],
    minLength: 12, // +223 + 8 digits
    maxLength: 12,
    example: '+22391234567',
    supportedProviders: ['wave', 'orange_money']
  },
  
  // Côte d'Ivoire
  CI: {
    code: '+225',
    name: 'Côte d\'Ivoire',
    flag: '🇨🇮',
    patterns: [/^\+225[0-9]{8}$/, /^\+225[0-9]{10}$/],
    minLength: 12, // +225 + 8-10 digits
    maxLength: 14,
    example: '+2250701234567',
    supportedProviders: ['wave', 'orange_money']
  },
  
  // Senegal
  SN: {
    code: '+221',
    name: 'Senegal',
    flag: '🇸🇳',
    patterns: [/^\+221[0-9]{9}$/],
    minLength: 13, // +221 + 9 digits
    maxLength: 13,
    example: '+221701234567',
    supportedProviders: ['wave', 'orange_money']
  },
  
  // Burkina Faso
  BF: {
    code: '+226',
    name: 'Burkina Faso',
    flag: '🇧🇫',
    patterns: [/^\+226[0-9]{8}$/],
    minLength: 12, // +226 + 8 digits
    maxLength: 12,
    example: '+22670123456',
    supportedProviders: ['orange_money']
  },
  
  // Niger
  NE: {
    code: '+227',
    name: 'Niger',
    flag: '🇳🇪',
    patterns: [/^\+227[0-9]{8}$/],
    minLength: 12, // +227 + 8 digits
    maxLength: 12,
    example: '+22790123456',
    supportedProviders: ['orange_money']
  },
  
  // Togo
  TG: {
    code: '+228',
    name: 'Togo',
    flag: '🇹🇬',
    patterns: [/^\+228[0-9]{8}$/],
    minLength: 12, // +228 + 8 digits
    maxLength: 12,
    example: '+22890123456',
    supportedProviders: ['orange_money']
  },
  
  // Benin
  BJ: {
    code: '+229',
    name: 'Benin',
    flag: '🇧🇯',
    patterns: [/^\+229[0-9]{8}$/],
    minLength: 12, // +229 + 8 digits
    maxLength: 12,
    example: '+22990123456',
    supportedProviders: ['orange_money']
  },
  
  // Guinea
  GN: {
    code: '+224',
    name: 'Guinea',
    flag: '🇬🇳',
    patterns: [/^\+224[0-9]{8}$/, /^\+224[0-9]{9}$/],
    minLength: 12, // +224 + 8-9 digits
    maxLength: 13,
    example: '+224601234567',
    supportedProviders: ['orange_money']
  },
  
  // Guinea-Bissau
  GW: {
    code: '+245',
    name: 'Guinea-Bissau',
    flag: '🇬🇼',
    patterns: [/^\+245[0-9]{7}$/],
    minLength: 11, // +245 + 7 digits
    maxLength: 11,
    example: '+2455012345',
    supportedProviders: ['orange_money']
  },
  
  // Sierra Leone
  SL: {
    code: '+232',
    name: 'Sierra Leone',
    flag: '🇸🇱',
    patterns: [/^\+232[0-9]{8}$/],
    minLength: 12, // +232 + 8 digits
    maxLength: 12,
    example: '+23230123456',
    supportedProviders: ['orange_money']
  },
  
  // Liberia
  LR: {
    code: '+231',
    name: 'Liberia',
    flag: '🇱🇷',
    patterns: [/^\+231[0-9]{8}$/],
    minLength: 12, // +231 + 8 digits
    maxLength: 12,
    example: '+23170123456',
    supportedProviders: ['orange_money']
  },
  
  // Ghana
  GH: {
    code: '+233',
    name: 'Ghana',
    flag: '🇬🇭',
    patterns: [/^\+233[0-9]{9}$/],
    minLength: 13, // +233 + 9 digits
    maxLength: 13,
    example: '+233201234567',
    supportedProviders: ['orange_money']
  },
  
  // Nigeria
  NG: {
    code: '+234',
    name: 'Nigeria',
    flag: '🇳🇬',
    patterns: [/^\+234[0-9]{10}$/],
    minLength: 14, // +234 + 10 digits
    maxLength: 14,
    example: '+2348012345678',
    supportedProviders: ['orange_money']
  },
  
  // Cameroon
  CM: {
    code: '+237',
    name: 'Cameroon',
    flag: '🇨🇲',
    patterns: [/^\+237[0-9]{8}$/],
    minLength: 12, // +237 + 8 digits
    maxLength: 12,
    example: '+23760123456',
    supportedProviders: ['orange_money']
  },
  
  // Chad
  TD: {
    code: '+235',
    name: 'Chad',
    flag: '🇹🇩',
    patterns: [/^\+235[0-9]{8}$/],
    minLength: 12, // +235 + 8 digits
    maxLength: 12,
    example: '+23560123456',
    supportedProviders: ['orange_money']
  },
  
  // Central African Republic
  CF: {
    code: '+236',
    name: 'Central African Republic',
    flag: '🇨🇫',
    patterns: [/^\+236[0-9]{8}$/],
    minLength: 12, // +236 + 8 digits
    maxLength: 12,
    example: '+23670123456',
    supportedProviders: ['orange_money']
  }
};

/**
 * Validate phone number for West African countries
 */
export function validateWestAfricanPhone(phone: string, countryCode?: string): {
  isValid: boolean;
  country?: CountryPhoneConfig;
  error?: string;
  normalizedPhone?: string;
} {
  if (!phone || typeof phone !== 'string') {
    return {
      isValid: false,
      error: 'Phone number is required and must be a string'
    };
  }

  // Normalize phone number (remove spaces, dashes, etc.)
  const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');

  // If country code is specified, validate against that country
  if (countryCode) {
    const country = WEST_AFRICAN_COUNTRIES[countryCode.toUpperCase()];
    if (!country) {
      return {
        isValid: false,
        error: `Unsupported country code: ${countryCode}`
      };
    }

    // Check if phone starts with the country code
    if (!normalizedPhone.startsWith(country.code)) {
      return {
        isValid: false,
        error: `Phone number must start with ${country.code} for ${country.name}`
      };
    }

    // Validate length
    if (normalizedPhone.length < country.minLength || normalizedPhone.length > country.maxLength) {
      return {
        isValid: false,
        error: `Phone number for ${country.name} must be ${country.minLength}-${country.maxLength} digits (including country code)`
      };
    }

    // Validate pattern
    const isValidPattern = country.patterns.some(pattern => pattern.test(normalizedPhone));
    if (!isValidPattern) {
      return {
        isValid: false,
        error: `Invalid phone number format for ${country.name}. Example: ${country.example}`
      };
    }

    return {
      isValid: true,
      country,
      normalizedPhone
    };
  }

  // Auto-detect country by checking all country codes
  for (const [code, country] of Object.entries(WEST_AFRICAN_COUNTRIES)) {
    if (normalizedPhone.startsWith(country.code)) {
      // Validate length
      if (normalizedPhone.length < country.minLength || normalizedPhone.length > country.maxLength) {
        continue; // Try next country
      }

      // Validate pattern
      const isValidPattern = country.patterns.some(pattern => pattern.test(normalizedPhone));
      if (isValidPattern) {
        return {
          isValid: true,
          country,
          normalizedPhone
        };
      }
    }
  }

  return {
    isValid: false,
    error: 'Phone number does not match any supported West African country format'
  };
}

/**
 * Get supported countries for a specific provider
 */
export function getCountriesForProvider(provider: string): CountryPhoneConfig[] {
  return Object.values(WEST_AFRICAN_COUNTRIES).filter(country => 
    country.supportedProviders.includes(provider)
  );
}

/**
 * Get all supported countries
 */
export function getAllSupportedCountries(): CountryPhoneConfig[] {
  return Object.values(WEST_AFRICAN_COUNTRIES);
}

/**
 * Check if a provider supports a specific country
 */
export function isProviderSupportedInCountry(provider: string, countryCode: string): boolean {
  const country = WEST_AFRICAN_COUNTRIES[countryCode.toUpperCase()];
  return country ? country.supportedProviders.includes(provider) : false;
}

/**
 * Get country information by phone number
 */
export function getCountryByPhone(phone: string): CountryPhoneConfig | null {
  const validation = validateWestAfricanPhone(phone);
  return validation.isValid ? validation.country || null : null;
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const validation = validateWestAfricanPhone(phone);
  if (!validation.isValid || !validation.country) {
    return phone; // Return original if invalid
  }

  const { country, normalizedPhone } = validation;
  const numberWithoutCode = normalizedPhone!.substring(country.code.length);
  
  // Format based on country
  switch (country.code) {
    case '+223': // Mali
      return `${country.code} ${numberWithoutCode.substring(0, 2)} ${numberWithoutCode.substring(2, 4)} ${numberWithoutCode.substring(4, 6)} ${numberWithoutCode.substring(6)}`;
    case '+225': // Côte d'Ivoire
      return `${country.code} ${numberWithoutCode.substring(0, 2)} ${numberWithoutCode.substring(2, 4)} ${numberWithoutCode.substring(4, 6)} ${numberWithoutCode.substring(6)}`;
    case '+221': // Senegal
      return `${country.code} ${numberWithoutCode.substring(0, 3)} ${numberWithoutCode.substring(3, 6)} ${numberWithoutCode.substring(6)}`;
    default:
      return normalizedPhone!;
  }
}

/**
 * Get phone number examples for all countries
 */
export function getPhoneExamples(): Array<{ country: string; example: string; providers: string[] }> {
  return Object.values(WEST_AFRICAN_COUNTRIES).map(country => ({
    country: `${country.flag} ${country.name}`,
    example: country.example,
    providers: country.supportedProviders
  }));
} 