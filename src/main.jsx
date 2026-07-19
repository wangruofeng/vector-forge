import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { COPY, ADD_LAYER_TAGS, getLayerDisplayName, getTagDisplayName } from './app/copy.js'
import Icon from './components/Icon.jsx'
import LayerPanel from './components/LayerPanel.jsx'
import CanvasPanel from './components/CanvasPanel.jsx'
import InspectorPanel from './components/InspectorPanel.jsx'
import useEditorDocument from './hooks/useEditorDocument.js'
import useCanvasInteraction from './hooks/useCanvasInteraction.js'
import { getAncestorGroupIds, getColor, getVisibleLayerItems, isElementHidden, setElementVisibility } from './editor/svg-parser.js'
import { getSvgDimensions, getTopLevelSelectedIds } from './editor/svg-geometry.js'
import { copyLayerMarkup, createLayerMarkup, formatSvgMarkup, getEditableTextContent, highlightSvgSource, insertClonedLayer, minifySvg, removeLayer, reorderSiblingElements, sanitizeForExport, syncTextLineLayout, translateElementsById, updateElementAttributes, withExplicitSize } from './editor/svg-transforms.js'

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480">
  <g id="background" data-name="Background">
    <rect width="720" height="480" rx="24" fill="#F4F1EA" />
  </g>
  <g id="logo-mark" data-name="Logo mark">
    <circle cx="360" cy="194" r="92" fill="#FF8B5C" />
    <path d="M300 222c30-104 180-108 182-5 1 55-44 87-101 87-54 0-88-29-81-82Z" fill="#5B75FF" />
  </g>
  <text id="wordmark" data-name="Wordmark" x="360" y="370" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="54" letter-spacing="5" fill="#15203A">VECTOR</text>
</svg>`

const STORAGE_KEY = 'vector-forge:document'
const HISTORY_LIMIT = 50

function bytesToBase64Url(bytes) {
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

async function compressText(text) {
  if (typeof CompressionStream === 'undefined') return null
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function decompressText(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Response(stream).text()
}

function App() {
  const { language, setLanguage, svgMarkup, sourceDraft, setSourceDraft, elements, selectedId, setSelectedId, selectedIds, setSelectedIds, fileName, dirty, setDirty, history, storageError, setStorageError, selectLayerIds, currentSnapshot, commitDocument, undo, redo, loadDocument } = useEditorDocument({ initialMarkup: SAMPLE_SVG, storageKey: STORAGE_KEY, historyLimit: HISTORY_LIMIT })
  const [activeTab, setActiveTab] = useState('preview')
  const [isLayersOpen, setIsLayersOpen] = useState(true)
  const [isInspectorOpen, setIsInspectorOpen] = useState(true)
  const [addLayerMenuOpen, setAddLayerMenuOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [isFileDragOver, setIsFileDragOver] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState('svg')
  const [exportScale, setExportScale] = useState(2)
  const [exportBackground, setExportBackground] = useState('transparent')
  const [exportCustomColor, setExportCustomColor] = useState('#FFFFFF')
  const [exportOptimize, setExportOptimize] = useState(true)
  const [contextMenu, setContextMenu] = useState(null)
  const [renamingLayerId, setRenamingLayerId] = useState('')
  const [renameDraft, setRenameDraft] = useState('')
  const [expandedGroups, setExpandedGroups] = useState({})
  const [sourceDisplayMode, setSourceDisplayMode] = useState('edit')
  const [draggingLayerId, setDraggingLayerId] = useState('')
  const [dragOverLayerId, setDragOverLayerId] = useState('')
  const [editingTextId, setEditingTextId] = useState('')
  const [textDraft, setTextDraft] = useState('')
  const [textEditStyle, setTextEditStyle] = useState({})
  const [textFieldDraft, setTextFieldDraft] = useState('')
  const [attributeDrafts, setAttributeDrafts] = useState({ targetId: '', values: {} })
  const fileInput = useRef(null)
  const layerRowRefs = useRef(new Map())
  const layerDragRef = useRef(null)
  const suppressLayerClickRef = useRef(false)
  const sourceHighlightRef = useRef(null)
  const clipboardLayerRef = useRef(null)
  const textEditRef = useRef(null)
  const attributePreviewFrameRef = useRef(0)
  const pendingAttributeUpdatesRef = useRef(null)
  const attributeCommitTimerRef = useRef(0)
  const toastTimerRef = useRef(0)
  const fileDragCounterRef = useRef(0)
  const renameInputRef = useRef(null)
  const copy = COPY[language]

  useLayoutEffect(() => {
    document.getElementById('root')?.removeAttribute('data-booting')
  }, [])

  const shortcutGroups = [
    {
      title: copy.shortcutsGeneral,
      items: [
        ['⌘Z', copy.shortcutUndo],
        ['⌘⇧Z', copy.shortcutRedo],
        ['⌘S', copy.shortcutExport],
        ['⌘A', copy.shortcutSelectAll],
        ['⌘C', copy.shortcutCopy],
        ['⌘V', copy.shortcutPaste],
        ['⌫', copy.shortcutDelete],
        ['⌘\\', copy.shortcutPanels],
        ['?', copy.shortcutHelp],
      ],
    },
    {
      title: copy.shortcutsCanvas,
      items: [
        ['⌘=', copy.shortcutZoomIn],
        ['⌘-', copy.shortcutZoomOut],
        ['⌘0', copy.shortcutZoomFit],
        [copy.shortcutKeyDrag, copy.shortcutPan],
        [copy.shortcutKeyScroll, copy.shortcutZoom],
        [copy.shortcutKeyDoubleClick, copy.shortcutEditText],
        ['Esc', copy.shortcutDeselect],
      ],
    },
  ]

  const selected = elements.find((item) => item.id === selectedId)
  const selectedAttrs = selected ? selected.node : null
  const selectedDisplayName = selected ? getLayerDisplayName(selected, language) : ''
  const contextMenuTarget = contextMenu ? elements.find((element) => element.id === contextMenu.targetId) : null
  const canvasInteraction = useCanvasInteraction({ activeTab, selectedId, selectedIds, selected, elements, svgMarkup, currentSnapshot, commitDocument, selectLayerIds })
  const { canvasRef, svgRef, svgPosition, setSvgPosition, svgScale, setSvgScale, isDraggingSvg, isDraggingElement, isResizingElement, isPinchingSvg, selectionBox, multiSelectionBoxes, hoveredLayerId, setHoveredLayerId, transientMarkup, updateTransientMarkup, clearTransientMarkup, zoomBy, fitToScreen, getElementSvgBounds, handleCanvasClick, handleCanvasPointerDown: handleCanvasPointerDownBase, handleCanvasPointerMove, handleCanvasPointerUp: handleCanvasPointerUpBase, handleResizePointerMove, handleResizePointerUp } = canvasInteraction
  const handleSvgDoubleClick = (event) => canvasInteraction.handleSvgDoubleClick(event, setTextDraft, setEditingTextId, setTextEditStyle)
  const handleCanvasPointerDown = (event) => handleCanvasPointerDownBase(event, setTextDraft, setEditingTextId, setTextEditStyle)
  const handleCanvasPointerUp = (event, cancelled = false) => handleCanvasPointerUpBase(event, cancelled, setTextDraft, setEditingTextId, setTextEditStyle)
  const handleResizePointerDown = (event, handle) => canvasInteraction.handleResizePointerDown(event, handle)
  const renderedMarkup = transientMarkup || svgMarkup
  const getDraftedAttribute = (attribute, fallback = '') => {
    if (attributeDrafts.targetId === selected?.id && Object.hasOwn(attributeDrafts.values, attribute)) return attributeDrafts.values[attribute]
    return selectedAttrs?.getAttribute(attribute) || fallback
  }
  const textFontSize = selected?.tag === 'text' ? getDraftedAttribute('font-size', '16') : '16'
  const textLetterSpacing = selected?.tag === 'text' ? getDraftedAttribute('letter-spacing', '0') : '0'
  const textFontFamily = selected?.tag === 'text' ? getDraftedAttribute('font-family') : ''
  const visibleLayerItems = getVisibleLayerItems(elements, expandedGroups)
  const highlightedSource = useMemo(() => highlightSvgSource(sourceDraft), [sourceDraft])

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
    document.title = copy.documentTitle
  }, [language])

  useEffect(() => {
    if (selected?.tag === 'text') setTextFieldDraft(getEditableTextContent(selected.node))
    else setTextFieldDraft('')
    setAttributeDrafts({ targetId: '', values: {} })
    pendingAttributeUpdatesRef.current = null
    if (attributeCommitTimerRef.current) window.clearTimeout(attributeCommitTimerRef.current)
    attributeCommitTimerRef.current = 0
    if (attributePreviewFrameRef.current) cancelAnimationFrame(attributePreviewFrameRef.current)
    attributePreviewFrameRef.current = 0
  }, [selectedId, svgMarkup])

  useEffect(() => {
    if (!editingTextId) return
    const editor = textEditRef.current
    if (!editor) return
    editor.textContent = textDraft
    editor.focus()
    const range = document.createRange()
    range.selectNodeContents(editor)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  }, [editingTextId])

  useEffect(() => {
    const handleOutsideLayerMenu = (event) => {
      if (!event.target?.closest?.('.layers-panel')) setAddLayerMenuOpen(false)
    }
    document.addEventListener('pointerdown', handleOutsideLayerMenu, true)
    return () => document.removeEventListener('pointerdown', handleOutsideLayerMenu, true)
  }, [])

  useEffect(() => {
    const ancestorIds = getAncestorGroupIds(elements, selectedId)
    if (!ancestorIds.length) return
    setExpandedGroups((current) => {
      const next = { ...current }
      let changed = false
      ancestorIds.forEach((id) => {
        if (next[id] === false) {
          next[id] = true
          changed = true
        }
      })
      return changed ? next : current
    })
  }, [elements, selectedId])

  useEffect(() => {
    const row = layerRowRefs.current.get(selectedId)
    if (!row) return
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    row.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [selectedId, visibleLayerItems.length])

  const showToast = (message, kind = 'success') => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    setToast({ id: Date.now(), kind, message })
    toastTimerRef.current = window.setTimeout(() => {
      toastTimerRef.current = 0
      setToast(null)
    }, 3200)
  }

  useEffect(() => {
    if (!storageError) return
    showToast(copy.storageFull, 'error')
    setStorageError(false)
  }, [storageError, copy.storageFull])

  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
  }, [])

  const previewAttributes = (updates) => {
    if (!selected) return
    const pending = pendingAttributeUpdatesRef.current
    const nextUpdates = pending?.targetId === selected.id ? { ...pending.updates, ...updates } : { ...updates }
    pendingAttributeUpdatesRef.current = { targetId: selected.id, updates: nextUpdates }
    setAttributeDrafts((current) => ({
      targetId: selected.id,
      values: current.targetId === selected.id ? { ...current.values, ...updates } : { ...updates },
    }))
    if (attributePreviewFrameRef.current) return
    attributePreviewFrameRef.current = requestAnimationFrame(() => {
      attributePreviewFrameRef.current = 0
      const next = pendingAttributeUpdatesRef.current
      if (!next) return
      updateTransientMarkup(updateElementAttributes(svgMarkup, next.targetId, next.updates))
    })
  }

  const commitPreviewAttributes = () => {
    if (attributeCommitTimerRef.current) window.clearTimeout(attributeCommitTimerRef.current)
    attributeCommitTimerRef.current = 0
    const pending = pendingAttributeUpdatesRef.current
    if (!pending) return
    if (attributePreviewFrameRef.current) cancelAnimationFrame(attributePreviewFrameRef.current)
    attributePreviewFrameRef.current = 0
    pendingAttributeUpdatesRef.current = null
    const nextMarkup = updateElementAttributes(svgMarkup, pending.targetId, pending.updates)
    clearTransientMarkup()
    setAttributeDrafts({ targetId: '', values: {} })
    commitDocument(nextMarkup, { nextSelectedId: pending.targetId })
  }

  // Preview an attribute change and auto-commit after a short idle window. Needed
  // because <input type="color"> on macOS never fires `blur` after the native
  // picker closes, so relying on onBlur alone would drop the change.
  const previewAttributeDebounced = (attribute, value) => {
    previewAttribute(attribute, value)
    if (attributeCommitTimerRef.current) window.clearTimeout(attributeCommitTimerRef.current)
    attributeCommitTimerRef.current = window.setTimeout(() => {
      attributeCommitTimerRef.current = 0
      commitPreviewAttributes()
    }, 450)
  }

  const handleTextAttributeKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.blur()
    }
  }

  const loadSvg = (raw, name = 'untitled.svg', { silent = false } = {}) => {
    try {
      loadDocument(raw, name)
      setSvgPosition({ x: 0, y: 0 })
      setSvgScale(1)
      setExpandedGroups({})
      setSourceDisplayMode('edit')
      setActiveTab('preview')
      if (!silent) showToast(`${copy.toastImported} ${name}`)
    } catch {
      showToast(copy.invalidSvg, 'error')
    }
  }

  useEffect(() => {
    const handleHistoryShortcut = (event) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.key.toLowerCase() !== 'z') return
      if (event.target?.closest?.('input, textarea, [contenteditable="true"]')) return
      const action = event.shiftKey ? redo : undo
      const canRun = event.shiftKey ? history.future.length : history.past.length
      if (!canRun) return
      event.preventDefault()
      action()
    }
    window.addEventListener('keydown', handleHistoryShortcut)
    return () => window.removeEventListener('keydown', handleHistoryShortcut)
  }, [dirty, fileName, history, selectedId, svgMarkup])

  const previewAttribute = (attribute, value) => previewAttributes({ [attribute]: value })

  const previewRectRadius = (value) => {
    if (!selected || selected.tag !== 'rect') return
    const nextValue = value === '' || value == null || Number(value) === 0 ? '' : value
    previewAttributes({ rx: nextValue, ry: nextValue })
  }

  const commitTextEdit = (nextText = textDraft) => {
    if (!editingTextId) return
    const doc = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml')
    const node = doc.querySelector(`[data-editor-id="${editingTextId}"]`)
    if (node) {
      node.textContent = nextText
      syncTextLineLayout(node)
      const nextMarkup = new XMLSerializer().serializeToString(doc.documentElement)
      commitDocument(nextMarkup, { nextSelectedId: editingTextId })
    }
    setEditingTextId('')
    setTextEditStyle({})
  }

  const commitTextField = () => {
    if (!selected || selected.tag !== 'text') return
    const doc = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml')
    const node = doc.querySelector(`[data-editor-id="${selected.id}"]`)
    if (!node || getEditableTextContent(node) === textFieldDraft) return
    node.textContent = textFieldDraft
    syncTextLineLayout(node)
    const nextMarkup = new XMLSerializer().serializeToString(doc.documentElement)
    commitDocument(nextMarkup, { nextSelectedId: selected.id })
  }

  const cancelTextEdit = () => {
    setEditingTextId('')
    setTextEditStyle({})
  }

  const toggleVisibility = (item, event) => {
    event.stopPropagation()
    const doc = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml')
    const node = doc.querySelector(`[data-editor-id="${item.id}"]`)
    if (!node) return
    setElementVisibility(node, !isElementHidden(node))
    const nextMarkup = new XMLSerializer().serializeToString(doc.documentElement)
    commitDocument(nextMarkup, { nextSelectedId: item.id })
  }

  const toggleGroup = (item, event) => {
    event.stopPropagation()
    setExpandedGroups((current) => ({ ...current, [item.id]: current[item.id] === false }))
  }

  const handleLayerMouseDown = (event, item) => {
    if (event.target?.closest?.('button')) {
      return
    }
    layerDragRef.current = { id: item.id, startY: event.clientY, active: false }
  }

  const clearLayerDrag = () => {
    setDraggingLayerId('')
    setDragOverLayerId('')
  }

  useEffect(() => {
    const handleLayerMouseMove = (event) => {
      const drag = layerDragRef.current
      if (!drag) return
      if (!drag.active && Math.abs(event.clientY - drag.startY) < 4) return
      if (!drag.active) {
        drag.active = true
        setDraggingLayerId(drag.id)
      }
      event.preventDefault()
      const targetRow = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('.layer-row')
      setDragOverLayerId(targetRow?.getAttribute('data-layer-id') || '')
    }

    const handleLayerMouseUp = (event) => {
      const drag = layerDragRef.current
      if (!drag) return
      if (drag.active) {
        event.preventDefault()
        suppressLayerClickRef.current = true
        const targetId = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('.layer-row')?.getAttribute('data-layer-id') || ''
        const nextMarkup = targetId && targetId !== drag.id ? reorderSiblingElements(svgMarkup, drag.id, targetId) : svgMarkup
        clearLayerDrag()
        if (nextMarkup !== svgMarkup) commitDocument(nextMarkup, { nextSelectedId: drag.id })
      }
      layerDragRef.current = null
    }

    const cancelLayerDrag = () => {
      if (!layerDragRef.current) return
      layerDragRef.current = null
      clearLayerDrag()
    }

    window.addEventListener('mousemove', handleLayerMouseMove)
    window.addEventListener('mouseup', handleLayerMouseUp)
    window.addEventListener('blur', cancelLayerDrag)
    return () => {
      window.removeEventListener('mousemove', handleLayerMouseMove)
      window.removeEventListener('mouseup', handleLayerMouseUp)
      window.removeEventListener('blur', cancelLayerDrag)
    }
  }, [svgMarkup])

  const handleFile = (file) => {
    if (!file) return
    if (!/\.svg$/i.test(file.name) && file.type !== 'image/svg+xml') {
      showToast(copy.toastInvalidFile, 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = () => loadSvg(String(reader.result), file.name)
    reader.onerror = () => showToast(copy.invalidSvg, 'error')
    reader.readAsText(file)
  }

  const addLayer = (tag) => {
    const textContent = copy.newLayerText
    const created = createLayerMarkup(svgMarkup, tag, textContent)
    commitDocument(created.markup, { nextSelectedId: created.id })
    setAddLayerMenuOpen(false)
    setActiveTab('preview')
    if (tag === 'text') {
      setTextDraft(textContent)
      setEditingTextId(created.id)
    }
  }

  const copySelectedLayer = (event) => {
    if (!selected) return
    const markup = copyLayerMarkup(svgMarkup, selected.id)
    if (!markup) return
    clipboardLayerRef.current = markup
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(markup).catch(() => {})
    event?.preventDefault()
    showToast(copy.toastCopy)
  }

  const pasteLayer = (event) => {
    if (!selected || !clipboardLayerRef.current) return
    const pastedId = `node-paste-${Date.now()}`
    const nextMarkup = insertClonedLayer(svgMarkup, clipboardLayerRef.current, selected.id, pastedId)
    if (nextMarkup === svgMarkup) return
    event?.preventDefault()
    commitDocument(nextMarkup, { nextSelectedId: pastedId })
    setActiveTab('preview')
    showToast(copy.toastPaste)
  }

  const deleteSelectedLayer = (event) => {
    if (!selected) return
    const removed = removeLayer(svgMarkup, selected.id)
    if (removed.markup === svgMarkup) return
    event?.preventDefault()
    commitDocument(removed.markup, { nextSelectedId: removed.nextSelectedId })
    showToast(copy.toastDelete)
  }

  const cyclePanels = () => {
    if (isLayersOpen && isInspectorOpen) {
      setIsLayersOpen(false)
    } else if (!isLayersOpen && isInspectorOpen) {
      setIsInspectorOpen(false)
    } else if (!isLayersOpen && !isInspectorOpen) {
      setIsLayersOpen(true)
    } else {
      setIsInspectorOpen(true)
    }
  }

  useEffect(() => {
    const handleEditorShortcuts = (event) => {
      if (event.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return
      const key = event.key.toLowerCase()
      const modifier = event.metaKey || event.ctrlKey
      if (key === 'escape') {
        if (contextMenu) {
          setContextMenu(null)
          return
        }
        if (exportOpen) {
          setExportOpen(false)
          return
        }
        if (renamingLayerId) {
          setRenamingLayerId('')
          return
        }
        if (showShortcuts) {
          setShowShortcuts(false)
          return
        }
        setSelectedId('')
        setSelectedIds([])
        return
      }
      if (!modifier && !event.altKey && event.key === '?') {
        event.preventDefault()
        setShowShortcuts((current) => !current)
        return
      }
      if (modifier && key === 's') {
        event.preventDefault()
        exportSvg()
        return
      }
      if (modifier && (event.key === '=' || event.key === '+')) {
        event.preventDefault()
        zoomBy(1.25)
        return
      }
      if (modifier && event.key === '-') {
        event.preventDefault()
        zoomBy(0.8)
        return
      }
      if (modifier && event.key === '0') {
        event.preventDefault()
        fitToScreen()
        return
      }
      if (modifier && (event.key === '\\' || event.code === 'Backslash')) {
        event.preventDefault()
        cyclePanels()
        return
      }
      if (modifier && key === 'a') {
        event.preventDefault()
        selectLayerIds(elements.map((item) => item.id), selectedId)
        return
      }
      if (modifier && key === 'c') {
        copySelectedLayer(event)
        return
      }
      if (modifier && key === 'v') {
        pasteLayer(event)
        return
      }
      if (key === 'delete' || key === 'backspace') deleteSelectedLayer(event)
    }
    window.addEventListener('keydown', handleEditorShortcuts)
    return () => window.removeEventListener('keydown', handleEditorShortcuts)
  }, [selectedId, selectedIds, elements, svgMarkup, fileName, dirty, history, isLayersOpen, isInspectorOpen, showShortcuts, svgScale, contextMenu, exportOpen, renamingLayerId])

  const syncSourceScroll = (event) => {
    if (!sourceHighlightRef.current) return
    sourceHighlightRef.current.scrollTop = event.currentTarget.scrollTop
    sourceHighlightRef.current.scrollLeft = event.currentTarget.scrollLeft
  }

  const formatSource = () => {
    try {
      const formatted = formatSvgMarkup(sourceDraft)
      commitDocument(formatted, { nextSelectedId: selectedId })
      setSourceDraft(formatted)
      setSourceDisplayMode('tree')
      showToast(copy.toastFormatted)
    } catch {
      showToast(copy.invalidSvg, 'error')
    }
  }

  const loadDemo = () => loadSvg(SAMPLE_SVG, 'demo.svg')

  const hasDraggedFiles = (event) => Array.from(event.dataTransfer?.types || []).includes('Files')

  const handleFileDragEnter = (event) => {
    if (!hasDraggedFiles(event)) return
    event.preventDefault()
    fileDragCounterRef.current += 1
    setIsFileDragOver(true)
  }

  const handleFileDragOver = (event) => {
    if (!hasDraggedFiles(event)) return
    event.preventDefault()
  }

  const handleFileDragLeave = (event) => {
    if (!hasDraggedFiles(event)) return
    fileDragCounterRef.current = Math.max(0, fileDragCounterRef.current - 1)
    if (fileDragCounterRef.current === 0) setIsFileDragOver(false)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    fileDragCounterRef.current = 0
    setIsFileDragOver(false)
    handleFile(event.dataTransfer.files?.[0])
  }

  const downloadBlob = (blob, name) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportSvg = () => {
    downloadBlob(new Blob([sanitizeForExport(svgMarkup)], { type: 'image/svg+xml' }), `${fileName.replace(/\.svg$/i, '')}-edited.svg`)
    setDirty(false)
    showToast(copy.toastExported)
  }

  const exportDocument = () => {
    const baseName = fileName.replace(/\.svg$/i, '') || 'untitled'
    const cleanMarkup = sanitizeForExport(svgMarkup)
    const dimensions = getSvgDimensions(new DOMParser().parseFromString(cleanMarkup, 'image/svg+xml'))
    if (exportFormat === 'svg') {
      // Bake the viewBox's intrinsic pixel size into width/height so the file
      // renders at the design dimensions anywhere it's opened. Without this,
      // a viewBox-only SVG falls back to the viewer's default 300×150 / 100%
      // sizing, which never matches what the canvas shows.
      const sizedMarkup = withExplicitSize(cleanMarkup, Math.round(dimensions.width), Math.round(dimensions.height))
      const output = exportOptimize ? minifySvg(sizedMarkup) : sizedMarkup
      downloadBlob(new Blob([output], { type: 'image/svg+xml' }), `${baseName}-edited.svg`)
      setDirty(false)
      setExportOpen(false)
      showToast(copy.toastExported)
      return
    }
    const pixelWidth = Math.max(1, Math.round(dimensions.width * exportScale))
    const pixelHeight = Math.max(1, Math.round(dimensions.height * exportScale))
    const sizedMarkup = withExplicitSize(cleanMarkup, pixelWidth, pixelHeight)
    const imageUrl = URL.createObjectURL(new Blob([sizedMarkup], { type: 'image/svg+xml' }))
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = pixelWidth
      canvas.height = pixelHeight
      const context = canvas.getContext('2d')
      if (exportBackground !== 'transparent') {
        context.fillStyle = exportBackground === 'white' ? '#FFFFFF' : exportCustomColor
        context.fillRect(0, 0, pixelWidth, pixelHeight)
      }
      context.drawImage(image, 0, 0, pixelWidth, pixelHeight)
      URL.revokeObjectURL(imageUrl)
      canvas.toBlob((blob) => {
        if (blob) {
          downloadBlob(blob, `${baseName}-${exportScale}x.${exportFormat}`)
          setDirty(false)
          setExportOpen(false)
          showToast(copy.toastExported)
        } else {
          showToast(copy.exportFailed, 'error')
        }
      }, `image/${exportFormat}`, 0.92)
    }
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl)
      showToast(copy.exportFailed, 'error')
    }
    image.src = imageUrl
  }

  const alignSelection = (type) => {
    const topIds = getTopLevelSelectedIds(svgMarkup, selectedIds)
    const items = topIds.map((id) => ({ id, box: getElementSvgBounds(id) })).filter((item) => item.box)
    if (items.length < 2) return
    const isDistribute = type === 'distribute-x' || type === 'distribute-y'
    if (isDistribute && items.length < 3) return
    const minX = Math.min(...items.map((item) => item.box.minX))
    const maxX = Math.max(...items.map((item) => item.box.maxX))
    const minY = Math.min(...items.map((item) => item.box.minY))
    const maxY = Math.max(...items.map((item) => item.box.maxY))
    let moves = []
    if (type === 'left') moves = items.map((item) => ({ id: item.id, dx: minX - item.box.minX, dy: 0 }))
    else if (type === 'center-x') {
      const centerX = (minX + maxX) / 2
      moves = items.map((item) => ({ id: item.id, dx: centerX - item.box.cx, dy: 0 }))
    } else if (type === 'right') moves = items.map((item) => ({ id: item.id, dx: maxX - item.box.maxX, dy: 0 }))
    else if (type === 'top') moves = items.map((item) => ({ id: item.id, dx: 0, dy: minY - item.box.minY }))
    else if (type === 'center-y') {
      const centerY = (minY + maxY) / 2
      moves = items.map((item) => ({ id: item.id, dx: 0, dy: centerY - item.box.cy }))
    } else if (type === 'bottom') moves = items.map((item) => ({ id: item.id, dx: 0, dy: maxY - item.box.maxY }))
    else {
      const horizontal = type === 'distribute-x'
      const sorted = [...items].sort((a, b) => (horizontal ? a.box.cx - b.box.cx : a.box.cy - b.box.cy))
      const first = sorted[0]
      const last = sorted[sorted.length - 1]
      const span = horizontal ? last.box.cx - first.box.cx : last.box.cy - first.box.cy
      const step = span / (sorted.length - 1)
      moves = sorted.map((item, index) => {
        const target = (horizontal ? first.box.cx : first.box.cy) + step * index
        return horizontal
          ? { id: item.id, dx: target - item.box.cx, dy: 0 }
          : { id: item.id, dx: 0, dy: target - item.box.cy }
      })
    }
    const nextMarkup = translateElementsById(svgMarkup, moves)
    if (nextMarkup !== svgMarkup) commitDocument(nextMarkup, { nextSelectedId: selectedId, nextSelectedIds: selectedIds })
  }

  const openContextMenu = (event, targetId) => {
    event.preventDefault()
    event.stopPropagation()
    if (targetId && !selectedIds.includes(targetId)) selectLayerIds([targetId], targetId)
    const menuWidth = 180
    const menuHeight = 210
    setContextMenu({
      x: Math.min(event.clientX, window.innerWidth - menuWidth - 8),
      y: Math.min(event.clientY, window.innerHeight - menuHeight - 8),
      targetId,
    })
  }

  const startRename = (targetId) => {
    const item = elements.find((element) => element.id === targetId)
    if (!item) return
    setRenameDraft(item.node.getAttribute('data-name') || item.name)
    setRenamingLayerId(targetId)
    setContextMenu(null)
  }

  const commitRename = () => {
    if (!renamingLayerId) return
    const targetId = renamingLayerId
    const trimmed = renameDraft.trim()
    const doc = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml')
    const node = doc.querySelector(`[data-editor-id="${targetId}"]`)
    setRenamingLayerId('')
    if (!node) return
    const currentName = node.getAttribute('data-name') || ''
    if (trimmed === currentName) return
    if (trimmed) node.setAttribute('data-name', trimmed)
    else node.removeAttribute('data-name')
    commitDocument(new XMLSerializer().serializeToString(doc.documentElement), { nextSelectedId: targetId })
  }

  const shareDocument = async () => {
    try {
      const payload = sanitizeForExport(svgMarkup)
      const compressed = await compressText(payload)
      const encoded = compressed ? `d=${bytesToBase64Url(compressed)}` : `r=${bytesToBase64Url(new TextEncoder().encode(payload))}`
      const url = `${window.location.origin}${window.location.pathname}#${encoded}`
      window.history.replaceState(null, '', `#${encoded}`)
      await navigator.clipboard.writeText(url)
      showToast(copy.shareCopied)
    } catch {
      showToast(copy.shareFailed, 'error')
    }
  }

  useEffect(() => {
    const hash = window.location.hash
    const match = hash.match(/^#(d|r)=(.+)$/)
    if (!match) return undefined
    let cancelled = false
    const restoreShared = async () => {
      try {
        const bytes = base64UrlToBytes(match[2])
        const text = match[1] === 'd' ? await decompressText(bytes) : new TextDecoder().decode(bytes)
        if (cancelled) return
        window.history.replaceState(null, '', window.location.pathname)
        loadSvg(text, 'shared.svg', { silent: true })
        showToast(copy.sharedOpened)
      } catch {
        if (!cancelled) showToast(copy.shareFailed, 'error')
      }
    }
    restoreShared()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!contextMenu) return undefined
    const close = () => setContextMenu(null)
    window.addEventListener('pointerdown', close)
    window.addEventListener('blur', close)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('blur', close)
      window.removeEventListener('resize', close)
    }
  }, [contextMenu])

  useEffect(() => {
    if (!renamingLayerId) return
    renameInputRef.current?.focus()
    renameInputRef.current?.select()
  }, [renamingLayerId])

  const fill = getDraftedAttribute('fill', getColor(selectedAttrs?.getAttribute('fill'), '#5B75FF'))
  const stroke = getDraftedAttribute('stroke', getColor(selectedAttrs?.getAttribute('stroke'), '#15203A'))
  const opacity = Number(getDraftedAttribute('opacity', '1'))
  const strokeWidth = Number(getDraftedAttribute('stroke-width', '0'))
  const rectWidthValue = getDraftedAttribute('width', selectedAttrs?.getAttribute('width') || '200')
  const rectHeightValue = getDraftedAttribute('height', selectedAttrs?.getAttribute('height') || '200')
  const rectWidth = Number(rectWidthValue) || 200
  const rectHeight = Number(rectHeightValue) || 200
  const cornerRadiusMax = Math.max(1, Math.floor(Math.min(rectWidth, rectHeight) / 2))
  const cornerRadius = Math.min(cornerRadiusMax, Number(getDraftedAttribute('rx', '0')))
  const selectionPreviewBoxes = selectedIds.length > 1 ? [selectionBox, ...multiSelectionBoxes].filter(Boolean) : []
  const selectionGroupBox = selectionPreviewBoxes.length > 1 ? {
    left: Math.min(...selectionPreviewBoxes.map((box) => box.left)),
    top: Math.min(...selectionPreviewBoxes.map((box) => box.top)),
    right: Math.max(...selectionPreviewBoxes.map((box) => box.left + box.width)),
    bottom: Math.max(...selectionPreviewBoxes.map((box) => box.top + box.height)),
  } : null

  return (
    <main className="app-shell" onDragEnter={handleFileDragEnter} onDragOver={handleFileDragOver} onDragLeave={handleFileDragLeave} onDrop={handleDrop}>
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><span /></span><span>VECTOR FORGE</span><a className="brand-github-link" href="https://github.com/wangruofeng/vector-forge" target="_blank" rel="noreferrer" title={copy.githubRepository} aria-label={copy.githubRepository}><Icon name="github" size={17} /></a></div>
        <div className="topbar-actions">
          <button className="icon-button" title={`${copy.undo} (⌘Z)`} aria-keyshortcuts="Meta+Z" onClick={undo} disabled={!history.past.length}><Icon name="undo" /></button>
          <button className="icon-button" title={`${copy.redo} (⌘⇧Z)`} aria-keyshortcuts="Meta+Shift+Z" onClick={redo} disabled={!history.future.length}><Icon name="redo" /></button>
          <button className="icon-button" type="button" title={`${copy.shortcutsTitle} (?)`} aria-label={copy.shortcutsTitle} aria-pressed={showShortcuts} onClick={() => setShowShortcuts((current) => !current)}><Icon name="help" /></button>
          <button className="icon-button" type="button" title={copy.share} aria-label={copy.share} onClick={shareDocument}><Icon name="link" /></button>
          <span className="divider" />
          <span className="save-state"><span className={`status-dot ${dirty ? 'dirty' : ''}`} />{dirty ? copy.unsaved : copy.saved}</span>
          <button className="language-toggle" type="button" onClick={() => setLanguage((current) => current === 'en' ? 'zh' : 'en')} aria-label={copy.languageSwitch}>{copy.languageSwitch}</button>
          <button className="button button-quiet" onClick={() => fileInput.current?.click()}><Icon name="download" /> {copy.open}</button>
          <button className="button button-accent" onClick={() => setExportOpen(true)}><Icon name="upload" /> {copy.export}</button>
          <input ref={fileInput} type="file" accept="image/svg+xml,.svg" hidden onChange={(event) => handleFile(event.target.files?.[0])} />
        </div>
      </header>

      <section className={`workspace ${isLayersOpen ? '' : 'layers-collapsed'} ${isInspectorOpen ? '' : 'inspector-collapsed'}`}>
        <LayerPanel
          copy={copy}
          language={language}
          isLayersOpen={isLayersOpen}
          setIsLayersOpen={setIsLayersOpen}
          addLayerMenuOpen={addLayerMenuOpen}
          setAddLayerMenuOpen={setAddLayerMenuOpen}
          visibleLayerItems={visibleLayerItems}
          selectedIds={selectedIds}
          selectLayerIds={selectLayerIds}
          layerRowRefs={layerRowRefs}
          draggingLayerId={draggingLayerId}
          dragOverLayerId={dragOverLayerId}
          suppressLayerClickRef={suppressLayerClickRef}
          handleLayerMouseDown={handleLayerMouseDown}
          openContextMenu={openContextMenu}
          startRename={startRename}
          toggleGroup={toggleGroup}
          expandedGroups={expandedGroups}
          renamingLayerId={renamingLayerId}
          renameInputRef={renameInputRef}
          renameDraft={renameDraft}
          setRenameDraft={setRenameDraft}
          commitRename={commitRename}
          toggleVisibility={toggleVisibility}
          addLayer={addLayer}
        />
        <CanvasPanel
          copy={copy}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          formatSource={formatSource}
          sourceDisplayMode={sourceDisplayMode}
          setSourceDisplayMode={setSourceDisplayMode}
          expandedGroups={expandedGroups}
          toggleGroup={toggleGroup}
          selectedIds={selectedIds}
          selectLayerIds={selectLayerIds}
          alignSelection={alignSelection}
          zoomBy={zoomBy}
          fitToScreen={fitToScreen}
          svgScale={svgScale}
          setSvgScale={setSvgScale}
          setSvgPosition={setSvgPosition}
          canvasRef={canvasRef}
          handleCanvasClick={handleCanvasClick}
          handleSvgDoubleClick={handleSvgDoubleClick}
          openContextMenu={openContextMenu}
          handleCanvasPointerDown={handleCanvasPointerDown}
          handleCanvasPointerMove={handleCanvasPointerMove}
          handleCanvasPointerUp={handleCanvasPointerUp}
          hoveredLayerId={hoveredLayerId}
          setHoveredLayerId={setHoveredLayerId}
          elements={elements}
          isDraggingSvg={isDraggingSvg}
          isDraggingElement={isDraggingElement}
          isPinchingSvg={isPinchingSvg}
          svgRef={svgRef}
          svgPosition={svgPosition}
          renderedMarkup={renderedMarkup}
          editingTextId={editingTextId}
          textEditStyle={textEditStyle}
          selectedId={selectedId}
          selected={selected}
          selectionBox={selectionBox}
          textEditRef={textEditRef}
          textDraft={textDraft}
          setTextDraft={setTextDraft}
          commitTextEdit={commitTextEdit}
          cancelTextEdit={cancelTextEdit}
          language={language}
          selectionGroupBox={selectionGroupBox}
          multiSelectionBoxes={multiSelectionBoxes}
          isResizingElement={isResizingElement}
          handleResizePointerMove={handleResizePointerMove}
          handleResizePointerUp={handleResizePointerUp}
          handleResizePointerDown={handleResizePointerDown}
          sourceHighlightRef={sourceHighlightRef}
          highlightedSource={highlightedSource}
          sourceDraft={sourceDraft}
          setSourceDraft={setSourceDraft}
          syncSourceScroll={syncSourceScroll}
          commitDocument={commitDocument}
          showToast={showToast}
          loadDemo={loadDemo}
          toast={toast}
          toastTimerRef={toastTimerRef}
          selectedDisplayName={selectedDisplayName}
          setToast={setToast}
        />
        <InspectorPanel
          copy={copy}
          language={language}
          isInspectorOpen={isInspectorOpen}
          setIsInspectorOpen={setIsInspectorOpen}
          selected={selected}
          selectedDisplayName={selectedDisplayName}
          textFieldDraft={textFieldDraft}
          setTextFieldDraft={setTextFieldDraft}
          commitTextField={commitTextField}
          setTextDraft={setTextDraft}
          setEditingTextId={setEditingTextId}
          textFontSize={textFontSize}
          textLetterSpacing={textLetterSpacing}
          textFontFamily={textFontFamily}
          previewAttributeDebounced={previewAttributeDebounced}
          commitPreviewAttributes={commitPreviewAttributes}
          handleTextAttributeKeyDown={handleTextAttributeKeyDown}
          rectWidthValue={rectWidthValue}
          rectHeightValue={rectHeightValue}
          fill={fill}
          stroke={stroke}
          opacity={opacity}
          strokeWidth={strokeWidth}
          cornerRadiusMax={cornerRadiusMax}
          cornerRadius={cornerRadius}
          previewRectRadius={previewRectRadius}
          elements={elements}
        />
      </section>

      {showShortcuts && <div className="shortcuts-overlay" onClick={() => setShowShortcuts(false)}>
        <div className="shortcuts-modal" role="dialog" aria-modal="true" aria-label={copy.shortcutsTitle} onClick={(event) => event.stopPropagation()}>
          <div className="shortcuts-header"><span>{copy.shortcutsTitle}</span><button className="mini-button" type="button" title={copy.close} aria-label={copy.close} onClick={() => setShowShortcuts(false)}><Icon name="x" size={14} /></button></div>
          <div className="shortcuts-grid">
            {shortcutGroups.map((group) => <div className="shortcuts-group" key={group.title}>
              <div className="section-label">{group.title}</div>
              {group.items.map(([keys, label]) => <div className="shortcut-row" key={label}><span className="kbd">{keys}</span><span className="shortcut-label">{label}</span></div>)}
            </div>)}
          </div>
          <p className="shortcuts-hint">{copy.shortcutsHint}</p>
        </div>
      </div>}
      {exportOpen && <div className="shortcuts-overlay" onClick={() => setExportOpen(false)}>
        <div className="shortcuts-modal export-modal" role="dialog" aria-modal="true" aria-label={copy.exportDialogTitle} onClick={(event) => event.stopPropagation()}>
          <div className="shortcuts-header"><span>{copy.exportDialogTitle}</span><button className="mini-button" type="button" title={copy.close} aria-label={copy.close} onClick={() => setExportOpen(false)}><Icon name="x" size={14} /></button></div>
          <div className="export-body">
            <div className="export-row"><span className="export-label">{copy.exportFormat}</span><div className="view-tabs"><button type="button" className={exportFormat === 'svg' ? 'active' : ''} onClick={() => setExportFormat('svg')}>SVG</button><button type="button" className={exportFormat === 'png' ? 'active' : ''} onClick={() => setExportFormat('png')}>PNG</button><button type="button" className={exportFormat === 'webp' ? 'active' : ''} onClick={() => setExportFormat('webp')}>WebP</button></div></div>
            {exportFormat !== 'svg' && <>
              <div className="export-row"><span className="export-label">{copy.exportScale}</span><div className="view-tabs">{[1, 2, 3].map((scale) => <button key={scale} type="button" className={exportScale === scale ? 'active' : ''} onClick={() => setExportScale(scale)}>{scale}x</button>)}</div></div>
              <div className="export-row"><span className="export-label">{copy.exportBackground}</span><div className="view-tabs"><button type="button" className={exportBackground === 'transparent' ? 'active' : ''} onClick={() => setExportBackground('transparent')}>{copy.exportTransparent}</button><button type="button" className={exportBackground === 'white' ? 'active' : ''} onClick={() => setExportBackground('white')}>{copy.exportWhite}</button><button type="button" className={exportBackground === 'custom' ? 'active' : ''} onClick={() => setExportBackground('custom')}>{copy.exportCustom}</button></div>{exportBackground === 'custom' && <input className="color-picker" type="color" value={exportCustomColor} onChange={(event) => setExportCustomColor(event.target.value.toUpperCase())} aria-label={copy.exportCustom} />}</div>
            </>}
            {exportFormat === 'svg' && <label className="export-check"><input type="checkbox" checked={exportOptimize} onChange={(event) => setExportOptimize(event.target.checked)} /><span>{copy.exportOptimize}</span></label>}
          </div>
          <div className="export-footer"><button className="button button-accent" type="button" onClick={exportDocument}><Icon name="upload" /> {copy.exportShort}</button></div>
        </div>
      </div>}
      {contextMenu && contextMenuTarget && <div className="context-menu" role="menu" style={{ left: contextMenu.x, top: contextMenu.y }} onPointerDown={(event) => event.stopPropagation()}>
        <button type="button" role="menuitem" onClick={() => startRename(contextMenu.targetId)}><Icon name="edit" size={13} /><span>{copy.menuRename}</span></button>
        <button type="button" role="menuitem" onClick={() => { copySelectedLayer(); setContextMenu(null) }}><Icon name="copy" size={13} /><span>{copy.shortcutCopy}</span></button>
        <button type="button" role="menuitem" disabled={!clipboardLayerRef.current} onClick={() => { pasteLayer(); setContextMenu(null) }}><Icon name="paste" size={13} /><span>{copy.shortcutPaste}</span></button>
        <button type="button" role="menuitem" onClick={(event) => { toggleVisibility(contextMenuTarget, event); setContextMenu(null) }}><Icon name="eye" size={13} /><span>{isElementHidden(contextMenuTarget.node) ? copy.show : copy.hide}</span></button>
        <span className="menu-divider" />
        <button type="button" role="menuitem" className="menu-danger" onClick={() => { deleteSelectedLayer(); setContextMenu(null) }}><Icon name="trash" size={13} /><span>{copy.shortcutDelete}</span></button>
      </div>}
      {isFileDragOver && <div className="drop-overlay" aria-hidden="true"><div className="drop-overlay-card"><Icon name="upload" size={30} /><span>{copy.dropOverlayTitle}</span></div></div>}
    </main>
  )
}

createRoot(document.getElementById('root')).render(<App />)
