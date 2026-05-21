// Environment configuration
export const environment = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'https://api.hwsetabeneficiaryhub.co.za',
  /** Portal origin for form links and SMS short URLs. */
  appUrl: process.env.NEXT_PUBLIC_APP_URL?.trim() || '',
  syncfusionLicenseKey: process.env.NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY || '',
  /** Maps JavaScript API + Places (address autocomplete on beneficiary profile). */
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || '',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production'
};

export default environment;
