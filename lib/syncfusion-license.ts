// Syncfusion License Registration
// This file MUST be imported BEFORE any Syncfusion components are imported
// It registers the license synchronously when this module is evaluated

import { registerLicense } from '@syncfusion/ej2-base';

// Get license key from environment variable
// In Next.js, NEXT_PUBLIC_ variables are embedded at build time into the client bundle
// Fallback to the license key directly if env var is not available (for Turbopack compatibility)
const licenseKey = 
  process.env.NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY || 
  'ORg4AjUWIQA/Gnt2XFhhQlJHfV5AQmBIYVp/TGpJfl96cVxMZVVBJAtUQF1hTH5VdkJiX31Wcn1WRGVcWkZ/';

// Register license immediately when this module loads
// This works on both server and client, but Syncfusion only checks on client
if (licenseKey && licenseKey.trim().length > 0) {
  try {
    registerLicense(licenseKey.trim());
    if (typeof window !== 'undefined') {
      console.log('[Syncfusion License] ✅ Registered successfully (client)');
      console.log('[Syncfusion License] License key length:', licenseKey.trim().length);
    } else {
      console.log('[Syncfusion License] ✅ Registered successfully (server)');
    }
  } catch (error) {
    console.error('[Syncfusion License] ❌ Registration failed:', error);
  }
} else {
  if (typeof window !== 'undefined') {
    console.error('[Syncfusion License] ❌ License key not found!');
    console.error('[Syncfusion License] Environment variable NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY is missing or empty');
  }
}

