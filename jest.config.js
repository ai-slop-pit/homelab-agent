module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: [
    'lib/**/*.js',
    'worker/**/*.js',
    'channels/**/*.js',
    '!lib/test/**',
    '!worker/test/**',
    '!channels/**/test/**',
    '!node_modules/**'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/test/',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  testTimeout: 10000,
  verbose: true
}
