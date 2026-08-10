import { ItemList } from '@/items/ItemList'
import { ItemDialogExample } from '@/items/ItemDialogExample'
import { Card } from '@/components/ui/card'

export default function TestTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tests (Development Only)</h1>
        <div className="text-sm text-muted-foreground">This tab is only visible in development environment</div>
      </div>

      <div className="p-6 max-w-4xl mx-auto space-y-3">
        <Card className="p-4">
          <ItemList />
        </Card>

        <Card className="p-4">
          <ItemDialogExample />
        </Card>
      </div>
    </div>
  )
}
