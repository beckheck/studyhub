import { fileAttachmentStorage } from '@/stores/app'
import { cn } from '@/lib/utils'
import { Node, mergeAttributes } from '@tiptap/core'
import Blockquote from '@tiptap/extension-blockquote'
import { Color } from '@tiptap/extension-color'
import { FontFamily } from '@tiptap/extension-font-family'
import { FontSize } from '@tiptap/extension-font-size'
import { Highlight } from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import { TextStyle } from '@tiptap/extension-text-style'
import { Underline } from '@tiptap/extension-underline'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  CheckSquare,
  Highlighter,
  ImageIcon,
  Italic,
  List,
  ListOrdered,
  Palette,
  Paperclip,
  Quote,
  Redo,
  Underline as UnderlineIcon,
  Undo,
} from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { Button } from './button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

// Available toolbar button keys for configuration
export type ToolbarButtonKey =
  | 'undo'
  | 'redo'
  | 'separator'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'colorPicker'
  | 'highlight'
  | 'bulletList'
  | 'orderedList'
  | 'checkbox'
  | 'blockquote'
  | 'image'
  | 'attachment'
  | 'heading'
  | 'fontFamily'
  | 'fontSize'

// Default full toolbar configuration
const FULL_TOOLBAR_ITEMS: ToolbarButtonKey[] = [
  'undo',
  'redo',
  'separator',
  'bold',
  'italic',
  'underline',
  'separator',
  'colorPicker',
  'highlight',
  'separator',
  'bulletList',
  'orderedList',
  'checkbox',
  'blockquote',
  'separator',
  'image',
  'attachment',
  'separator',
  'heading',
  'fontFamily',
  'fontSize',
]

// Dropdown configurations to reduce duplication
const FONT_FAMILIES = [
  { value: 'default', label: 'Default' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Times New Roman', label: 'Times' },
  { value: 'Courier New', label: 'Courier' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Verdana', label: 'Verdana' },
] as const

const FONT_SIZES = [
  { value: 'default', label: 'Default' },
  { value: '12px', label: '12px' },
  { value: '14px', label: '14px' },
  { value: '16px', label: '16px' },
  { value: '18px', label: '18px' },
  { value: '20px', label: '20px' },
  { value: '24px', label: '24px' },
  { value: '28px', label: '28px' },
  { value: '32px', label: '32px' },
  { value: '36px', label: '36px' },
  { value: '48px', label: '48px' },
] as const

const HEADING_OPTIONS = [
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
  { value: 'h4', label: 'Heading 4' },
  { value: 'h5', label: 'Heading 5' },
  { value: 'h6', label: 'Heading 6' },
] as const

// Color palettes for text and highlight colors
const TEXT_COLORS = [
  '#000000',
  '#374151',
  '#6B7280',
  '#9CA3AF',
  '#D1D5DB',
  '#F3F4F6',
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#EAB308',
  '#84CC16',
  '#22C55E',
  '#10B981',
  '#14B8A6',
  '#06B6D4',
  '#0EA5E9',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#A855F7',
  '#D946EF',
  '#EC4899',
  '#F43F5E',
  '#FB7185',
] as const

const HIGHLIGHT_COLORS = [
  '#FEF3C7',
  '#FDE68A',
  '#FCD34D',
  '#FBBF24',
  '#F59E0B',
  '#D97706',
  '#FEE2E2',
  '#FECACA',
  '#FCA5A5',
  '#F87171',
  '#EF4444',
  '#DC2626',
  '#DBEAFE',
  '#BFDBFE',
  '#93C5FD',
  '#60A5FA',
  '#3B82F6',
  '#2563EB',
  '#D1FAE5',
  '#A7F3D0',
  '#6EE7B7',
  '#34D399',
  '#10B981',
  '#059669',
  '#E0E7FF',
  '#C7D2FE',
  '#A5B4FC',
  '#818CF8',
  '#6366F1',
  '#4F46E5',
  '#F3E8FF',
  '#DDD6FE',
  '#C4B5FD',
  '#A78BFA',
  '#8B5CF6',
  '#7C3AED',
] as const

// File Attachment Extension
interface FileAttachmentOptions {
  HTMLAttributes: Record<string, any>
  draggable: boolean
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fileAttachment: {
      setFileAttachment: (options: {
        fileId: string
        fileName: string
        fileSize: string
        fileIcon: string
      }) => ReturnType
    }
  }
}

const createFileAttachmentNode = (draggable: boolean) =>
  Node.create<FileAttachmentOptions>({
    name: 'fileAttachment',

    addOptions() {
      return {
        HTMLAttributes: {},
        draggable,
      }
    },

    group: 'block',

    atom: true,
    draggable,

    addAttributes() {
      return {
        fileId: {
          default: null,
        },
        fileName: {
          default: null,
        },
        fileSize: {
          default: null,
        },
        fileIcon: {
          default: '📎',
        },
      }
    },

    parseHTML() {
      return [
        {
          tag: 'div[data-type="file-attachment"]',
        },
      ]
    },

    renderHTML({ HTMLAttributes }) {
      // Determine if file can be viewed in browser
      const _fileName = HTMLAttributes.fileName || ''

      return [
        'div',
        mergeAttributes(
          {
            'data-type': 'file-attachment',
            class: 'file-attachment',
            'data-file-id': HTMLAttributes.fileId,
            'data-file-name': HTMLAttributes.fileName,
            'data-file-size': HTMLAttributes.fileSize,
            contenteditable: 'false',
            draggable,
            tabindex: '0', // Make focusable
          },
          this.options.HTMLAttributes,
          HTMLAttributes,
        ),
        ['span', { class: 'file-icon' }, HTMLAttributes.fileIcon],
        [
          'div',
          { class: 'file-info' },
          ['div', { class: 'file-name' }, HTMLAttributes.fileName],
          ['div', { class: 'file-size' }, HTMLAttributes.fileSize],
        ],
      ]
    },

    addCommands() {
      return {
        setFileAttachment:
          options =>
          ({ commands }) => {
            return commands.insertContent({
              type: this.name,
              attrs: options,
            })
          },
      }
    },
  })

// File attachment keyboard navigation handlers
const handleFileAttachmentKeydown = async (fileAttachment: HTMLElement, event: KeyboardEvent, editor: any) => {
  switch (event.key) {
    case 'Enter':
      await handleFileAttachmentOpen(fileAttachment, event)
      break
    case 'Backspace':
    case 'Delete':
      await handleFileAttachmentDelete(fileAttachment, event, editor)
      break
    case 'ArrowLeft':
    case 'ArrowRight':
    case 'ArrowUp':
    case 'ArrowDown':
      moveCursorFromFileAttachment(fileAttachment, event, editor)
      break
  }
}

const handleArrowKeyNavigation = (event: KeyboardEvent, editor: any) => {
  // Get current cursor position
  const { selection } = editor.state
  const { $from } = selection

  // Look for adjacent file attachments
  let fileAttachmentElement: HTMLElement | null = null

  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    // Check for file attachment before cursor
    const prevPos = Math.max(0, $from.pos)

    // Walk backwards to find a file attachment node
    let checkPos = prevPos
    while (checkPos > 0) {
      const node = editor.state.doc.nodeAt(checkPos)
      if (node && node.type.name === 'fileAttachment') {
        fileAttachmentElement = editor.view.nodeDOM(checkPos)
        break // Found a file attachment node, even if DOM lookup failed
      }
      // If we hit a different type of node, break
      if (node && node.type.name !== 'text' && node.type.name !== 'fileAttachment') {
        break
      }
      checkPos--
    }
  } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    // Check for file attachment after cursor
    const nextPos = Math.min(editor.state.doc.content.size, $from.pos)

    // Walk forwards to find a file attachment node
    let checkPos = nextPos
    const maxPos = editor.state.doc.content.size

    while (checkPos < maxPos) {
      const node = editor.state.doc.nodeAt(checkPos)
      if (node && node.type.name === 'fileAttachment') {
        fileAttachmentElement = editor.view.nodeDOM(checkPos)
        break // Found a file attachment node, even if DOM lookup failed
      }
      if (node && node.type.name !== 'text' && node.type.name !== 'fileAttachment') {
        break
      }
      checkPos++
    }
  }

  // Focus the file attachment if found
  if (fileAttachmentElement) {
    event.preventDefault()
    event.stopPropagation()
    fileAttachmentElement.focus()
  }
}

const moveCursorFromFileAttachment = (fileAttachment: HTMLElement, event: KeyboardEvent, editor: any) => {
  event.preventDefault()
  event.stopPropagation()
  let pos = editor.view.posAtDOM(fileAttachment, 0)
  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    pos = Math.max(0, pos - 1)
  } else {
    pos = Math.min(editor.state.doc.content.size, pos + 1)
  }
  const { state } = editor.view
  const tr = state.tr.setSelection(state.selection.constructor.near(state.doc.resolve(pos)))
  editor.view.dispatch(tr)
  editor.commands.focus()
}

/**
 * Shared hierarchical checkbox handling logic
 *
 * - Checking a checkbox checks all descendants.
 * - Checking a checkbox with all siblings checked checks the entire ancestor chain.
 * - Unchecking a checkbox unchecks all descendants and the entire ancestor chain.
 */
const handleHierarchicalCheckboxClick = (
  editor: any,
  target: HTMLElement,
  event: Event,
  onContentChange?: (content: string) => void,
  calculateProgress?: (editor: any) => void,
) => {
  // Only prevent propagation for checkbox clicks
  event.stopPropagation()
  event.stopImmediatePropagation()

  const checkbox = target as HTMLInputElement
  // Use the DOM checkbox's current state, not its inverse
  const newCheckedState = checkbox.checked

  try {
    // For read-only editors, temporarily make editable
    const wasEditable = editor.isEditable
    if (!wasEditable) {
      editor.setEditable(true)
    }

    // Find the position of the checkbox in the editor
    const pos = editor.view.posAtDOM(target, 0)
    const { state } = editor.view
    const $pos = state.doc.resolve(pos)

    // Find the task item node that contains this checkbox and its depth
    let currentTaskItemPos = null
    let currentTaskItemDepth = null
    for (let depth = $pos.depth; depth > 0; depth--) {
      const node = $pos.node(depth)
      if (node.type.name === 'taskItem') {
        currentTaskItemPos = $pos.before(depth)
        currentTaskItemDepth = depth
        break
      }
    }

    if (currentTaskItemPos !== null && currentTaskItemDepth !== null) {
      // Start building the transaction
      let tr = state.tr

      // First, update the clicked task item to match the DOM checkbox state
      tr = tr.setNodeMarkup(currentTaskItemPos, null, { checked: newCheckedState })

      const currentTaskItemNode = state.doc.nodeAt(currentTaskItemPos)
      if (currentTaskItemNode) {
        // If checking a parent, check all children
        // If unchecking a parent, uncheck all children
        currentTaskItemNode.descendants((node: any, pos: number) => {
          if (node.type.name === 'taskItem') {
            const childPos = currentTaskItemPos + pos + 1
            tr = tr.setNodeMarkup(childPos, null, { checked: newCheckedState })
          }
        })

        // Handle parent updates based on children's state
        if (!newCheckedState) {
          // If unchecking a child, uncheck ALL parents up the chain
          let searchDepth = currentTaskItemDepth - 1
          while (searchDepth > 0) {
            const potentialParent = $pos.node(searchDepth)
            if (potentialParent.type.name === 'taskItem') {
              const parentPos = $pos.before(searchDepth)
              tr = tr.setNodeMarkup(parentPos, null, { checked: false })
            }
            searchDepth--
          }
        } else {
          // If checking a child, update parents based on their children's state
          // This needs to be done recursively up the chain because each parent update
          // can affect its own parent

          // We need to track the updated states in our transaction to make accurate decisions
          const updatedStates = new Map<number, boolean>()
          updatedStates.set(currentTaskItemPos, newCheckedState)

          // Also track all descendants that were updated
          currentTaskItemNode.descendants((node: any, pos: number) => {
            if (node.type.name === 'taskItem') {
              const childPos = currentTaskItemPos + pos + 1
              updatedStates.set(childPos, newCheckedState)
            }
          })

          const updateParentBasedOnChildren = (parentPos: number, _parentDepth: number): boolean => {
            const parentNode = state.doc.nodeAt(parentPos)
            if (!parentNode || parentNode.type.name !== 'taskItem') return false

            // Find all direct children task items
            const directChildren: { pos: number; checked: boolean }[] = []

            // Walk through the parent node to find direct children
            parentNode.forEach((child: any, offset: number) => {
              const childPos = parentPos + offset + 1

              // Look for task lists that are direct children
              if (child.type.name === 'taskList') {
                child.forEach((taskItem: any, taskOffset: number) => {
                  if (taskItem.type.name === 'taskItem') {
                    const taskItemPos = childPos + taskOffset + 1

                    // Use the updated state from our transaction if available,
                    // otherwise use the original state
                    const checkedState = updatedStates.has(taskItemPos)
                      ? updatedStates.get(taskItemPos)!
                      : taskItem.attrs.checked || false

                    directChildren.push({ pos: taskItemPos, checked: checkedState })
                  }
                })
              }
            })

            // Update parent based on children's state
            if (directChildren.length > 0) {
              // If all children are checked, check the parent
              const allChildrenChecked = directChildren.every(child => child.checked)
              const currentParentChecked = updatedStates.has(parentPos)
                ? updatedStates.get(parentPos)!
                : parentNode.attrs.checked || false

              // Only update if the state needs to change
              if (allChildrenChecked !== currentParentChecked) {
                tr = tr.setNodeMarkup(parentPos, null, { checked: allChildrenChecked })
                updatedStates.set(parentPos, allChildrenChecked)
                return true // Parent state changed
              }
            }

            return false // No change
          }

          // Look for parent task item by traversing up the document structure
          // Update all parents in the chain recursively
          let searchDepth = currentTaskItemDepth - 1
          let continueUpdating = true

          while (searchDepth > 0 && continueUpdating) {
            const potentialParent = $pos.node(searchDepth)
            if (potentialParent.type.name === 'taskItem') {
              const parentPos = $pos.before(searchDepth)
              const parentChanged = updateParentBasedOnChildren(parentPos, searchDepth)

              // If this parent didn't change state, we can stop propagating up
              // because higher ancestors won't be affected
              if (!parentChanged) {
                continueUpdating = false
              }
            }
            searchDepth--
          }
        }
      }

      // Dispatch the transaction
      editor.view.dispatch(tr)
    }

    // Handle post-update actions for read-only editors
    if (!wasEditable) {
      setTimeout(() => {
        const updatedContent = editor.getHTML()
        editor.setEditable(false)
        if (onContentChange) {
          onContentChange(updatedContent)
        }
        if (calculateProgress) {
          calculateProgress(editor)
        }
      }, 0)
    }
  } catch (error) {
    console.error('Error updating checkbox:', error)
    // Fallback: make sure editor stays in correct editable state
    if (!editor.isEditable) {
      editor.setEditable(false)
    }
  }
}

// File attachment click handler
async function handleFileAttachmentOpen(fileAttachment: HTMLElement, event?: Event) {
  // Stop event propagation to prevent parent click handlers from firing
  if (event) {
    event.preventDefault()
    event.stopPropagation()
  }

  const fileId = fileAttachment.getAttribute('data-file-id')
  const fileName = fileAttachment.getAttribute('data-file-name')

  if (fileId && fileName) {
    try {
      // Show loading state
      const originalIcon = fileAttachment.querySelector('.file-icon')
      const originalText = originalIcon?.textContent
      if (originalIcon) {
        originalIcon.textContent = '⏳'
        originalIcon.classList.add('loading')
      }

      // Load file data on demand
      const storedFile = await fileAttachmentStorage.getFile(fileId)

      // Restore original icon
      if (originalIcon && originalText) {
        originalIcon.textContent = originalText
        originalIcon.classList.remove('loading')
      }

      if (!storedFile) {
        console.error('File not found:', fileId)
        return
      }

      const fileData = storedFile.fileData

      // Handle file opening/downloading
      if (canViewInBrowser(fileName)) {
        try {
          // Convert base64 to blob for better browser compatibility
          const response = fetch(fileData)
          response
            .then(res => res.blob())
            .then(blob => {
              const blobUrl = URL.createObjectURL(blob)
              const newWindow = window.open(blobUrl, '_blank')

              // Clean up the blob URL after the window is closed or after a delay
              if (newWindow) {
                newWindow.addEventListener('beforeunload', () => {
                  URL.revokeObjectURL(blobUrl)
                })
                // Fallback cleanup after 30 seconds
                setTimeout(() => {
                  URL.revokeObjectURL(blobUrl)
                }, 30000)
              } else {
                // If popup was blocked, fallback to direct data URL
                window.open(fileData, '_blank')
              }
            })
            .catch(() => {
              // Fallback to direct data URL if blob conversion fails
              window.open(fileData, '_blank')
            })
        } catch {
          // Final fallback to direct data URL
          window.open(fileData, '_blank')
        }
      } else {
        // Download for non-viewable files
        const link = document.createElement('a')
        link.href = fileData
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error('Error handling file attachment click:', error)
    }
  }
}

// File attachment deletion handler
const handleFileAttachmentDelete = async (fileAttachment: HTMLElement, event: KeyboardEvent, editor: any) => {
  const fileId = fileAttachment.getAttribute('data-file-id')

  event.preventDefault()
  event.stopPropagation()

  // Delete the file attachment
  if (fileId && editor) {
    try {
      // Simple approach: find and delete the node by its fileId
      const { state } = editor.view
      let deleteSuccess = false

      // Find the file attachment node by iterating through the document
      state.doc.descendants((node, pos) => {
        if (node.type.name === 'fileAttachment' && node.attrs.fileId === fileId) {
          // Create transaction to delete this node
          const tr = state.tr.delete(pos, pos + node.nodeSize)
          editor.view.dispatch(tr)
          deleteSuccess = true

          return false // Stop iteration
        }
      })

      if (deleteSuccess) {
        // Focus back to editor
        setTimeout(() => {
          editor.commands.focus()
        }, 0)

        // Clean up the stored file after a small delay
        setTimeout(async () => {
          try {
            await fileAttachmentStorage.deleteFile(fileId)
          } catch (error) {
            console.error('Error deleting stored file:', error)
          }
        }, 100)
      } else {
        console.warn('Could not find file attachment node to delete with fileId:', fileId)

        // Fallback: try to remove the DOM element
        fileAttachment.remove()
        editor.commands.focus()
      }
    } catch (error) {
      console.error('Error during file attachment deletion:', error)
    }
  } else {
    console.warn('Missing fileId or editor for deletion')
  }
}

// Shared editor extensions configuration
const getEditorExtensions = (draggableAttachments: boolean, placeholder?: string) => [
  StarterKit.configure({
    blockquote: false, // We'll add our own blockquote extension
  }),
  Blockquote.configure({
    HTMLAttributes: {
      class: 'tiptap-blockquote',
    },
  }),
  TextStyle,
  Color,
  Highlight.configure({
    multicolor: true,
  }),
  FontFamily.configure({
    types: ['textStyle'],
  }),
  FontSize.configure({
    types: ['textStyle'],
  }),
  Underline,
  TaskList.configure({
    HTMLAttributes: {
      class: 'tiptap-task-list',
    },
  }),
  TaskItem.configure({
    nested: true,
    HTMLAttributes: {
      class: 'tiptap-task-item',
    },
  }),
  Image.configure({
    inline: false,
    allowBase64: true,
    HTMLAttributes: {
      class: 'tiptap-image',
    },
  }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: 'tiptap-link',
    },
  }),
  createFileAttachmentNode(draggableAttachments),
  ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
]

// Shared editor attributes configuration
const getEditorAttributes = (className?: string) => ({
  class: cn(
    'prose prose-sm dark:prose-invert max-w-none',
    'text-gray-900 dark:text-gray-100',
    // Override prose list styles
    'prose-ul:list-disc prose-ol:list-decimal',
    'prose-li:marker:text-gray-500 dark:prose-li:marker:text-gray-400',
    // Ensure blockquote styling
    'prose-blockquote:border-l-4 prose-blockquote:border-gray-300 dark:prose-blockquote:border-gray-600',
    'prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400',
    className,
  ),
})

// Helper to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  toolsWhenEmpty?: ToolbarButtonKey[] // Array of tool button keys to show when content is empty
}

export function RichTextEditor({
  content,
  onChange,
  placeholder,
  className,
  disabled = false,
  toolsWhenEmpty,
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const attachmentInputRef = useRef<HTMLInputElement>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)

  // Check if content is empty (no text content)
  const isContentEmpty = !content || content.trim() === '' || content.trim() === '<p></p>'
  const useSimplifiedToolbar = isContentEmpty && toolsWhenEmpty && toolsWhenEmpty.length > 0

  // Handle image upload
  const handleImageUpload = async (file: File) => {
    try {
      const base64 = await fileToBase64(file)
      if (editor) {
        editor.chain().focus().setImage({ src: base64 }).run()
      }
    } catch (error) {
      console.error('Error uploading image:', error)
    }
  }

  // Handle file attachment upload
  const handleFileAttachment = async (file: File) => {
    try {
      const metadata = await fileAttachmentStorage.storeFile(file)

      if (editor) {
        // Insert the file attachment
        const result = editor
          .chain()
          .focus()
          .setFileAttachment({
            fileId: metadata.id,
            fileName: metadata.fileName,
            fileSize: metadata.fileSize,
            fileIcon: getFileIcon(metadata.fileType),
          })
          .run()

        // Move cursor to the end of the document after insertion
        if (result) {
          const endPos = editor.state.doc.content.size
          editor.chain().focus().setTextSelection(endPos).run()
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error)
    }
  }

  const editor = useEditor({
    extensions: getEditorExtensions(true, placeholder), // Draggable attachments for editor
    content,
    editable: !disabled,
    onCreate: ({ editor }) => {
      // Move cursor to end if content already exists
      // This prevents new attachments from overwriting existing ones when editor reopens
      if (content) {
        setTimeout(() => {
          const endPos = editor.state.doc.content.size
          editor.chain().setTextSelection(endPos).run()
        }, 0)
      }

      // Add focus handler to scroll editor into view
      editor.view.dom.addEventListener('focus', () => {
        // Use a slight delay to ensure the focus has been fully processed
        setTimeout(() => {
          if (editorContainerRef.current) {
            editorContainerRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest',
              inline: 'nearest',
            })
          }
        }, 100)
      })

      // Add click handlers for file attachments and checkboxes
      editor.view.dom.addEventListener('click', event => {
        const target = event.target as HTMLElement

        // Handle file attachment clicks
        const fileAttachment = target.closest('[data-type="file-attachment"]') as HTMLElement
        if (fileAttachment) {
          void handleFileAttachmentOpen(fileAttachment, event)
          return
        }

        // Handle checkbox clicks with hierarchical behavior
        if (target.tagName === 'INPUT' && target.getAttribute('type') === 'checkbox') {
          handleHierarchicalCheckboxClick(editor, target, event)
        }
      })

      // Add keyboard handlers for file attachment navigation
      editor.view.dom.addEventListener('keydown', event => {
        const target = event.target as HTMLElement

        // Handle keyboard events on focused file attachments
        const focusedFileAttachment = target.closest('[data-type="file-attachment"]') as HTMLElement
        if (focusedFileAttachment && document.activeElement === focusedFileAttachment) {
          void handleFileAttachmentKeydown(focusedFileAttachment, event, editor)
          return
        }

        // Handle arrow key navigation to/from file attachments
        if (
          event.key === 'ArrowLeft' ||
          event.key === 'ArrowRight' ||
          event.key === 'ArrowUp' ||
          event.key === 'ArrowDown'
        ) {
          handleArrowKeyNavigation(event, editor)
        }
      })

      // Add event listeners to file attachment elements
      const addFileAttachmentEventListeners = () => {
        const fileAttachments = editor.view.dom.querySelectorAll('[data-type="file-attachment"]')

        fileAttachments.forEach((attachment: HTMLElement) => {
          // Create a bound handler for this specific attachment
          const keydownHandler = (event: KeyboardEvent) => {
            void handleFileAttachmentKeydown(attachment as HTMLElement, event, editor)
          }

          // Store the handler reference on the element for later removal
          ;(attachment as any)._keydownHandler = keydownHandler

          // Remove any existing listeners
          if ((attachment as any)._previousKeydownHandler) {
            attachment.removeEventListener('keydown', (attachment as any)._previousKeydownHandler)
          }
          if ((attachment as any)._previousEnterHandler) {
            attachment.removeEventListener('keypress', (attachment as any)._previousEnterHandler)
          }
          if ((attachment as any)._previousDragStartHandler) {
            attachment.removeEventListener('dragstart', (attachment as any)._previousDragStartHandler)
          }
          if ((attachment as any)._previousDragEndHandler) {
            attachment.removeEventListener('dragend', (attachment as any)._previousDragEndHandler)
          }

          // Add the new keyboard event listener
          attachment.addEventListener('keydown', keydownHandler)

          // Also add a backup handler that specifically listens for Enter
          const enterHandler = (event: KeyboardEvent) => {
            if (event.key === 'Enter') {
              void handleFileAttachmentOpen(attachment as HTMLElement, event)
            }
          }

          attachment.addEventListener('keypress', enterHandler)
          ;(attachment as any)._enterHandler = enterHandler

          // Add drag event handlers for visual feedback
          const dragStartHandler = (event: DragEvent) => {
            attachment.classList.add('dragging')
            // Allow drag and drop by setting allowed effect
            if (event.dataTransfer) {
              event.dataTransfer.effectAllowed = 'move'
            }
          }

          const dragEndHandler = (_event: DragEvent) => {
            attachment.classList.remove('dragging')

            // HACK: Insert and delete a space to re-enable formatting buttons after drop
            editor.view.dispatch(editor.view.state.tr.insertText(' ', 0))
            setTimeout(() => {
              editor.view.dispatch(editor.view.state.tr.delete(0, 2))
            }, 0)
          }

          attachment.addEventListener('dragstart', dragStartHandler)
          attachment.addEventListener('dragend', dragEndHandler)

          // Store reference for next cleanup
          ;(attachment as any)._previousKeydownHandler = keydownHandler
          ;(attachment as any)._previousEnterHandler = enterHandler
          ;(attachment as any)._previousDragStartHandler = dragStartHandler
          ;(attachment as any)._previousDragEndHandler = dragEndHandler
        })
      }

      // Add listeners initially and whenever content changes
      addFileAttachmentEventListeners()

      // Re-add listeners when content updates (new file attachments added)
      editor.on('update', addFileAttachmentEventListeners)

      // Add focus/blur styling for file attachments
      editor.view.dom.addEventListener('focusin', event => {
        const target = event.target as HTMLElement
        const fileAttachment = target.closest('[data-type="file-attachment"]') as HTMLElement
        if (fileAttachment) {
          fileAttachment.classList.add('file-attachment-focused')
        }
      })

      editor.view.dom.addEventListener('focusout', event => {
        const target = event.target as HTMLElement
        const fileAttachment = target.closest('[data-type="file-attachment"]') as HTMLElement
        if (fileAttachment) {
          fileAttachment.classList.remove('file-attachment-focused')
        }
      })
    },
    onUpdate: ({ editor }) => {
      onChange(
        editor
          .getHTML()
          .trim()
          .replace(/^(<p><\/p>)+$/, ''),
      )
    },
    editorProps: {
      attributes: {
        class: cn(getEditorAttributes().class, 'focus:outline-none min-h-[100px] px-3 py-2 rich-text-editor-content'),
      },
      handlePaste: (_view, event, _slice) => {
        const items = Array.from(event.clipboardData?.items || [])
        const imageItem = items.find(item => item.type.startsWith('image/'))

        if (imageItem) {
          event.preventDefault()
          const file = imageItem.getAsFile()
          if (file) {
            void handleImageUpload(file)
            return true
          }
        }
        return false
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer?.files.length) {
          const files = Array.from(event.dataTransfer.files)

          // Handle images first
          const imageFile = files.find(file => file.type.startsWith('image/'))
          if (imageFile) {
            event.preventDefault()
            void handleImageUpload(imageFile)
            return true
          }

          // Handle other file attachments
          const file = files[0]
          if (file) {
            event.preventDefault()
            void handleFileAttachment(file)
            return true
          }
        }
        return false
      },
    },
  })

  // Update editor content when content prop changes (for editing existing events)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '')
    }
  }, [editor, content])

  // Inject styles for file attachment focus states
  useEffect(() => {
    injectFileAttachmentStyles()
  }, []) // Empty dependency array means this runs once on mount

  // Close color pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      // Check if the click is outside both color picker containers
      if (!target.closest('[data-color-picker]')) {
        setShowColorPicker(false)
        setShowHighlightPicker(false)
      }
    }

    if (showColorPicker || showHighlightPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showColorPicker, showHighlightPicker])

  if (!editor) {
    return null
  }

  const ToolbarButton = ({
    onClick,
    isActive = false,
    disabled = false,
    children,
  }: {
    onClick: () => void
    isActive?: boolean
    disabled?: boolean
    children: React.ReactNode
  }) => (
    <Button
      type="button"
      variant={isActive ? 'default' : 'ghost'}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="h-8 w-8 p-0"
    >
      {children}
    </Button>
  )

  // Individual toolbar button components
  const UndoButton = () => (
    <ToolbarButton
      onClick={() => editor.chain().focus().undo().run()}
      disabled={!editor.can().chain().focus().undo().run()}
    >
      <Undo className="h-4 w-4" />
    </ToolbarButton>
  )

  const RedoButton = () => (
    <ToolbarButton
      onClick={() => editor.chain().focus().redo().run()}
      disabled={!editor.can().chain().focus().redo().run()}
    >
      <Redo className="h-4 w-4" />
    </ToolbarButton>
  )

  const BoldButton = () => (
    <ToolbarButton
      onClick={() => editor.chain().focus().toggleBold().run()}
      isActive={editor.isActive('bold')}
      disabled={!editor.can().chain().focus().toggleBold().run()}
    >
      <Bold className="h-4 w-4" />
    </ToolbarButton>
  )

  const ItalicButton = () => (
    <ToolbarButton
      onClick={() => editor.chain().focus().toggleItalic().run()}
      isActive={editor.isActive('italic')}
      disabled={!editor.can().chain().focus().toggleItalic().run()}
    >
      <Italic className="h-4 w-4" />
    </ToolbarButton>
  )

  const UnderlineButton = () => (
    <ToolbarButton
      onClick={() => editor.chain().focus().toggleUnderline().run()}
      isActive={editor.isActive('underline')}
      disabled={!editor.can().chain().focus().toggleUnderline().run()}
    >
      <UnderlineIcon className="h-4 w-4" />
    </ToolbarButton>
  )

  const ColorPickerButton = () => (
    <div className="relative" data-color-picker>
      <ToolbarButton
        onClick={() => {
          setShowColorPicker(!showColorPicker)
          setShowHighlightPicker(false)
        }}
        isActive={showColorPicker}
      >
        <Palette className="h-4 w-4" />
      </ToolbarButton>
      {showColorPicker && (
        <ColorPickerDropdown
          title="Text Color"
          colors={TEXT_COLORS}
          onColorSelect={color => {
            editor.chain().focus().setColor(color).run()
            setShowColorPicker(false)
          }}
          onClose={() => setShowColorPicker(false)}
          currentColor={editor.getAttributes('textStyle').color}
          resetButtonText="Reset to Default"
          onReset={() => {
            editor.chain().focus().unsetColor().run()
            setShowColorPicker(false)
          }}
        />
      )}
    </div>
  )

  const HighlightButton = () => (
    <div className="relative" data-color-picker>
      <ToolbarButton
        onClick={() => {
          setShowHighlightPicker(!showHighlightPicker)
          setShowColorPicker(false)
        }}
        isActive={showHighlightPicker || editor.isActive('highlight')}
      >
        <Highlighter className="h-4 w-4" />
      </ToolbarButton>
      {showHighlightPicker && (
        <ColorPickerDropdown
          title="Highlight"
          colors={HIGHLIGHT_COLORS}
          onColorSelect={color => {
            editor.chain().focus().toggleHighlight({ color }).run()
            setShowHighlightPicker(false)
          }}
          onClose={() => setShowHighlightPicker(false)}
          currentColor={editor.getAttributes('highlight').color || '#FEF3C7'}
          resetButtonText="Remove Highlight"
          onReset={() => {
            editor.chain().focus().unsetHighlight().run()
            setShowHighlightPicker(false)
          }}
        />
      )}
    </div>
  )

  const BulletListButton = () => (
    <ToolbarButton
      onClick={() => editor.chain().focus().toggleBulletList().run()}
      isActive={editor.isActive('bulletList')}
    >
      <List className="h-4 w-4" />
    </ToolbarButton>
  )

  const OrderedListButton = () => (
    <ToolbarButton
      onClick={() => editor.chain().focus().toggleOrderedList().run()}
      isActive={editor.isActive('orderedList')}
    >
      <ListOrdered className="h-4 w-4" />
    </ToolbarButton>
  )

  const CheckboxButton = () => (
    <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} isActive={editor.isActive('taskList')}>
      <CheckSquare className="h-4 w-4" />
    </ToolbarButton>
  )

  const BlockquoteButton = () => (
    <ToolbarButton
      onClick={() => editor.chain().focus().toggleBlockquote().run()}
      isActive={editor.isActive('blockquote')}
      disabled={!editor.can().chain().focus().toggleBlockquote().run()}
    >
      <Quote className="h-4 w-4" />
    </ToolbarButton>
  )

  const ImageButton = () => (
    <ToolbarButton onClick={() => fileInputRef.current?.click()} disabled={disabled}>
      <ImageIcon className="h-4 w-4" />
    </ToolbarButton>
  )

  const AttachmentButton = () => (
    <ToolbarButton onClick={() => attachmentInputRef.current?.click()} disabled={disabled}>
      <Paperclip className="h-4 w-4" />
    </ToolbarButton>
  )

  const HeadingDropdown = () => (
    <Select
      value={getCurrentHeadingValue()}
      onValueChange={value => {
        if (value === 'paragraph') {
          editor.chain().focus().setParagraph().run()
        } else {
          const level = parseInt(value.replace('h', ''))
          editor
            .chain()
            .focus()
            .toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 })
            .run()
        }
      }}
    >
      <SelectTrigger className="w-[100px] h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {HEADING_OPTIONS.map(option => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const FontFamilyDropdown = () => (
    <Select
      value={editor.getAttributes('textStyle').fontFamily || 'default'}
      onValueChange={value => {
        if (value === 'default') {
          editor.chain().focus().unsetFontFamily().run()
        } else {
          editor.chain().focus().setFontFamily(value).run()
        }
      }}
    >
      <SelectTrigger className="w-[120px] h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {FONT_FAMILIES.map(font => (
          <SelectItem key={font.value} value={font.value}>
            {font.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const FontSizeDropdown = () => (
    <Select
      value={editor.getAttributes('textStyle').fontSize || 'default'}
      onValueChange={value => {
        if (value === 'default') {
          editor.chain().focus().unsetFontSize().run()
        } else {
          editor.chain().focus().setFontSize(value).run()
        }
      }}
    >
      <SelectTrigger className="w-[80px] h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {FONT_SIZES.map(size => (
          <SelectItem key={size.value} value={size.value}>
            {size.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  // Toolbar separator component
  const ToolbarSeparator = () => <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

  // Toolbar button mapping
  const toolbarButtons: Record<ToolbarButtonKey, React.FC> = {
    undo: UndoButton,
    redo: RedoButton,
    bold: BoldButton,
    italic: ItalicButton,
    underline: UnderlineButton,
    colorPicker: ColorPickerButton,
    highlight: HighlightButton,
    bulletList: BulletListButton,
    orderedList: OrderedListButton,
    checkbox: CheckboxButton,
    blockquote: BlockquoteButton,
    image: ImageButton,
    attachment: AttachmentButton,
    heading: HeadingDropdown,
    fontFamily: FontFamilyDropdown,
    fontSize: FontSizeDropdown,
    separator: ToolbarSeparator,
  }

  // Render toolbar items based on configuration
  const renderToolbarItems = (items: readonly ToolbarButtonKey[]) => {
    return items.map((item, index) => {
      const Component = toolbarButtons[item]
      return Component ? <Component key={`${item}-${index}`} /> : null
    })
  }

  // Reusable color button component to avoid duplication
  const ColorButton = ({
    color,
    isActive,
    onClick,
    indicatorColor = 'bg-gray-800 dark:bg-white',
  }: {
    color: string
    isActive: boolean
    onClick: () => void
    indicatorColor?: string
  }) => (
    <button
      type="button"
      className={`w-8 h-8 rounded-lg border-2 hover:scale-105 transition-all duration-200 shadow-sm relative overflow-hidden ${
        isActive
          ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-500/30'
          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
      }`}
      style={{
        backgroundColor: color + ' !important',
        background: color + ' !important',
      }}
      onClick={onClick}
      title={color}
    >
      <div className="absolute inset-0 w-full h-full" style={{ backgroundColor: color }}></div>
      {isActive && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className={`w-2 h-2 rounded-full shadow-sm ${indicatorColor}`}></div>
        </div>
      )}
    </button>
  )

  // Reusable current color display component to avoid duplication
  const CurrentColorDisplay = ({ color, isActive }: { color?: string; label: string; isActive: boolean }) =>
    isActive && color ? (
      <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div
          className="w-4 h-4 rounded border border-gray-200 dark:border-gray-600"
          style={{ backgroundColor: color }}
        ></div>
        <span className="text-xs font-mono text-gray-600 dark:text-gray-400">{color}</span>
      </div>
    ) : null

  // Reusable reset button component for color pickers
  const ResetButton = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      className="w-full text-sm px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 font-medium"
      onClick={onClick}
    >
      {children}
    </button>
  )

  // Helper function to get current heading level
  const getCurrentHeadingValue = (): string => {
    for (let level = 1; level <= 6; level++) {
      if (editor.isActive('heading', { level })) {
        return `h${level}`
      }
    }
    return 'paragraph'
  }

  // Reusable color picker dropdown component
  const ColorPickerDropdown = ({
    title,
    colors,
    onColorSelect,
    onClose,
    currentColor,
    resetButtonText,
    onReset,
  }: {
    title: string
    colors: readonly string[]
    onColorSelect: (color: string) => void
    onClose: () => void
    currentColor?: string
    resetButtonText: string
    onReset: () => void
  }) => (
    <div className="absolute top-10 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-4 shadow-2xl z-10 w-64">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Colors Grid */}
        <div className="grid grid-cols-6 gap-2 mb-4">
          {colors.map(color => {
            const isActive = currentColor === color
            return (
              <div key={color}>
                <ColorButton
                  color={color}
                  isActive={isActive}
                  onClick={() => onColorSelect(color)}
                  indicatorColor={title === 'Highlight' ? 'bg-gray-800 dark:bg-white' : 'bg-white dark:bg-gray-900'}
                />
              </div>
            )
          })}
        </div>

        {/* Current Color Display */}
        <CurrentColorDisplay color={currentColor} label={`Current ${title}`} isActive={!!currentColor} />
      </div>

      <ResetButton onClick={onReset}>{resetButtonText}</ResetButton>
    </div>
  )

  return (
    <div
      ref={editorContainerRef}
      className={cn(
        'border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden',
        'bg-white dark:bg-gray-800',
        className,
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center flex-wrap gap-1 p-2 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
        {useSimplifiedToolbar
          ? // Simplified toolbar when content is empty - render only specified tools
            renderToolbarItems(toolsWhenEmpty)
          : // Full toolbar when content is not empty
            renderToolbarItems(FULL_TOOLBAR_ITEMS)}
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Hidden file input for image uploads */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) {
            void handleImageUpload(file)
          }
          // Reset the input value so the same file can be selected again
          e.target.value = ''
        }}
      />

      {/* Hidden file input for file attachments */}
      <input
        type="file"
        ref={attachmentInputRef}
        style={{ display: 'none' }}
        accept="*/*"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) {
            void handleFileAttachment(file)
          }
          // Reset the input value so the same file can be selected again
          e.target.value = ''
        }}
      />
    </div>
  )
}

// Component for displaying rich text content (read-only)
interface RichTextDisplayProps {
  content: string
  className?: string
  onContentChange?: (newContent: string) => void
  onProgressChange?: (progress: { completed: number; total: number; percentage: number }) => void
}

export function RichTextDisplay({ content, className, onContentChange, onProgressChange }: RichTextDisplayProps) {
  // Helper function to calculate checkbox progress from editor content
  const calculateProgress = React.useCallback(
    (editor: any) => {
      if (!editor || !onProgressChange) return

      // Use requestAnimationFrame to ensure DOM has been updated
      requestAnimationFrame(() => {
        const editorElement = editor.view.dom
        const checkboxes = editorElement.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>

        const total = checkboxes.length
        const completed = Array.from(checkboxes).filter(checkbox => checkbox.checked).length
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

        onProgressChange({ completed, total, percentage })
      })
    },
    [onProgressChange],
  )

  // Handle both plain text and HTML content
  const processedContent = React.useMemo(() => {
    if (!content) return ''

    // If content looks like HTML (contains tags), use it as-is
    if (content.includes('<') && content.includes('>')) {
      return content
    }

    // Otherwise, convert plain text to HTML with line breaks
    return content
      .split('\n')
      .map(line => `<p>${line || '<br>'}</p>`)
      .join('')
  }, [content])

  const editor = useEditor({
    extensions: getEditorExtensions(false), // Non-draggable attachments for display
    content: processedContent,
    editable: false, // Always read-only for display
    onCreate: ({ editor }) => {
      // Calculate initial progress after DOM is ready
      setTimeout(() => calculateProgress(editor), 50)

      // Add click handlers for file attachments
      editor.view.dom.addEventListener('click', event => {
        const target = event.target as HTMLElement

        const fileAttachment = target.closest('[data-type="file-attachment"]') as HTMLElement
        if (fileAttachment) {
          void handleFileAttachmentOpen(fileAttachment, event)
          return
        }

        // Handle checkbox clicks with hierarchical behavior
        if (onContentChange && target.tagName === 'INPUT' && target.getAttribute('type') === 'checkbox') {
          handleHierarchicalCheckboxClick(editor, target, event, onContentChange, calculateProgress)
          return
        }
      })
    },
    editorProps: {
      attributes: {
        class: cn(getEditorAttributes(className).class, onContentChange ? 'checkbox-only-mode' : ''),
        // Disable spellcheck in checkbox-only mode
        ...(onContentChange ? { spellcheck: 'false' } : {}),
      },
    },
  })

  // Update editor content when content prop changes
  useEffect(() => {
    if (editor && processedContent !== editor.getHTML()) {
      editor.commands.setContent(processedContent)
      // Recalculate progress after content update
      setTimeout(() => calculateProgress(editor), 50)
    }
  }, [editor, processedContent]) // Removed calculateProgress dependency to prevent re-renders

  // Calculate progress on initial render and when editor becomes available
  useEffect(() => {
    if (editor) {
      calculateProgress(editor)
    }
  }, [editor]) // Removed calculateProgress dependency to prevent re-renders

  if (!editor) {
    return null
  }

  return <EditorContent editor={editor} />
}

// Helper function to get file icon based on MIME type
const getFileIcon = (fileType: string): string => {
  const iconMap = {
    archive: '🗜️',
    audio: '🎵',
    binary: '🔢',
    code: '💻',
    database: '🗄️',
    excel: '📊',
    font: '🔤',
    image: '🖼️',
    json: '📦',
    markdown: '📖',
    pdf: '📄',
    powerpoint: '📈',
    presentation: '📈',
    rar: '🗜️',
    script: '💻',
    spreadsheet: '📊',
    text: '📋',
    video: '🎥',
    word: '📝',
    xml: '📦',
    zip: '🗜️',
    document: '📝',
    application: '🔢',
  }
  for (const [key, icon] of Object.entries(iconMap)) {
    if (fileType.includes(key)) return icon
  }
  return '📎'
}

// Helper function to check if file can be viewed in browser
const canViewInBrowser = (fileName: string): boolean => {
  const fileExtension = fileName.split('.').pop()?.toLowerCase() || ''
  const viewableTypes = ['pdf', 'txt', 'html', 'htm', 'json', 'xml', 'csv']
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp']
  const videoTypes = ['mp4', 'mov']
  const audioTypes = ['mp3', 'wav']
  return [...viewableTypes, ...imageTypes, ...videoTypes, ...audioTypes].includes(fileExtension)
}

// Helper to inject styles only once
const injectFileAttachmentStyles = () => {
  const styleId = 'rich-text-editor-file-attachment-styles'

  // Check if styles are already injected
  if (document.getElementById(styleId)) return

  const style = document.createElement('style')
  style.id = styleId
  style.textContent = FILE_ATTACHMENT_STYLES
  document.head.appendChild(style)
}

// CSS styles for file attachments - extracted to avoid inline style injection
const FILE_ATTACHMENT_STYLES = `
  .rich-text-editor-content .file-attachment {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: rgb(243 244 246);
    border: 1px solid rgb(229 231 235);
    border-radius: 8px;
    cursor: grab; /* Show drag cursor when draggable */
    transition: all 0.2s;
    outline: none;
    margin: 2px 0;
    user-select: none; /* Prevent text selection during drag */
  }
  .rich-text-editor-content .file-attachment:hover {
    background: rgb(229 231 235);
    border-color: rgb(209 213 219);
  }
  .rich-text-editor-content .file-attachment:active {
    cursor: grabbing; /* Show grabbing cursor when dragging */
    transform: scale(0.98);
  }
  .rich-text-editor-content .file-attachment-focused,
  .rich-text-editor-content .file-attachment:focus {
    background: rgb(239 246 255);
    border-color: rgb(147 197 253);
    box-shadow: 0 0 0 2px rgb(191 219 254);
  }
  /* Drag feedback styles */
  .rich-text-editor-content .file-attachment.dragging,
  .rich-text-editor-content .file-attachment:is([draggable="true"]:active) {
    opacity: 0.6;
    transform: scale(0.95);
  }
  .dark .rich-text-editor-content .file-attachment {
    background: rgb(31 41 55);
    border-color: rgb(55 65 81);
    color: rgb(243 244 246);
  }
  .dark .rich-text-editor-content .file-attachment:hover {
    background: rgb(55 65 81);
    border-color: rgb(75 85 99);
  }
  .dark .rich-text-editor-content .file-attachment-focused,
  .dark .rich-text-editor-content .file-attachment:focus {
    background: rgb(30 58 138);
    border-color: rgb(37 99 235);
    box-shadow: 0 0 0 2px rgb(30 64 175);
  }
  .rich-text-editor-content .file-icon {
    font-size: 16px;
    flex-shrink: 0;
  }
  .rich-text-editor-content .file-icon.loading {
    animation: pulse 1.5s ease-in-out infinite;
  }
  .rich-text-editor-content .file-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .rich-text-editor-content .file-name {
    font-weight: 500;
    font-size: 14px;
    color: rgb(17 24 39);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .dark .rich-text-editor-content .file-name {
    color: rgb(243 244 246);
  }
  .rich-text-editor-content .file-size {
    font-size: 12px;
    color: rgb(107 114 128);
  }
  .dark .rich-text-editor-content .file-size {
    color: rgb(156 163 175);
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`
