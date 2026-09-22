import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAsync, useDocumentTitle } from '@/app/hooks'
import { getRepository } from '@/services/progress'
import type { ProgressSnapshot } from '@/services/progress/types'
import { getThemeMode, setThemeMode, type ThemeMode } from '@/services/settings/theme'
import { loadVersion } from '@/services/data/dataService'
import { Page, Card, Chips, useToast } from '@/ui'

export default function SettingsPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('settings.title'))
  const repo = getRepository()
  const [theme, setTheme] = useState<ThemeMode>(getThemeMode())
  const { data: version } = useAsync(() => loadVersion(), [])
  const { show, toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const exportData = async () => {
    const snap = await repo.exportAll()
    const blob = new Blob([JSON.stringify(snap, null, 1)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `atlasfunke-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const importData = async (file: File) => {
    try {
      const snap = JSON.parse(await file.text()) as ProgressSnapshot
      if (snap.version !== 1) throw new Error('version')
      const before = await repo.getStats()
      const beforeAch = (await repo.getAchievements()).length
      const beforeEnt = (await repo.getAllEntityProgress()).size
      await repo.importAll(snap, 'merge')
      const after = await repo.getStats()
      show(t('settings.imported', { xp: Math.max(0, after.xp - before.xp), achievements: Math.max(0, (await repo.getAchievements()).length - beforeAch), entities: Math.max(0, (await repo.getAllEntityProgress()).size - beforeEnt) }))
    } catch {
      show(t('common.error'))
    }
  }
  const clear = async () => {
    if (!confirm(t('settings.delete_confirm'))) return
    await repo.clearAll()
    for (const k of Object.keys(localStorage)) if (k.startsWith('gk.')) localStorage.removeItem(k)
    show(t('settings.deleted'))
  }

  return (
    <Page title={t('settings.title')} back="/profile">
      <Card className="mb-4">
        <h2 className="mb-2 font-medium">{t('settings.theme')}</h2>
        <Chips
          label={t('settings.theme')}
          value={theme}
          onChange={(m) => {
            setTheme(m)
            setThemeMode(m)
          }}
          items={[
            { value: 'light', label: `☀ ${t('settings.light')}` },
            { value: 'dark', label: `🌙 ${t('settings.dark')}` },
            { value: 'system', label: `⚙ ${t('settings.system')}` },
          ]}
        />
      </Card>
      <Card className="mb-4 grid gap-2">
        <h2 className="font-medium">{t('settings.data')}</h2>
        <button className="btn-secondary" onClick={exportData}>⬇ {t('settings.export')}</button>
        <button className="btn-secondary" onClick={() => fileRef.current?.click()}>⬆ {t('settings.import')}</button>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && void importData(e.target.files[0])} />
        <button className="btn-ghost text-bad" onClick={clear}>🗑 {t('settings.delete')}</button>
      </Card>
      <Card className="grid gap-2 text-sm">
        <h2 className="font-medium">{t('settings.about')}</h2>
        <Link to="/quellen" className="underline">{t('settings.sources')}</Link>
        <Link to="/admin" className="underline">🛠 Datenqualität</Link>
        <Link to="/impressum" className="underline">{t('legal.imprint')}</Link>
        <Link to="/datenschutz" className="underline">{t('legal.privacy')}</Link>
        <Link to="/nutzungsbedingungen" className="underline">{t('legal.terms')}</Link>
        <Link to="/kontakt" className="underline">{t('legal.contact')}</Link>
        <Link to="/vorschlagen" className="underline">💡 {t('legal.suggest')}</Link>
        {version && <p className="text-xs text-ink-2">{t('settings.version')}: {version.data_version} · Schema {version.schema_version}</p>}
      </Card>
      {toast}
    </Page>
  )
}
