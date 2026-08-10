import { BookOpen } from 'lucide-react'
import { ItemMethods, ItemStaticMethods } from '../base/methods'
import { ItemFormFieldFlags } from '../useItemDialog'
import { ExamForm } from './form'
import { ItemExam } from './modelSchema'

export class ItemExamMethods extends ItemMethods {
  constructor(readonly item: ItemExam) {
    super(item)
  }
  getDate() {
    return this.item.startsAt
  }
  getIcon() {
    return <BookOpen className="w-4 h-4" />
  }
  getPriorityColorClass() {
    return 'border-l-8 border-l-blue-500'
  }
  getMetadata() {
    return <div className="text-xs">{this.item.weight}%</div>
  }
  getTypeColorClass() {
    return 'bg-rose-500'
  }
}

export const ItemExamStaticMethods: ItemStaticMethods = {
  getForm(hidden: ItemFormFieldFlags, disabled: ItemFormFieldFlags): React.ReactNode {
    return <ExamForm hidden={hidden} disabled={disabled} />
  },
}
