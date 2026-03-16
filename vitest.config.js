import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use jsdom environment for DOM testing (View class tests)
    environment: 'jsdom',

    // Test file patterns
    include: ['test/**/*.test.js'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.js'],
      exclude: ['src/**/*.test.js', 'src/index.js']
    },

    // Global test timeout
    testTimeout: 5000,

    // Show test output
    reporter: 'verbose'
  }
});
