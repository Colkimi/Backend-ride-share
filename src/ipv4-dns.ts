/**
 * Force IPv4 DNS resolution to avoid ENETUNREACH errors with IPv6
 * This patches Node's DNS lookup to prefer IPv4 addresses
 */
import * as dns from 'dns';

// Configure DNS servers (Google DNS and Cloudflare)
dns.setServers([
  '8.8.8.8',      // Google DNS
  '8.8.4.4',      // Google DNS
  '1.1.1.1',      // Cloudflare DNS
  '1.0.0.1',      // Cloudflare DNS
]);

console.log('DNS servers configured:', dns.getServers());

const originalLookup = dns.lookup;

// Override dns.lookup to force IPv4
(dns as any).lookup = function (
  hostname: string,
  options: any,
  callback: any,
): void {
  // Handle both (hostname, callback) and (hostname, options, callback) signatures
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  // Force IPv4 family
  const newOptions = { ...options, family: 4 };

  return originalLookup.call(this, hostname, newOptions, callback);
};

console.log('DNS lookup patched to force IPv4 resolution');
