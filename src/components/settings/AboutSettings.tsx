import StorageInfoCard from '@/components/StorageInfoCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppContext } from '@/contexts/AppContext';
import { exportFile, importFile } from '@/lib/data-transfer';
import { useAppState } from '@/hooks/useStore';
import { patchStoreState, persistStore } from '@/stores/app';
import { Download, Github } from 'lucide-react';
import { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

export default function AboutSettings() {
  const { isExtension } = useAppContext();
  const { t } = useTranslation('settings');
  const appState = useAppState();

  return (
    <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
      <div className="space-y-2">
        <p>{t('about.localFirst')}</p>
        <p>{t(isExtension ? 'about.proTipExtension' : 'about.proTip')}</p>
      </div>
      <div className="grid gap-2 lg:grid-cols-3 lg:gap-3">
        <Button variant="outline" onClick={() => exportFile(appState as any)} className="w-full rounded-xl">
          <Download className="w-4 h-4 mr-2" />
          {t('about.exportData')}
        </Button>
        <Button variant="outline" asChild className="w-full rounded-xl">
          <label>
            <Input
              type="file"
              accept=".json"
              onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0];
                if (file) {
                  try {
                    const importedState = await importFile(file);
                    if (importedState) {
                      patchStoreState(importedState);
                      await persistStore();
                      setTimeout(() => {
                        alert(t('about.importSuccess'));
                        window.location.reload();
                      }, 100);
                    } else {
                      alert(t('about.importError'));
                    }
                  } catch (error) {
                    console.error('Import error:', error);
                    alert(t('about.importErrorGeneral'));
                  }
                  e.target.value = '';
                }
              }}
              className="hidden"
            />
            <span className="flex items-center justify-center gap-2">
              <Download className="w-4 h-4 rotate-180" />
              {t('about.importData')}
            </span>
          </label>
        </Button>
        <BuyMeACoffeeButton id="studyhub" />
      </div>
      <StorageInfoCard />
    </div>
  );
}

function BuyMeACoffeeButton({ id }: { id: string }) {
  const { i18n, t } = useTranslation('settings');
  const primaryLanguageCode = i18n.language.split('-')[0];

  return (
    <a
      className="buy-me-a-coffee-button"
      target="_blank"
      href={`https://buymeacoffee.com/${id}?l=${primaryLanguageCode}`}
      rel="noreferrer"
    >
      <img src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg" alt={t('about.buyMeACoffee')} />
      <span>{t('about.buyMeACoffee')}</span>
    </a>
  );
}

function GithubCornerRibbon() {
  const { t } = useTranslation('settings');
  return (
    <a
      href="https://github.com/beckheck/gen-z-study-portal"
      target="_blank"
      rel="noopener noreferrer"
      className="absolute -top-3 -right-3 z-20 group"
      aria-label={t('about.viewSourceOnGitHub')}
    >
      {/* Ribbon Background */}
      <div className="w-20 h-20 relative">
        <div className="absolute top-3 right-3 w-0 h-0 border-l-[70px] border-l-transparent border-t-[70px] border-t-gray-700 dark:border-t-gray-600 group-hover:border-t-gray-800 dark:group-hover:border-t-gray-500 transition-colors"></div>
        {/* GitHub Icon */}
        <div className="absolute top-6 right-6 transform rotate-45">
          <Github className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
        </div>
      </div>
    </a>
  );
}
