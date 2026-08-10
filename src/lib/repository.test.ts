import { proxy } from 'valtio'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createRepository, type RepositoryConfig } from './repository'
import type { StorageAdapter } from './hybrid-storage'

class InMemoryStorage implements StorageAdapter {
  store = new Map<string, any>()
  listeners = new Set<(key: string, newValue: any, oldValue?: any) => void>()

  get name() {
    return 'InMemory'
  }
  isAvailable() {
    return true
  }
  async getItem(key: string) {
    return this.store.get(key)
  }
  async setItem(key: string, value: any) {
    const oldValue = this.store.get(key)
    this.store.set(key, value)
    this.listeners.forEach(l => l(key, value, oldValue))
  }
  async removeItem(key: string) {
    this.store.delete(key)
  }
  async clear() {
    this.store.clear()
  }
  async getStorageInfo() {
    return { used: 0, available: Infinity, quota: Infinity }
  }
  addChangeListener(listener: (key: string, newValue: any, oldValue?: any) => void): void {
    this.listeners.add(listener)
  }
  removeChangeListener(listener: (key: string, newValue: any, oldValue?: any) => void): void {
    this.listeners.delete(listener)
  }
}

interface TestState {
  value: number
  label: string
  tags: string[]
  nested: { a: number; b: number }
}

function identitySerialize(state: TestState): TestState {
  return state
}

function identityDeserialize(data: TestState): TestState {
  return data
}

function makeConfig(storage: InMemoryStorage): RepositoryConfig<TestState, TestState> {
  return {
    storage,
    storageKey: 'test-key',
    serialize: identitySerialize,
    deserialize: identityDeserialize,
    migrations: [],
  }
}

function makeInitialState(): TestState {
  return { value: 0, label: 'init', tags: [], nested: { a: 1, b: 2 } }
}

describe('createRepository', () => {
  let storage: InMemoryStorage

  beforeEach(() => {
    storage = new InMemoryStorage()
  })

  describe('load', () => {
    it('returns the initial state when storage is empty', async () => {
      const repo = createRepository(makeConfig(storage))
      const state = await repo.load(makeInitialState)
      expect(state).toEqual(makeInitialState())
    })

    it('returns the deserialized state from storage', async () => {
      const stored = { value: 42, label: 'stored', tags: ['x'], nested: { a: 10, b: 20 } }
      storage.store.set('test-key', stored)

      const repo = createRepository(makeConfig(storage))
      const state = await repo.load(makeInitialState)

      expect(state).toEqual(stored)
    })

    it('returns the initial state when deserialization throws', async () => {
      storage.store.set('test-key', 'bad-data')
      const config: RepositoryConfig<TestState, TestState> = {
        storage,
        storageKey: 'test-key',
        serialize: identitySerialize,
        deserialize: () => {
          throw new Error('parse error')
        },
        migrations: [],
      }
      const repo = createRepository(config)
      const state = await repo.load(makeInitialState)
      expect(state).toEqual(makeInitialState())
    })
  })

  describe('save', () => {
    it('serializes the state and writes it to storage', async () => {
      const repo = createRepository(makeConfig(storage))
      const state = { value: 7, label: 'saved', tags: ['a'], nested: { a: 1, b: 2 } }

      await repo.save(state)

      const stored = storage.store.get('test-key')
      expect(stored).toEqual(state)
    })

    it('uses the serialize function to transform before writing', async () => {
      const config: RepositoryConfig<TestState, TestState> = {
        storage,
        storageKey: 'test-key',
        serialize: s => ({ ...s, label: 'serialized:' + s.label }),
        deserialize: identityDeserialize,
        migrations: [],
      }
      const repo = createRepository(config)

      await repo.save({ value: 1, label: 'raw', tags: [], nested: { a: 1, b: 2 } })

      const stored = storage.store.get('test-key')
      expect(stored.label).toBe('serialized:raw')
    })
  })

  describe('subscribe', () => {
    it('calls the listener when the storage key changes', async () => {
      const repo = createRepository(makeConfig(storage))
      const listener = vi.fn()
      repo.subscribe(listener)

      const stored = { value: 99, label: 'from-other-tab', tags: [], nested: { a: 1, b: 2 } }
      await storage.setItem('test-key', stored)

      expect(listener).toHaveBeenCalledWith(stored)
    })

    it('does not call the listener when a different key changes', async () => {
      const repo = createRepository(makeConfig(storage))
      const listener = vi.fn()
      repo.subscribe(listener)

      await storage.setItem('other-key', { value: 1 })

      expect(listener).not.toHaveBeenCalled()
    })

    it('returns an unsubscribe function', async () => {
      const repo = createRepository(makeConfig(storage))
      const listener = vi.fn()
      const unsubscribe = repo.subscribe(listener)

      unsubscribe()
      await storage.setItem('test-key', { value: 1, label: 'x', tags: [], nested: { a: 1, b: 2 } })

      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('patch', () => {
    it('updates the proxy in place with the new state values', () => {
      const repo = createRepository(makeConfig(storage))
      const stateProxy = proxy<TestState>(makeInitialState())

      repo.patch(stateProxy, { value: 5, label: 'patched', tags: ['t'], nested: { a: 3, b: 4 } })

      expect(stateProxy.value).toBe(5)
      expect(stateProxy.label).toBe('patched')
      expect(stateProxy.tags).toEqual(['t'])
      expect(stateProxy.nested.a).toBe(3)
      expect(stateProxy.nested.b).toBe(4)
    })

    it('removes keys from the proxy that are absent in the new state (full replace, not patch)', () => {
      const repo = createRepository(makeConfig(storage))
      const stateProxy = proxy<TestState>(makeInitialState())

      repo.patch(stateProxy, { value: 1, label: 'x', tags: [], nested: { a: 0, b: 0 } })

      expect(Object.keys(stateProxy)).toEqual(['value', 'label', 'tags', 'nested'])
    })

    it('updates arrays in place to maintain valtio reactivity', () => {
      const repo = createRepository(makeConfig(storage))
      const stateProxy = proxy<TestState>(makeInitialState())

      repo.patch(stateProxy, { value: 0, label: 'init', tags: ['a', 'b', 'c'], nested: { a: 1, b: 2 } })

      expect(stateProxy.tags).toEqual(['a', 'b', 'c'])
      expect(Array.isArray(stateProxy.tags)).toBe(true)
    })

    it('recurses into nested objects', () => {
      const repo = createRepository(makeConfig(storage))
      const stateProxy = proxy<TestState>(makeInitialState())

      repo.patch(stateProxy, { value: 0, label: 'init', tags: [], nested: { a: 99, b: 88 } })

      expect(stateProxy.nested.a).toBe(99)
      expect(stateProxy.nested.b).toBe(88)
    })
  })

  describe('with migrations', () => {
    it('runs the matching migration when the data version is old', async () => {
      const migrate = vi.fn((data: any) => ({ ...data, label: 'migrated:' + data.label }))
      const config: RepositoryConfig<TestState, any> = {
        storage,
        storageKey: 'test-key',
        serialize: identitySerialize,
        deserialize: (data: any) => data as TestState,
        migrations: [{ from: '1', to: '2', migrate }],
      }
      storage.store.set('test-key', { version: '1', value: 1, label: 'old', tags: [], nested: { a: 0, b: 0 } })

      const repo = createRepository(config)
      const state = await repo.load(makeInitialState)

      expect(migrate).toHaveBeenCalledOnce()
      expect(state.label).toBe('migrated:old')
    })

    it('skips the migration when the data version is already current', async () => {
      const migrate = vi.fn()
      const config: RepositoryConfig<TestState, any> = {
        storage,
        storageKey: 'test-key',
        serialize: identitySerialize,
        deserialize: (data: any) => data as TestState,
        migrations: [{ from: '1', to: '2', migrate }],
      }
      storage.store.set('test-key', { version: '2', value: 2, label: 'new', tags: [], nested: { a: 0, b: 0 } })

      const repo = createRepository(config)
      const state = await repo.load(makeInitialState)

      expect(migrate).not.toHaveBeenCalled()
      expect(state.label).toBe('new')
    })
  })
})
