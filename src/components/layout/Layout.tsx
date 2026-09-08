import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Toaster } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { adminApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { applyProfileDesignOverride, applySiteAppearance, resolveBrandName, syncBrandMetadata } from '@/lib/theme'

export function Layout() {
  const { user } = useAuth()
  const { data } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => adminApi.getSettings(),
    staleTime: 1000 * 60 * 10,
  })

  const brandTitle = resolveBrandName(data?.settings?.site_title)

  useEffect(() => {
    applySiteAppearance(data?.settings ?? {})
    applyProfileDesignOverride(user?.id)
    syncBrandMetadata(brandTitle)
  }, [brandTitle, data?.settings, user?.id])

  return (
    <div className="min-h-screen flex flex-col app-shell">
      <Navbar brandTitle={brandTitle} />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        {brandTitle} — feito para aprender com clareza
      </footer>
      <Toaster position="bottom-right" richColors />
    </div>
  )
}
