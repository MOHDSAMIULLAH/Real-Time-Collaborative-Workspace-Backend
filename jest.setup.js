// Set NODE_ENV to test for all Jest tests
process.env.NODE_ENV = 'test';
console.log('Jest setup: NODE_ENV set to', process.env.NODE_ENV);

// Increase JWT expiration for tests to avoid token expiry issues
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_EXPIRES_IN = '24h';

// Disable rate limiting for tests by setting very high limits
process.env.RATE_LIMIT_MAX_REQUESTS = '10000';
process.env.RATE_LIMIT_WINDOW_MS = '900000';
