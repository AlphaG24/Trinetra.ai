export const getURL = (path: string = '') => {
  let url =
    process?.env?.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL !== ''
      ? process.env.NEXT_PUBLIC_APP_URL
      : process?.env?.NEXT_PUBLIC_VERCEL_URL && process.env.NEXT_PUBLIC_VERCEL_URL !== ''
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : process?.env?.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL !== ''
      ? process.env.NEXT_PUBLIC_SITE_URL
      : typeof window !== 'undefined'
      ? window.location.origin
      : 'https://trinetraedu-ai.com';

  // Include web protocol if missing
  url = url.includes('http') ? url : `https://${url}`;
  
  // Ensure trailing slash is removed before appending path
  url = url.charAt(url.length - 1) === '/' ? url.slice(0, -1) : url;
  
  // Format path (add leading slash if missing)
  const formattedPath = path && path.charAt(0) !== '/' ? `/${path}` : path;
  
  return `${url}${formattedPath}`;
};

/**
 * Global multi-currency formatter using Intl.NumberFormat (Section 5 Item 1)
 * Supports INR (₹), USD ($), EUR (€), AED (د.إ), GBP (£), etc.
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'INR',
  locale?: string,
  maximumFractionDigits: number = 0
): string => {
  const defaultLocales: Record<string, string> = {
    INR: 'en-IN',
    USD: 'en-US',
    EUR: 'de-DE',
    AED: 'ar-AE',
    GBP: 'en-GB'
  };

  const resolvedLocale = locale || defaultLocales[currency.toUpperCase()] || 'en-US';

  try {
    return new Intl.NumberFormat(resolvedLocale, {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
};

/**
 * Global timezone-aware date-time formatter (Section 5 Item 3)
 * Formats UTC timestamps into user's local timezone.
 */
export const formatLocalDateTime = (
  dateInput: string | number | Date,
  options?: Intl.DateTimeFormatOptions
): string => {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, options || {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(dateInput);
  }
};

