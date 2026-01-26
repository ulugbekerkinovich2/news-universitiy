/**
 * SSRF Protection - Validates URLs to prevent internal network access
 */

/**
 * Checks if a URL is safe to fetch (external, public URL only)
 * Blocks localhost, private IPs, cloud metadata endpoints
 */
export function isValidExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    
    // Only allow HTTP/HTTPS protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    
    const hostname = parsed.hostname.toLowerCase();
    
    // Block localhost variants
    if (hostname === 'localhost' || 
        hostname === '127.0.0.1' || 
        hostname === '0.0.0.0' ||
        hostname === '::1' ||
        hostname.endsWith('.localhost')) {
      return false;
    }
    
    // Block cloud metadata endpoints
    if (hostname === '169.254.169.254' || 
        hostname === 'metadata.google.internal' ||
        hostname === 'metadata.goog' ||
        hostname.endsWith('.internal')) {
      return false;
    }
    
    // Check for private IPv4 ranges
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const [, a, b, c, d] = ipv4Match.map(Number);
      
      // Validate each octet is 0-255
      if (a > 255 || b > 255 || c > 255 || d > 255) {
        return false;
      }
      
      // Block private/reserved ranges:
      // 0.0.0.0/8 - Current network
      if (a === 0) return false;
      
      // 10.0.0.0/8 - Private
      if (a === 10) return false;
      
      // 127.0.0.0/8 - Loopback
      if (a === 127) return false;
      
      // 169.254.0.0/16 - Link-local
      if (a === 169 && b === 254) return false;
      
      // 172.16.0.0/12 - Private
      if (a === 172 && b >= 16 && b <= 31) return false;
      
      // 192.168.0.0/16 - Private
      if (a === 192 && b === 168) return false;
      
      // 224.0.0.0/4 - Multicast
      if (a >= 224 && a <= 239) return false;
      
      // 240.0.0.0/4 - Reserved
      if (a >= 240) return false;
    }
    
    // Block IPv6 private/reserved (basic check)
    if (hostname.startsWith('[')) {
      const ipv6 = hostname.slice(1, -1).toLowerCase();
      // Block loopback, link-local, private
      if (ipv6 === '::1' || 
          ipv6.startsWith('fe80:') || 
          ipv6.startsWith('fc') || 
          ipv6.startsWith('fd')) {
        return false;
      }
    }
    
    // Block common internal hostnames
    const blockedHostnames = [
      'internal',
      'intranet',
      'corp',
      'private',
      'admin',
      'kubernetes',
      'k8s',
      'docker',
      'consul',
      'vault',
      'etcd'
    ];
    
    for (const blocked of blockedHostnames) {
      if (hostname === blocked || 
          hostname.startsWith(`${blocked}.`) || 
          hostname.endsWith(`.${blocked}`)) {
        return false;
      }
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates and normalizes a website URL
 * Returns null if invalid, normalized URL if valid
 */
export function validateWebsiteUrl(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }
  
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }
  
  // Add https:// if no protocol
  const withProtocol = trimmed.startsWith('http://') || trimmed.startsWith('https://') 
    ? trimmed 
    : `https://${trimmed}`;
  
  if (!isValidExternalUrl(withProtocol)) {
    return null;
  }
  
  return withProtocol;
}
