import { HugeiconsIcon } from '@hugeicons/react'
import { Moon02Icon, Sun03Icon } from '@hugeicons/core-free-icons'
import { useTheme } from '../theme/ThemeContext.tsx'

function ThemeToggle() {
  const { mode, toggle } = useTheme()
  const isDark = mode === 'dark'

  return (
    <button
      type="button"
      className="btn-icon btn-icon-sm preset-tonal"
      onClick={toggle}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      <HugeiconsIcon icon={isDark ? Sun03Icon : Moon02Icon} size={18} strokeWidth={1.5} />
    </button>
  )
}

export default ThemeToggle
