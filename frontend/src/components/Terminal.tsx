import { FitAddon } from '@xterm/addon-fit'
import { Terminal as XTerm, type ITheme } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { DEFAULT_TERMINAL_FONT_FAMILY, type TerminalCursorStyle } from '../theme/terminalThemes.ts'

export interface TerminalHandle {
  write: (data: string) => void
  reset: () => void
  focus: () => void
  getSize: () => { cols: number; rows: number }
}

interface TerminalProps {
  onData: (data: string) => void
  onResize: (cols: number, rows: number) => void
  fontSize?: number
  fontFamily?: string
  theme?: ITheme
  cursorStyle?: TerminalCursorStyle
}

const Terminal = forwardRef<TerminalHandle, TerminalProps>(function Terminal(
  { onData, onResize, fontSize = 14, fontFamily = DEFAULT_TERMINAL_FONT_FAMILY, theme, cursorStyle = 'block' },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)

  useImperativeHandle(ref, () => ({
    write: (data: string) => xtermRef.current?.write(data),
    reset: () => xtermRef.current?.reset(),
    focus: () => xtermRef.current?.focus(),
    getSize: () => ({
      cols: xtermRef.current?.cols ?? 80,
      rows: xtermRef.current?.rows ?? 24,
    }),
  }))

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const xterm = new XTerm({
      cursorBlink: true,
      cursorStyle,
      fontSize,
      fontFamily,
      theme: theme ?? { background: '#0a0a0a' },
      rightClickSelectsWord: true,
    })
    const fitAddon = new FitAddon()
    xterm.loadAddon(fitAddon)
    xterm.open(container)
    fitAddon.fit()
    xterm.focus()

    xtermRef.current = xterm

    const dataSubscription = xterm.onData(onData)

    // By default xterm.js swallows every recognized key combo (incl. Ctrl+C
    // and Ctrl+V) and sends it to the remote shell, which is correct for a
    // real terminal (Ctrl+C must send SIGINT, not "copy"). But that also
    // means it never lets the browser's native copy/paste run, so the
    // standard terminal-emulator escape hatch — Ctrl/Cmd+Shift+C to copy,
    // Ctrl/Cmd+Shift+V to paste — needs to explicitly opt out and hand the
    // key event back to the browser.
    xterm.attachCustomKeyEventHandler((event) => {
      if (event.type !== 'keydown') return true
      const isMac = navigator.platform.toUpperCase().includes('MAC')
      const mod = isMac ? event.metaKey : event.ctrlKey
      const key = event.key.toLowerCase()

      if (mod && event.shiftKey && key === 'c') return !xterm.hasSelection()
      if (mod && event.shiftKey && key === 'v') return false
      // On macOS, plain Cmd+C / Cmd+V are the native copy/paste shortcuts
      // and never collide with a shell control code (only Ctrl+C does), so
      // let them through too.
      if (isMac && event.metaKey && !event.shiftKey && (key === 'c' || key === 'v')) {
        return false
      }
      return true
    })

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 1) return // middle click
      event.preventDefault()
      navigator.clipboard?.readText().then((text) => {
        if (text) onData(text)
      })
    }
    container.addEventListener('mousedown', handleMouseDown)

    const emitSize = () => onResize(xterm.cols, xterm.rows)
    emitSize()

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit()
      emitSize()
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      container.removeEventListener('mousedown', handleMouseDown)
      dataSubscription.dispose()
      xterm.dispose()
      xtermRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={containerRef} className="h-full w-full" />
})

Terminal.displayName = 'Terminal'

export default Terminal
