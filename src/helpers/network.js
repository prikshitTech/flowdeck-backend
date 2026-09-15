const IPV6_PREFIX_GROUPS = 4;

export function clientKey(ip) {
  if (!ip) {
    return 'unknown';
  }

  if (!ip.includes(':')) {
    return ip;
  }

  const groups = ip.split(':');

  if (ip.includes('::') || groups.length <= IPV6_PREFIX_GROUPS) {
    return ip;
  }

  return `${groups.slice(0, IPV6_PREFIX_GROUPS).join(':')}::`;
}
