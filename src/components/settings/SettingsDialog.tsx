import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SettingsDialog as SettingsDialogType } from '@/hooks/useSettingsDialog'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dialog: SettingsDialogType | null
}

export default function SettingsDialog({ open, onOpenChange, dialog }: SettingsDialogProps) {
  if (!dialog) return null

  const { title, subtitle, Icon, Body } = dialog

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
        <DialogHeader className="">
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Icon className="w-5 h-5" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300">{subtitle}</DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <Body />
        </div>
      </DialogContent>
    </Dialog>
  )
}
