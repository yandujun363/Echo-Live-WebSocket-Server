import os from 'os';
import net from 'net';

export function getAllIPs() {
  const interfaces = os.networkInterfaces();
  const ips = new Set();

  for (const interfaceName in interfaces) {
    for (const iface of interfaces[interfaceName]) {
      if (!iface.internal) {
        ips.add(iface.address);
      }
    }
  }
  return Array.from(ips);
}

export function isIPv6(address) {
  return net.isIPv6(address);
}