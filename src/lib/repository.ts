import type { StorageAdapter } from './hybrid-storage'

export interface Migration<T = any> {
  from: string
  to: string
  migrate: (data: any) => T
}

export interface RepositoryConfig<S extends object, E = S> {
  storage: StorageAdapter
  storageKey: string
  serialize: (state: S) => E
  deserialize: (data: E) => S
  migrations: Migration[]
}

export interface Repository<S extends object> {
  load(createInitial: () => S): Promise<S>
  save(state: S): Promise<void>
  subscribe(listener: (state: S) => void): () => void
  patch(proxy: S, newState: S): void
}

export function createRepository<S extends object, E = any>(config: RepositoryConfig<S, E>): Repository<S> {
  const { storage, storageKey, serialize, deserialize, migrations } = config

  return {
    async load(createInitial: () => S): Promise<S> {
      try {
        const data = await storage.getItem(storageKey)
        if (!data) {
          return createInitial()
        }
        const migrated = applyMigrations(data, migrations)
        return deserialize(migrated)
      } catch (error) {
        console.error('Failed to load state from storage:', error)
        return createInitial()
      }
    },

    async save(state: S): Promise<void> {
      const exchangeData = serialize(state)
      await storage.setItem(storageKey, exchangeData)
    },

    subscribe(listener: (state: S) => void): () => void {
      const wrapped = (key: string, newValue: any) => {
        if (key === storageKey && newValue) {
          const migrated = applyMigrations(newValue, migrations)
          listener(deserialize(migrated))
        }
      }
      storage.addChangeListener(wrapped)
      return () => storage.removeChangeListener(wrapped)
    },

    patch(proxy: S, newState: S): void {
      updateProxyFromState(proxy, newState, false)
    },
  }
}

function applyMigrations(data: any, migrations: Migration[]): any {
  if (!data || !data.version) {
    return data
  }
  let current = data
  for (const migration of migrations) {
    if (current.version === migration.from) {
      current = migration.migrate(current)
    }
  }
  return current
}

function updateProxyFromState<S extends object>(proxy: S, newState: S, patch = false) {
  const p = proxy as any
  const n = newState as any
  if (!patch) {
    Object.keys(p).forEach(key => {
      if (!(key in n)) {
        delete p[key]
      }
    })
  }

  Object.keys(n).forEach(key => {
    const newValue = n[key]
    const currentValue = p[key]

    if (Array.isArray(newValue)) {
      if (Array.isArray(currentValue)) {
        currentValue.length = 0
        currentValue.push(...newValue)
      } else {
        p[key] = newValue
      }
    } else if (newValue && typeof newValue === 'object') {
      if (currentValue && typeof currentValue === 'object' && !Array.isArray(currentValue)) {
        updateProxyFromState(currentValue, newValue, patch)
      } else {
        p[key] = newValue
      }
    } else {
      p[key] = newValue
    }
  })
}
