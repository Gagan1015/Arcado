'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState, createContext, useContext } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  BarChart3,
  BookOpen,
  Gamepad2,
  TrendingUp,
  Users,
  DoorOpen,
  FileText,
  ShieldAlert,
  Megaphone,
  LogOut,
  Home,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { LogoMark, Wordmark } from '@/components/ui/Logo'

interface AdminSidebarProps {
  userName: string
  userEmail: string
  userImage?: string
  userRole: string
}

const mainNavItems = [
  { href: '/admin', label: 'Dashboard', icon: BarChart3 },
  { href: '/admin/analytics', label: 'Analytics', icon: TrendingUp },
  { href: '/admin/games', label: 'Games', icon: Gamepad2 },
  { href: '/admin/games/trivia', label: 'Trivia Questions', icon: BookOpen },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/rooms', label: 'Rooms', icon: DoorOpen },
  { href: '/admin/moderation', label: 'Moderation', icon: ShieldAlert },
  { href: '/admin/logs', label: 'Activity Logs', icon: FileText },
]

const bottomNavItems = [
  { href: '/admin/settings', label: 'Announcements', icon: Megaphone },
]

// â”€â”€ Context for sidebar state â”€â”€
export const SidebarContext = createContext<{
  collapsed: boolean
  setCollapsed: (v: boolean) => void
}>({ collapsed: false, setCollapsed: () => {} })

export function useSidebar() {
  return useContext(SidebarContext)
}

export function AdminSidebar({ userName, userEmail: _userEmail, userImage, userRole }: AdminSidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'

    // If another entry in the nav is a more specific match for this pathname,
    // defer to it so parent/child routes (e.g. /admin/games vs
    // /admin/games/trivia) don't both highlight at the same time.
    const moreSpecific = [...mainNavItems, ...bottomNavItems].some(
      (item) => item.href !== href && item.href.startsWith(`${href}/`) && pathname.startsWith(item.href),
    )
    if (moreSpecific) return false

    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const sidebarWidth = collapsed ? 72 : 260

  const NavContent = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {/* Logo / Brand */}
      <div className={`border-b border-[var(--sidebar-border)] ${collapsed && !mobile ? 'px-2' : 'px-4'}`}>
        <div className={`flex h-16 items-center gap-3 ${collapsed && !mobile ? 'justify-center' : ''}`}>
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[12px] bg-[var(--primary-500)]/15 text-[var(--primary-400)]">
            <LogoMark size={20} />
          </div>
          {(!collapsed || mobile) && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="flex-1 overflow-hidden"
            >
              <Wordmark size="md" className="block whitespace-nowrap text-[var(--sidebar-text)]" />
              <p className="text-xs text-[var(--sidebar-text-muted)] whitespace-nowrap">Admin Panel</p>
            </motion.div>
          )}
          {/* Desktop: collapse toggle (expanded state) */}
          {!mobile && !collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[var(--sidebar-text-muted)] transition-colors hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text)]"
              title="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {/* Mobile: close button */}
          {mobile && (
            <button
              onClick={() => setMobileOpen(false)}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[var(--sidebar-text-muted)] transition-colors hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3">
        {/* Expand toggle when collapsed */}
        {!mobile && collapsed && (
          <div className="mb-2 flex justify-center">
            <button
              onClick={() => setCollapsed(false)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--sidebar-text-muted)] transition-colors hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text)]"
              title="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
        {(!collapsed || mobile) && (
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--sidebar-text-muted)]">
            Main
          </p>
        )}
        <div className="space-y-1">
          {mainNavItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => mobile && setMobileOpen(false)}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-text)]'
                    : 'text-[var(--sidebar-text-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text)]'
                } ${collapsed && !mobile ? 'justify-center' : ''}`}
                title={collapsed && !mobile ? item.label : undefined}
              >
                <item.icon
                  className={`h-[18px] w-[18px] flex-shrink-0 ${active ? 'text-[var(--primary-400)]' : ''}`}
                />
                {(!collapsed || mobile) && (
                  <span className="whitespace-nowrap">{item.label}</span>
                )}
                {/* Tooltip for collapsed */}
                {collapsed && !mobile && (
                  <div className="pointer-events-none absolute left-full z-50 ml-3 rounded-md bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] shadow-lg opacity-0 transition-opacity group-hover:opacity-100 border border-[var(--border)]">
                    {item.label}
                  </div>
                )}
              </Link>
            )
          })}
        </div>

        <div className="my-4 border-t border-[var(--sidebar-border)]" />

        {(!collapsed || mobile) && (
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--sidebar-text-muted)]">
            System
          </p>
        )}
        <div className="space-y-1">
          {bottomNavItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => mobile && setMobileOpen(false)}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-text)]'
                    : 'text-[var(--sidebar-text-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text)]'
                } ${collapsed && !mobile ? 'justify-center' : ''}`}
                title={collapsed && !mobile ? item.label : undefined}
              >
                <item.icon
                  className={`h-[18px] w-[18px] flex-shrink-0 ${active ? 'text-[var(--primary-400)]' : ''}`}
                />
                {(!collapsed || mobile) && (
                  <span className="whitespace-nowrap">{item.label}</span>
                )}
                {collapsed && !mobile && (
                  <div className="pointer-events-none absolute left-full z-50 ml-3 rounded-md bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] shadow-lg opacity-0 transition-opacity group-hover:opacity-100 border border-[var(--border)]">
                    {item.label}
                  </div>
                )}
              </Link>
            )
          })}
          <Link
            href="/"
            className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--sidebar-text-muted)] transition-all hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text)] ${collapsed && !mobile ? 'justify-center' : ''}`}
            title={collapsed && !mobile ? 'Back to Site' : undefined}
          >
            <Home className="h-[18px] w-[18px] flex-shrink-0" />
            {(!collapsed || mobile) && <span className="whitespace-nowrap">Back to Site</span>}
            {collapsed && !mobile && (
              <div className="pointer-events-none absolute left-full z-50 ml-3 rounded-md bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] shadow-lg opacity-0 transition-opacity group-hover:opacity-100 border border-[var(--border)]">
                Back to Site
              </div>
            )}
          </Link>
        </div>
      </nav>

      {/* User profile footer */}
      <div className="border-t border-[var(--sidebar-border)] p-3">
        <div className={`flex items-center ${collapsed && !mobile ? 'flex-col gap-2' : 'gap-3'}`}>
          <UserAvatar
            src={userImage}
            name={userName}
            alt={userName}
            className="h-9 w-9 flex-shrink-0 rounded-full ring-2 ring-[var(--sidebar-border)]"
            fallbackClassName="bg-[var(--primary-500)]/20 text-[var(--primary-400)]"
          />
          {(!collapsed || mobile) && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-[var(--sidebar-text)]">{userName}</p>
              <p className="truncate text-xs text-[var(--sidebar-text-muted)]">{userRole}</p>
            </div>
          )}
          <button
            onClick={() => void signOut({ callbackUrl: '/' })}
            className="group relative flex-shrink-0 rounded-lg p-1.5 text-[var(--sidebar-text-muted)] transition-colors hover:bg-[var(--sidebar-hover)] hover:text-[var(--error-500)]"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
            {collapsed && !mobile && (
              <div className="pointer-events-none absolute left-full z-50 ml-3 rounded-md bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] shadow-lg opacity-0 transition-opacity group-hover:opacity-100 border border-[var(--border)]">
                Sign out
              </div>
            )}
          </button>
        </div>
      </div>
    </>
  )

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      {/* â”€â”€ Desktop Sidebar â”€â”€ */}
      <motion.aside
        animate={{ width: sidebarWidth }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] lg:flex"
      >
        <NavContent />
      </motion.aside>

      {/* Spacer for main content */}
      <motion.div
        animate={{ width: sidebarWidth }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="hidden flex-shrink-0 lg:block"
      />

      {/* â”€â”€ Mobile Hamburger â”€â”€ */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] shadow-lg lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* â”€â”€ Mobile Overlay â”€â”€ */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] lg:hidden"
            >
              <NavContent mobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </SidebarContext.Provider>
  )
}
