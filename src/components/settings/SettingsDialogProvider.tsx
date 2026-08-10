import { useSettingsDialog } from '@/hooks/useSettingsDialog'
import React, { createContext, useContext } from 'react'
import SettingsDialog from './SettingsDialog'

interface SettingsDialogContextValue {
  openDialog: (id: string) => void
  closeDialog: () => void
}

const SettingsDialogContext = createContext<SettingsDialogContextValue | undefined>(undefined)

export function useSettingsDialogContext() {
  const context = useContext(SettingsDialogContext)
  if (!context) {
    throw new Error('useSettingsDialogContext must be used within a SettingsDialogProvider')
  }
  return context
}

interface SettingsDialogProviderProps {
  children: React.ReactNode
}

export default function SettingsDialogProvider({ children }: SettingsDialogProviderProps) {
  const { activeDialog, openDialog, closeDialog, currentDialog } = useSettingsDialog()

  return (
    <SettingsDialogContext.Provider value={{ openDialog, closeDialog }}>
      {children}

      {/* Global Settings Dialog */}
      <SettingsDialog open={!!activeDialog} onOpenChange={() => closeDialog()} dialog={currentDialog} />
    </SettingsDialogContext.Provider>
  )
}
