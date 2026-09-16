import type { ClientRateLimitInfo, Options, Store } from 'express-rate-limit';

import { bump, dip, drop } from '../services/cache.service.js';

export default class RateLimitStore implements Store {
  private windowSeconds = 60;
  readonly prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  init(options: Options): void {
    this.windowSeconds = Math.ceil(options.windowMs / 1000);
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const totalHits = (await bump(this.prefix + key, this.windowSeconds)) || 1;

    return { totalHits, resetTime: new Date(Date.now() + this.windowSeconds * 1000) };
  }

  async decrement(key: string): Promise<void> {
    await dip(this.prefix + key);
  }

  async resetKey(key: string): Promise<void> {
    await drop(this.prefix + key);
  }
}
