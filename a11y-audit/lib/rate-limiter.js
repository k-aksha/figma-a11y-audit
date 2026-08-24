/**
 * rate-limiter.js
 * Simple timestamp-based throttle for Figma API and MCP calls.
 * Prevents rate-limit errors by enforcing minimum gaps between calls.
 */

class RateLimiter {
  /**
   * @param {object} opts
   * @param {number} opts.minGapMs       Minimum ms between calls (default: 2000)
   * @param {number} opts.maxPerMinute   Max calls per rolling 60s window (default: 30)
   */
  constructor(opts = {}) {
    this.minGapMs = opts.minGapMs || 2000;
    this.maxPerMinute = opts.maxPerMinute || 30;
    this.timestamps = [];
    this.lastCallTime = 0;
  }

  /**
   * Wait until it's safe to make the next call, then record the timestamp.
   */
  async throttle() {
    const now = Date.now();

    // Enforce minimum gap
    const elapsed = now - this.lastCallTime;
    if (elapsed < this.minGapMs) {
      await sleep(this.minGapMs - elapsed);
    }

    // Enforce per-minute cap
    const windowStart = Date.now() - 60000;
    this.timestamps = this.timestamps.filter(t => t > windowStart);

    if (this.timestamps.length >= this.maxPerMinute) {
      const waitUntil = this.timestamps[0] + 60000;
      const waitMs = waitUntil - Date.now();
      if (waitMs > 0) {
        console.log(`  [rate-limit] Waiting ${Math.ceil(waitMs / 1000)}s to stay under ${this.maxPerMinute} calls/min...`);
        await sleep(waitMs);
      }
    }

    this.lastCallTime = Date.now();
    this.timestamps.push(this.lastCallTime);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Pre-configured limiters for different API types
const restLimiter = new RateLimiter({ minGapMs: 500, maxPerMinute: 30 });
const mcpLimiter = new RateLimiter({ minGapMs: 2000, maxPerMinute: 20 });

module.exports = {
  RateLimiter,
  restLimiter,
  mcpLimiter,
  sleep,
};
