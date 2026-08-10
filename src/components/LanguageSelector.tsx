import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { SUPPORTED_LANGUAGES, useLocalization } from '@/hooks/useLocalization'

interface LanguageSelectorProps {
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'sm' | 'default' | 'lg'
  showText?: boolean
}

export function LanguageSelector({ variant = 'ghost', size = 'default', showText = false }: LanguageSelectorProps) {
  const { changeLanguage, getCurrentLanguage } = useLocalization()
  const currentLanguage = getCurrentLanguage()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* @ts-ignore */}
        <button variant={variant} size={size} className="gap-2">
          <span className="text-lg">{currentLanguage.flag}</span>
          {showText && <span className="hidden sm:inline">{currentLanguage.nativeName}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LANGUAGES.map(language => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => changeLanguage(language.code)}
            className={`gap-2 ${currentLanguage.code === language.code ? 'bg-accent text-accent-foreground' : ''}`}
          >
            <span className="text-lg">{language.flag}</span>
            <span>{language.nativeName}</span>
            <span className="text-muted-foreground text-sm">({language.name})</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
