// Test setup file for Vitest
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vite-plus/test'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock crypto.randomUUID for consistent test results
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-123',
  },
})

// Mock Date.now for consistent timestamps
const mockTimestamp = 1640995200000 // 2022-01-01T00:00:00.000Z
global.Date.now = () => mockTimestamp
