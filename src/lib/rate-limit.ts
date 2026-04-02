export interface RateLimitOptions {
    limit: number;
    windowMs: number;
}

const rateLimiters = new Map<string, Map<string, { count: number; timestamp: number }>>();

export function createRateLimiter(id: string, options: RateLimitOptions) {
    if (!rateLimiters.has(id)) {
        rateLimiters.set(id, new Map());
    }

    const ipMap = rateLimiters.get(id)!;

    return function rateLimit(ip: string): { success: boolean; limit: number; remaining: number; reset: number } {
        const now = Date.now();
        const record = ipMap.get(ip);

        // Clean up old records randomly (~10% chance) to prevent memory leaks from inactive IPs
        if (Math.random() < 0.1) {
            ipMap.forEach((val, key) => {
                if (now - val.timestamp > options.windowMs) {
                    ipMap.delete(key);
                }
            });
        }

        if (!record || now - record.timestamp > options.windowMs) {
            ipMap.set(ip, { count: 1, timestamp: now });
            return {
                success: true,
                limit: options.limit,
                remaining: options.limit - 1,
                reset: now + options.windowMs,
            };
        }

        if (record.count >= options.limit) {
            return {
                success: false,
                limit: options.limit,
                remaining: 0,
                reset: record.timestamp + options.windowMs,
            };
        }

        record.count += 1;
        
        return {
            success: true,
            limit: options.limit,
            remaining: options.limit - record.count,
            reset: record.timestamp + options.windowMs,
        };
    };
}
