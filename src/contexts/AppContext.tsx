import React, { createContext, useContext } from 'react'

export type AppContainerMode = 'popup' | 'sidepanel' | 'newtab' | 'tab' | 'overlay' | 'web'

export type AppContainerDimensions = {
  width: number
  height: number
}

interface AppContextValue {
  mode: AppContainerMode
  dimensions?: AppContainerDimensions
  isExtension: boolean
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

interface AppContextProviderProps {
  mode?: AppContainerMode
  dimensions?: AppContainerDimensions
}

export function AppContextProvider({ mode, dimensions, children }: React.PropsWithChildren<AppContextProviderProps>) {
  const isExtension = Boolean(mode !== 'web')

  const value: AppContextValue = {
    mode: mode ?? 'web',
    dimensions,
    isExtension,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppContextProvider')
  }
  return context
}
