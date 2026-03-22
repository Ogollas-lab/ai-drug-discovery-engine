/**
 * RateLimitQueue Service
 * Manages API requests with rate limit awareness and exponential backoff
 */

class RateLimitQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.requestTimestamps = []; // Track request times for rate limiting
    this.MAX_REQUESTS_PER_MINUTE = 9; // Stay under free tier limit of 10
    this.backoffMultiplier = 1000; // Start with 1 second
    this.maxBackoff = 60000; // Max 60 seconds
    this.lastRequestTime = 0; // Track last actual API call time
    this.MIN_REQUEST_INTERVAL = 6700; // ~9 requests per minute = 1 request per 6.67 seconds
  }

  /**
   * Add a request to the queue
   * @param {Function} requestFn - Async function that makes the API call
   * @param {Object} options - Configuration options
   * @returns {Promise} - Resolves with API response
   */
  async enqueue(requestFn, options = {}) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        fn: requestFn,
        resolve,
        reject,
        retries: 0,
        maxRetries: options.maxRetries || 3,
        timeout: options.timeout || 30000
      });

      this.processQueue();
    });
  }

  /**
   * Check if we're within rate limits
   * @returns {boolean} - True if we can make a request now
   */
  isWithinRateLimit() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove timestamps older than 1 minute
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneMinuteAgo);

    // Check if we've made too many requests
    return this.requestTimestamps.length < this.MAX_REQUESTS_PER_MINUTE;
  }

  /**
   * Get wait time before next request
   * @returns {number} - Milliseconds to wait
   */
  getWaitTime() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    // If not enough time has passed since last request, wait
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      return this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    }

    return 0;
  }

  /**
   * Process the queue
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();

      // Check if we need to wait before making the next request
      let waitTime = this.getWaitTime();
      if (waitTime > 0) {
        console.log(`⏳ Rate limit enforced. Waiting ${waitTime}ms before next request...`);
        await this.sleep(waitTime);
      }

      try {
        // Record this request BEFORE executing it
        this.lastRequestTime = Date.now();
        this.requestTimestamps.push(this.lastRequestTime);

        // Keep only last 60 seconds of timestamps
        const oneMinuteAgo = this.lastRequestTime - 60000;
        this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneMinuteAgo);

        const requestCount = this.requestTimestamps.length;
        console.log(`📤 Processing request (${requestCount}/${this.MAX_REQUESTS_PER_MINUTE} quota)`);

        // Execute the request with timeout
        const response = await Promise.race([
          item.fn(),
          this.createTimeout(item.timeout)
        ]);

        item.resolve(response);
      } catch (error) {
        // Handle 429 rate limit errors
        if (error.status === 429) {
          item.retries++;
          const retryDelay = Math.min(
            this.backoffMultiplier * Math.pow(2, item.retries),
            this.maxBackoff
          );

          console.warn(
            `⚠️ Rate limited (attempt ${item.retries}/${item.maxRetries}). ` +
            `Retrying in ${retryDelay}ms...`
          );

          if (item.retries < item.maxRetries) {
            // Re-queue with delay
            await this.sleep(retryDelay);
            this.queue.unshift(item); // Put back at front of queue
            continue;
          }
        }

        // Handle timeout
        if (error.name === 'TimeoutError') {
          console.error('❌ Request timeout');
          item.reject(new Error('Request timeout - API not responding'));
          continue;
        }

        item.reject(error);
      }
    }

    this.processing = false;
  }

  /**
   * Create a timeout promise
   */
  createTimeout(ms) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        const error = new Error('Request timeout');
        error.name = 'TimeoutError';
        reject(error);
      }, ms);
    });
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get queue stats
   */
  getStats() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentRequests = this.requestTimestamps.filter(ts => ts > oneMinuteAgo).length;
    
    return {
      queueLength: this.queue.length,
      requestsThisMinute: recentRequests,
      rateLimitCapacity: this.MAX_REQUESTS_PER_MINUTE,
      nextAvailableIn: this.getWaitTime()
    };
  }

  /**
   * Clear queue (emergency stop)
   */
  clearQueue() {
    const count = this.queue.length;
    this.queue.forEach(item => {
      item.reject(new Error('Queue cleared'));
    });
    this.queue = [];
    console.log(`🗑️ Cleared ${count} items from queue`);
  }
}

// Singleton instance
const rateLimitQueue = new RateLimitQueue();

module.exports = rateLimitQueue;
