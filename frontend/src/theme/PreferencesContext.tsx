import { createContext, useContext, useState, type ReactNode } from 'react'
import {
  DEFAULT_TERMINAL_FONT_FAMILY,
  DEFAULT_TERMINAL_THEME_ID,
  TERMINAL_CURSOR_STYLES,
  TERMINAL_THEMES,
  type TerminalCursorStyle,
} from './terminalThemes.ts'

const FONT_SIZE_KEY = 'webmius-terminal-font-size'
const THEME_ID_KEY = 'webmius-terminal-theme'
const FONT_FAMILY_KEY = 'webmius-terminal-font-family'
const CURSOR_STYLE_KEY = 'webmius-terminal-cursor-style'

const DEFAULT_FONT_SIZE = 14
const MIN_FONT_SIZE = 10
const MAX_FONT_SIZE = 24

function clampFontSize(size: number): number {
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, size))
}

// localStorage can be unavailable or throw (Safari private browsing, a
// sandboxed test environment, etc.), and that should never break rendering —
// worst case the preference just stops persisting across reloads.
function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

function readStoredFontSize(): number {
  const stored = Number(readStored(FONT_SIZE_KEY))
  return stored ? clampFontSize(stored) : DEFAULT_FONT_SIZE
}

function readStoredThemeId(): string {
  const stored = readStored(THEME_ID_KEY)
  return stored && TERMINAL_THEMES.some((t) => t.id === stored) ? stored : DEFAULT_TERMINAL_THEME_ID
}

function readStoredFontFamily(): string {
  return readStored(FONT_FAMILY_KEY) || DEFAULT_TERMINAL_FONT_FAMILY
}

function readStoredCursorStyle(): TerminalCursorStyle {
  const stored = readStored(CURSOR_STYLE_KEY)
  return TERMINAL_CURSOR_STYLES.some((c) => c.value === stored) ? (stored as TerminalCursorStyle) : 'block'
}

interface PreferencesContextValue {
  terminalFontSize: number
  setTerminalFontSize: (size: number) => void
  terminalThemeId: string
  setTerminalThemeId: (id: string) => void
  terminalFontFamily: string
  setTerminalFontFamily: (fontFamily: string) => void
  terminalCursorStyle: TerminalCursorStyle
  setTerminalCursorStyle: (style: TerminalCursorStyle) => void
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [terminalFontSize, setFontSize] = useState<number>(readStoredFontSize)
  const [terminalThemeId, setThemeId] = useState<string>(readStoredThemeId)
  const [terminalFontFamily, setFontFamily] = useState<string>(readStoredFontFamily)
  const [terminalCursorStyle, setCursorStyle] = useState<TerminalCursorStyle>(readStoredCursorStyle)

  const setTerminalFontSize = (size: number) => {
    const clamped = clampFontSize(size)
    setFontSize(clamped)
    writeStored(FONT_SIZE_KEY, String(clamped))
  }

  const setTerminalThemeId = (id: string) => {
    setThemeId(id)
    writeStored(THEME_ID_KEY, id)
  }

  const setTerminalFontFamily = (fontFamily: string) => {
    setFontFamily(fontFamily)
    writeStored(FONT_FAMILY_KEY, fontFamily)
  }

  const setTerminalCursorStyle = (style: TerminalCursorStyle) => {
    setCursorStyle(style)
    writeStored(CURSOR_STYLE_KEY, style)
  }

  return (
    <PreferencesContext.Provider
      value={{
        terminalFontSize,
        setTerminalFontSize,
        terminalThemeId,
        setTerminalThemeId,
        terminalFontFamily,
        setTerminalFontFamily,
        terminalCursorStyle,
        setTerminalCursorStyle,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences must be used within a PreferencesProvider')
  return ctx
}

export { MIN_FONT_SIZE, MAX_FONT_SIZE }
