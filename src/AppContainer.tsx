import { AppContainerDimensions, AppContainerMode, AppContextProvider } from '@/contexts/AppContext'
import { useEffect, useState } from 'react'
import App from './App'

export function AppContainer({ mode }: { mode: AppContainerMode }) {
  const [dimensions, setDimensions] = useState<AppContainerDimensions>({
    width: mode === 'popup' ? 400 : window.innerWidth,
    height: mode === 'popup' ? 600 : window.innerHeight,
  })

  useEffect(() => {
    const updateDimensions = () => {
      if (mode !== 'popup') {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        })
      }
    }

    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [mode])

  return (
    <AppContextProvider mode={mode} dimensions={dimensions}>
      <div
        className={`extension-container ${mode}`}
        style={{
          width: dimensions.width,
          height: dimensions.height,
          maxHeight: mode === 'popup' ? '600px' : '100vh',
          overflow: mode === 'popup' ? 'auto' : 'auto',
        }}
      >
        <App />
      </div>
    </AppContextProvider>
  )
}
