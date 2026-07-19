import { useEffect, useMemo, useRef, useState } from 'react'
import { parseSvg } from '../editor/svg-parser.js'

export default function useEditorDocument({ initialMarkup, storageKey, historyLimit = 50 }) {
  const initial = useMemo(() => parseSvg(initialMarkup), [initialMarkup])
  const [persisted] = useState(() => {
    try {
      const stored = window.localStorage.getItem(storageKey)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const persistedDocument = useMemo(() => {
    if (!persisted?.svgMarkup) return initial
    try {
      return parseSvg(persisted.svgMarkup)
    } catch {
      return initial
    }
  }, [initial, persisted])
  const [language, setLanguage] = useState(persisted?.language === 'zh' ? 'zh' : 'en')
  const [svgMarkup, setSvgMarkup] = useState(persistedDocument.markup)
  const [sourceDraft, setSourceDraft] = useState(persistedDocument.markup)
  const [elements, setElements] = useState(persistedDocument.elements)
  const [selectedId, setSelectedId] = useState(persisted?.selectedId || persistedDocument.elements[0]?.id || '')
  const [selectedIds, setSelectedIds] = useState(() => {
    const persistedIds = Array.isArray(persisted?.selectedIds) ? persisted.selectedIds : []
    const validIds = persistedIds.filter((id) => persistedDocument.elements.some((item) => item.id === id))
    const fallbackId = persisted?.selectedId || persistedDocument.elements[0]?.id || ''
    return validIds.length ? validIds : (fallbackId ? [fallbackId] : [])
  })
  const [fileName, setFileName] = useState(persisted?.fileName || 'untitled.svg')
  const [dirty, setDirty] = useState(Boolean(persisted?.dirty))
  const [history, setHistory] = useState(() => ({
    past: Array.isArray(persisted?.history?.past) ? persisted.history.past : [],
    future: Array.isArray(persisted?.history?.future) ? persisted.history.future : [],
  }))
  const [storageError, setStorageError] = useState(false)
  const storageWarnedRef = useRef(false)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify({
          svgMarkup, fileName, selectedId, selectedIds, dirty, history, language,
        }))
      } catch {
        if (!storageWarnedRef.current) {
          storageWarnedRef.current = true
          setStorageError(true)
        }
      }
    }, 350)
    return () => window.clearTimeout(timeout)
  }, [storageKey, svgMarkup, fileName, selectedId, selectedIds, dirty, history, language])

  const selectLayerIds = (nextIds, primaryId = nextIds[nextIds.length - 1] || '') => {
    const validIds = [...new Set(nextIds)].filter((id) => elements.some((item) => item.id === id))
    setSelectedIds(validIds)
    setSelectedId(validIds.includes(primaryId) ? primaryId : validIds[validIds.length - 1] || '')
  }

  const currentSnapshot = () => ({ svgMarkup, fileName, selectedId, dirty })

  const commitDocument = (rawMarkup, { nextSelectedId = selectedId, nextSelectedIds, nextFileName = fileName, nextDirty = true, historySnapshot = currentSnapshot(), forceHistory = false } = {}) => {
    const parsed = parseSvg(rawMarkup)
    if (!forceHistory && parsed.markup === svgMarkup && nextFileName === fileName && nextDirty === dirty) {
      setSourceDraft(parsed.markup)
      return
    }
    const validSelectedId = parsed.elements.some((item) => item.id === nextSelectedId) ? nextSelectedId : parsed.elements[0]?.id || ''
    const validSelectedIds = (nextSelectedIds || [validSelectedId]).filter((id) => parsed.elements.some((item) => item.id === id))
    setHistory((current) => ({ past: [...current.past, historySnapshot].slice(-historyLimit), future: [] }))
    setSvgMarkup(parsed.markup)
    setSourceDraft(parsed.markup)
    setElements(parsed.elements)
    setSelectedId(validSelectedId)
    setSelectedIds(validSelectedIds.length ? validSelectedIds : (validSelectedId ? [validSelectedId] : []))
    setFileName(nextFileName)
    setDirty(nextDirty)
  }

  const restoreSnapshot = (snapshot) => {
    const parsed = parseSvg(snapshot.svgMarkup)
    const validSelectedId = parsed.elements.some((item) => item.id === snapshot.selectedId) ? snapshot.selectedId : parsed.elements[0]?.id || ''
    setSvgMarkup(parsed.markup)
    setSourceDraft(parsed.markup)
    setElements(parsed.elements)
    setSelectedId(validSelectedId)
    setSelectedIds(validSelectedId ? [validSelectedId] : [])
    setFileName(snapshot.fileName)
    setDirty(snapshot.dirty)
  }

  const undo = () => {
    if (!history.past.length) return
    const previous = history.past[history.past.length - 1]
    setHistory({ past: history.past.slice(0, -1), future: [currentSnapshot(), ...history.future].slice(0, historyLimit) })
    restoreSnapshot(previous)
  }

  const redo = () => {
    if (!history.future.length) return
    const next = history.future[0]
    setHistory({ past: [...history.past, currentSnapshot()].slice(-historyLimit), future: history.future.slice(1) })
    restoreSnapshot(next)
  }

  const loadDocument = (rawMarkup, nextFileName = 'untitled.svg') => {
    const parsed = parseSvg(rawMarkup)
    setSvgMarkup(parsed.markup)
    setSourceDraft(parsed.markup)
    setElements(parsed.elements)
    setSelectedId(parsed.elements[0]?.id || '')
    setSelectedIds(parsed.elements[0]?.id ? [parsed.elements[0].id] : [])
    setFileName(nextFileName)
    setDirty(false)
    setHistory({ past: [], future: [] })
    return parsed
  }

  return {
    language, setLanguage,
    svgMarkup, setSvgMarkup,
    sourceDraft, setSourceDraft,
    elements, setElements,
    selectedId, setSelectedId,
    selectedIds, setSelectedIds,
    fileName, setFileName,
    dirty, setDirty,
    history, setHistory,
    storageError, setStorageError,
    selectLayerIds, currentSnapshot, commitDocument, restoreSnapshot, undo, redo, loadDocument,
  }
}
