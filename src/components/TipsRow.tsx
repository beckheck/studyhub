import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Coffee, Music2, Target } from 'lucide-react'
import { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'

interface Tip {
  icon: ReactElement
  title: string
  tip: string
}

export default function TipsRow() {
  const { t } = useTranslation('tips')

  const tips: Tip[] = [
    {
      icon: <Target className="w-5 h-5" />,
      title: t('microGoals.title'),
      tip: t('microGoals.tip'),
    },
    {
      icon: <Coffee className="w-5 h-5" />,
      title: t('breakHygiene.title'),
      tip: t('breakHygiene.tip'),
    },
    {
      icon: <Music2 className="w-5 h-5" />,
      title: t('soundtrack.title'),
      tip: t('soundtrack.tip'),
    },
  ]

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {tips.map((t, i) => (
        <Card key={i} className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t.icon}
              {t.title}
            </CardTitle>
            <CardDescription>{t.tip}</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
