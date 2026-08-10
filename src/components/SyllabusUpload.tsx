import { Button } from '@/components/ui/button'
import { fileAttachmentStorage } from '@/stores/app'
import { Download, Eye, FileText, Upload, X } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface SyllabusUploadProps {
  courseId: string
  syllabusFileId?: string
  onSyllabusChange: (fileId: string | undefined) => void
  className?: string
}

export default function SyllabusUpload({ syllabusFileId, onSyllabusChange, className = '' }: SyllabusUploadProps) {
  const { t } = useTranslation(['common', 'courseManager'])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [syllabusMetadata, setSyllabusMetadata] = useState<any>(null)

  // Load syllabus metadata when component mounts or syllabusFileId changes
  useEffect(() => {
    const loadSyllabusMetadata = async () => {
      if (syllabusFileId) {
        const metadata = await fileAttachmentStorage.getFileMetadata(syllabusFileId)
        setSyllabusMetadata(metadata)
      } else {
        setSyllabusMetadata(null)
      }
    }

    loadSyllabusMetadata().catch(console.error)
  }, [syllabusFileId])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type (accept PDF, DOC, DOCX, TXT)
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ]

    if (!allowedTypes.includes(file.type)) {
      alert(t('courseManager:syllabus.invalidFileType'))
      return
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB in bytes
    if (file.size > maxSize) {
      alert(t('courseManager:syllabus.fileTooLarge'))
      return
    }

    setUploading(true)
    try {
      // Delete old syllabus file if exists
      if (syllabusFileId) {
        await fileAttachmentStorage.deleteFile(syllabusFileId)
      }

      // Upload new file
      const metadata = await fileAttachmentStorage.storeFile(file)
      setSyllabusMetadata(metadata)
      onSyllabusChange(metadata.id)
    } catch (error) {
      console.error('Failed to upload syllabus:', error)
      alert(t('courseManager:syllabus.uploadFailed'))
    } finally {
      setUploading(false)
      // Clear the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleViewSyllabus = async () => {
    if (!syllabusFileId) return

    try {
      const fileData = await fileAttachmentStorage.getFile(syllabusFileId)
      if (fileData) {
        // Create a blob URL and open it in a new tab
        const response = await fetch(fileData.fileData)
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')

        // Clean up the blob URL after a short delay
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    } catch (error) {
      console.error('Failed to view syllabus:', error)
      alert(t('courseManager:syllabus.viewFailed'))
    }
  }

  const handleDownloadSyllabus = async () => {
    if (!syllabusFileId || !syllabusMetadata) return

    try {
      const fileData = await fileAttachmentStorage.getFile(syllabusFileId)
      if (fileData) {
        // Create download link
        const link = document.createElement('a')
        link.href = fileData.fileData
        link.download = syllabusMetadata.fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error('Failed to download syllabus:', error)
      alert(t('courseManager:syllabus.downloadFailed'))
    }
  }

  const handleRemoveSyllabus = async () => {
    if (!syllabusFileId) return

    if (confirm(t('courseManager:syllabus.removeConfirmation'))) {
      try {
        await fileAttachmentStorage.deleteFile(syllabusFileId)
        setSyllabusMetadata(null)
        onSyllabusChange(undefined)
      } catch (error) {
        console.error('Failed to remove syllabus:', error)
        alert(t('courseManager:syllabus.removeFailed'))
      }
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Upload Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t('courseManager:syllabus.title')}
          </span>
        </div>

        {!syllabusFileId && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-xl"
          >
            <Upload className="w-3 h-3 mr-2" />
            {uploading ? t('common:actions.uploading') : t('courseManager:syllabus.upload')}
          </Button>
        )}
      </div>

      {/* File Info and Actions */}
      {syllabusMetadata && (
        <div className="bg-white/40 dark:bg-white/5 p-3 rounded-xl border border-white/20 dark:border-white/10">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {syllabusMetadata.fileName}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {syllabusMetadata.fileSize} • {new Date(syllabusMetadata.uploadedAt).toLocaleDateString()}
              </div>
            </div>

            <div className="flex items-center gap-1 ml-3">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleViewSyllabus}
                className="h-8 w-8 p-0 rounded-lg"
                title={t('courseManager:syllabus.view')}
              >
                <Eye className="w-3 h-3" />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={handleDownloadSyllabus}
                className="h-8 w-8 p-0 rounded-lg"
                title={t('courseManager:syllabus.download')}
              >
                <Download className="w-3 h-3" />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="h-8 w-8 p-0 rounded-lg"
                title={t('courseManager:syllabus.replace')}
              >
                <Upload className="w-3 h-3" />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={handleRemoveSyllabus}
                className="h-8 w-8 p-0 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                title={t('courseManager:syllabus.remove')}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* No File State */}
      {!syllabusFileId && !uploading && (
        <div className="text-center py-6 border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/50">
          <FileText className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">{t('courseManager:syllabus.noFile')}</p>
          <Button size="sm" onClick={() => fileInputRef.current?.click()} className="rounded-xl">
            <Upload className="w-3 h-3 mr-2" />
            {t('courseManager:syllabus.upload')}
          </Button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".pdf,.doc,.docx,.txt"
        style={{ display: 'none' }}
      />
    </div>
  )
}
