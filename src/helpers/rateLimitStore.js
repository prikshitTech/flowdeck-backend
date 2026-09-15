import { bump, dip, drop } from '../services/cache.service.js';

export default class RateLimitStore {
  constructor(prefix) {
    this.prefix = prefix;
    this.windowSeconds = 60;
  }

  init(options) {
    this.windowSeconds = Math.ceil(options.windowMs / 1000);
  }

  async increment(key) {
    const totalHits = (await bump(this.prefix + key, this.windowSeconds)) || 1;

    return { totalHits, resetTime: new Date(Date.now() + this.windowSeconds * 1000) };
  }

  async decrement(key) {
    await dip(this.prefix + key);
  }

  async resetKey(key) {
    await drop(this.prefix + key);
  }
}
