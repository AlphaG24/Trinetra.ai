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
