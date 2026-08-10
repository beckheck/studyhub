/**
 * Storage Info Component
 * Displays current storage adapter and usage information
 */

import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocalization } from '../hooks/useLocalization'
import { hybridStorage } from '../lib/hybrid-storage'
import { Card } from './ui/card'

interface StorageInfo {
  used: number
  available: number
  quota: number
  adapter: string
}

export const StorageInfoCard: React.FC = () => {
  const { t } = useTranslation('settings')
  const { formatNumber } = useLocalization()
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const formatBytes = (bytes: number): string => {
    if (bytes === Infinity) return '∞'
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    const formattedNumber = formatNumber(bytes / Math.pow(k, i), {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    })
    return `${formattedNumber} ${sizes[i]}`
  }

  const getUsagePercentage = (used: number, quota: number): number => {
    if (quota === 0) return 0
    return Math.round((used / quota) * 100)
  }

  const getStatusColor = (percentage: number): string => {
    if (percentage < 50) return 'text-green-600'
    if (percentage < 80) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusText = (adapter: string, percentage: number): string => {
    const statusKey = percentage < 50 ? 'good' : percentage < 80 ? 'warning' : 'critical'
    const status = t(`storage.status.${statusKey}`)
    return `${adapter} - ${status}`
  }

  useEffect(() => {
    const fetchStorageInfo = async () => {
      try {
        setIsLoading(true)
        const info = await hybridStorage.getStorageInfo()
        setStorageInfo(info)
      } catch (error) {
        console.error('Failed to get storage info:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStorageInfo().catch(console.error)

    // Refresh storage info every 30 seconds
    const interval = setInterval(fetchStorageInfo, 30000)

    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <Card className="p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </Card>
    )
  }

  if (!storageInfo) {
    return (
      <Card className="p-4">
        <p className="text-sm text-gray-500">{t('storage.unavailable')}</p>
      </Card>
    )
  }

  const usagePercentage = getUsagePercentage(storageInfo.used, storageInfo.quota)
  const statusColor = getStatusColor(usagePercentage)
  const statusText = getStatusText(storageInfo.adapter, usagePercentage)

  if (storageInfo.adapter === 'Browser') return null

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{t('storage.title')}</h3>
        <span className={`text-xs font-medium ${statusColor}`}>{statusText}</span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span>{t('storage.used', { amount: formatBytes(storageInfo.used) })}</span>
          <span>{t('storage.available', { amount: formatBytes(storageInfo.available) })}</span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              usagePercentage < 50 ? 'bg-green-500' : usagePercentage < 80 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          ></div>
        </div>

        <div className="text-xs text-gray-600">
          {t('storage.quotaUsed', {
            percentage: usagePercentage,
            quota: formatBytes(storageInfo.quota),
          })}
        </div>

        {storageInfo.adapter === 'Browser' && (
          <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
            {t('storage.messages.unlimitedCapacity')}
          </div>
        )}

        {storageInfo.adapter === 'IndexedDB' && (
          <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
            {t('storage.messages.highCapacity')}
          </div>
        )}

        {storageInfo.adapter === 'localStorage' && usagePercentage > 70 && (
          <div className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
            {t('storage.messages.upgradeWarning')}
          </div>
        )}
      </div>
    </Card>
  )
}

export default StorageInfoCard
