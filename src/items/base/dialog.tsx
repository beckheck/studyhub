import { Button } from '@/components/ui/button'
import ColorPicker from '@/components/ui/color-picker'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FormError } from '@/components/ui/form-error'
import { Input } from '@/components/ui/input'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { SimpleSelect, SimpleSelectOption } from '@/components/ui/simple-select'
import { useCourses, useProjects } from '@/hooks/useStore'
import { t } from '@/i18n/config'
import { ItemForm, itemFormSchemaMap } from '@/items/forms'
import { ITEM_TYPES, ItemType, Item } from '@/items/models'
import { ItemFormFieldFlags } from '@/items/useItemDialog'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { getItemStaticMethods } from '../methods'
import { LabelWithRequiredIndicator, isFieldRequired } from './LabelWithRequiredIndicator'

export interface ItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingItem: Item | null
  itemType: ItemType
  form: ItemForm
  hidden: ItemFormFieldFlags
  disabled: ItemFormFieldFlags
  availableItemTypes?: ItemType[]
  onTypeChange?: (newType: ItemType, currentFormData?: ItemForm) => void
  onSave: (data: ItemForm) => void
  onDelete: () => void
}

export function ItemDialog({
  open,
  onOpenChange,
  editingItem,
  itemType,
  form,
  hidden,
  disabled,
  availableItemTypes,
  onTypeChange,
  onSave,
  onDelete,
}: ItemDialogProps) {
  const { courses } = useCourses()
  const { projects } = useProjects()
  const [showScrollHint, setShowScrollHint] = useState(false)
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(null)

  // Callback ref to ensure we capture the element when it's actually mounted
  const scrollContainerCallbackRef = useCallback((node: HTMLDivElement | null) => {
    setScrollContainer(node)
  }, [])

  const getSchema = () => itemFormSchemaMap[itemType]

  // Initialize React Hook Form with appropriate schema
  const methods = useForm({
    resolver: zodResolver(getSchema()),
    defaultValues: form,
  })

  const {
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = methods

  const currentSchema = getSchema()

  const watchedNotes = watch('notes')

  // Only reset when dialog opens or item type changes (not on every form change)
  useEffect(() => {
    if (open) {
      reset(form)
    }
  }, [open, itemType, reset])

  // Check if content is scrollable
  useEffect(() => {
    if (!open) {
      setShowScrollHint(false)
      return
    }

    if (!scrollContainer) {
      return
    }

    const checkScrollable = () => {
      const isScrollable = scrollContainer.scrollHeight > scrollContainer.clientHeight
      const isAtBottom =
        Math.abs(scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight) < 1

      setShowScrollHint(isScrollable && !isAtBottom)
    }

    checkScrollable()

    scrollContainer.addEventListener('scroll', checkScrollable, { passive: true })

    const resizeObserver = new ResizeObserver(checkScrollable)
    resizeObserver.observe(scrollContainer)

    return () => {
      scrollContainer.removeEventListener('scroll', checkScrollable)
      resizeObserver.disconnect()
    }
  }, [open, scrollContainer])

  const onSubmit = (data: ItemForm) => {
    onSave(data)
  }

  const getDialogTitle = () => {
    const action = editingItem ? 'edit' : 'add'
    return t(`items:${itemType}.actions.${action}`)
  }

  const getDialogDescription = () => {
    const action = editingItem ? 'edit' : 'add'
    return t(`items:${itemType}.descriptions.${action}`)
  }

  const ItemStaticMethods = getItemStaticMethods(itemType)

  const itemTypeOptions: SimpleSelectOption[] = (availableItemTypes || ITEM_TYPES).map(value => ({
    value,
    label: t(`items:${value}.title`),
  }))
  if (itemTypeOptions.length > 1) {
    itemTypeOptions.push({
      value: '__warning__',
      disabled: true,
      label: (
        <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-700 dark:text-amber-300">{t('items:common.warnings.typeChangeWarning')}</p>
        </div>
      ),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`rounded-2xl ${
          watchedNotes?.trim() ? 'max-w-lg lg:max-w-5xl' : 'max-w-lg'
        } max-h-[90vh] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600`}
      >
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-gray-100">{getDialogTitle()}</DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300">{getDialogDescription()}</DialogDescription>
        </DialogHeader>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Scrollable content area */}
            <div className="relative">
              <div className="max-h-[60vh] overflow-y-auto" ref={scrollContainerCallbackRef}>
                <div className="space-y-4">
                  <div className={`grid gap-4 lg:gap-6 ${watchedNotes?.trim() ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
                    <div className="space-y-4 lg:col-span-1">
                      {/* Item type selector - shown only if type change is enabled */}
                      {!hidden.type && (
                        <div>
                          <LabelWithRequiredIndicator
                            required={isFieldRequired(currentSchema, 'type')}
                            value={itemType}
                          >
                            {t('items:common.fields.type')}
                          </LabelWithRequiredIndicator>
                          <SimpleSelect
                            value={itemType}
                            onValueChange={(newType: string) => {
                              if (onTypeChange && newType !== itemType) {
                                // Get current form data from react-hook-form and pass it to onTypeChange
                                const currentFormData = methods.getValues() as ItemForm
                                onTypeChange(newType as ItemType, currentFormData)
                              }
                            }}
                            placeholder={t('items:common.fields.type')}
                            className="rounded-xl"
                            disabled={disabled.type}
                            options={itemTypeOptions}
                          />
                        </div>
                      )}

                      {/* Common fields */}
                      {!hidden.title && (
                        <div>
                          <LabelWithRequiredIndicator
                            required={isFieldRequired(currentSchema, 'title')}
                            value={methods.watch('title')}
                          >
                            {t('items:common.fields.title')}
                          </LabelWithRequiredIndicator>
                          <Input
                            {...methods.register('title')}
                            className="rounded-xl"
                            disabled={disabled.title}
                            placeholder={t(`items:${itemType}.placeholders.title`)}
                          />
                          <FormError message={errors.title?.message} />
                        </div>
                      )}

                      {!hidden.courseId && (
                        <div>
                          <LabelWithRequiredIndicator
                            required={isFieldRequired(currentSchema, 'courseId')}
                            value={methods.watch('courseId')}
                          >
                            {t('items:common.fields.course')}
                          </LabelWithRequiredIndicator>
                          <SimpleSelect
                            value={methods.watch('courseId') || 'none'}
                            onValueChange={value => {
                              const courseId = value === 'none' ? '' : value
                              methods.setValue('courseId', courseId)
                            }}
                            placeholder={t('items:common.fields.course')}
                            className="rounded-xl"
                            disabled={disabled.courseId}
                            options={[
                              { value: 'none', label: t('common:common.none') },
                              ...courses.map(c => ({
                                value: c.id,
                                label: c.title,
                              })),
                            ]}
                          />
                          <FormError message={errors.courseId?.message} />
                        </div>
                      )}

                      {!hidden.projectId && (
                        <div>
                          <LabelWithRequiredIndicator
                            required={isFieldRequired(currentSchema, 'projectId')}
                            value={methods.watch('projectId')}
                          >
                            {t('items:common.fields.project')}
                          </LabelWithRequiredIndicator>
                          <SimpleSelect
                            value={methods.watch('projectId') || 'none'}
                            onValueChange={value => {
                              const projectId = value === 'none' ? '' : value
                              methods.setValue('projectId', projectId)
                            }}
                            placeholder={t('items:common.fields.project')}
                            className="rounded-xl"
                            disabled={disabled.projectId}
                            options={[
                              { value: 'none', label: t('common:common.none') },
                              ...projects.map(project => ({
                                value: project.id,
                                label: project.title,
                              })),
                            ]}
                          />
                          <FormError message={errors.projectId?.message} />
                        </div>
                      )}

                      {/* Type-specific form */}
                      {ItemStaticMethods.getForm(hidden, disabled)}

                      {!hidden.color && (
                        <div>
                          <LabelWithRequiredIndicator
                            required={isFieldRequired(currentSchema, 'color')}
                            value={methods.watch('color')}
                          >
                            {t('items:common.fields.color')}
                          </LabelWithRequiredIndicator>
                          <ColorPicker
                            label=""
                            value={methods.watch('color') || '#3b82f6'}
                            onChange={color => {
                              methods.setValue('color', color)
                            }}
                          />
                          <FormError message={errors.color?.message} />
                        </div>
                      )}
                    </div>

                    {/* Notes section - single instance that moves between columns */}
                    <div className={`space-y-4 ${watchedNotes?.trim() ? 'lg:col-span-1' : 'lg:col-span-1 lg:-mt-4'}`}>
                      {!hidden.notes && (
                        <div>
                          <LabelWithRequiredIndicator
                            required={isFieldRequired(currentSchema, 'notes')}
                            value={methods.watch('notes')}
                          >
                            {t('items:common.fields.notes')}
                          </LabelWithRequiredIndicator>
                          <RichTextEditor
                            content={methods.watch('notes') || ''}
                            onChange={content => {
                              methods.setValue('notes', content)
                            }}
                            placeholder={t(`items:${itemType}.placeholders.notes`)}
                            className="mt-1"
                            toolsWhenEmpty={['checkbox', 'attachment']}
                            disabled={disabled.notes}
                          />
                          <FormError message={errors.notes?.message} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Scroll hint indicator - positioned relative to the outer relative container */}
              {showScrollHint && (
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white dark:from-gray-800 to-transparent flex items-end justify-center pb-1 pointer-events-none">
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 animate-pulse">
                    <span>{t('common:common.scrollForMore')}</span>
                    <ChevronDown className="w-3 h-3" />
                  </div>
                </div>
              )}
            </div>

            {/* Fixed footer with buttons */}
            <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-600">
              <Button type="submit" className="rounded-xl flex-1">
                {t('common:actions.save')}
              </Button>
              {editingItem && (
                <Button type="button" variant="destructive" onClick={onDelete} className="rounded-xl px-4">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  )
}
