import { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

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

const EDITABLE_TAGS = new Set(['rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'path', 'text', 'g', 'image'])

const COPY = {
  en: {
    languageSwitch: '中文', saved: 'All changes saved', unsaved: 'Unsaved changes', open: 'Open SVG', export: 'Export SVG',
    title: 'Edit the details', subtitle: 'Fine-tune every layer without leaving the canvas.', layers: 'Layers', addLayer: 'Add layer', addElement: 'Add element',
    preview: 'Preview', source: 'Source', grid: 'Grid', dropHint: 'Drop an SVG anywhere to begin', inspector: 'Inspector', appearance: 'Appearance',
    fill: 'Fill', stroke: 'Stroke', opacity: 'Opacity', strokeWidth: 'Stroke width', cornerRadius: 'Corner radius', elementDetails: 'Element details', layer: 'Layer', visibility: 'Visibility',
    visible: 'Visible', livePreview: 'Live preview', statusReady: 'elements • SVG ready', changesInstant: 'Changes apply instantly', exportShort: 'Export', selected: 'Selected',
    layersCount: 'layers', elementSuffix: 'element', show: 'Show', hide: 'Hide', noSelection: 'Select a layer to edit its properties.', invalidSvg: 'This file does not contain a valid SVG.',
  },
  zh: {
    languageSwitch: 'English', saved: '所有更改已保存', unsaved: '有未保存的更改', open: '打开 SVG', export: '导出 SVG',
    title: '编辑细节', subtitle: '无需离开画布，微调每一层。', layers: '图层', addLayer: '添加图层', addElement: '添加元素',
    preview: '预览', source: '源码', grid: '网格', dropHint: '将 SVG 拖到这里开始', inspector: '检查器', appearance: '外观',
    fill: '填充', stroke: '描边', opacity: '不透明度', strokeWidth: '描边宽度', cornerRadius: '圆角半径', elementDetails: '元素详情', layer: '图层', visibility: '可见性',
    visible: '可见', livePreview: '实时预览', statusReady: '个元素 · SVG 就绪', changesInstant: '更改会即时生效', exportShort: '导出', selected: '已选中',
    layersCount: '个图层', elementSuffix: '元素', show: '显示', hide: '隐藏', noSelection: '选择一个图层来编辑它的属性。', invalidSvg: '该文件不包含有效的 SVG。',
  },
}

const ZH_TAG_NAMES = { rect: '矩形', circle: '圆形', ellipse: '椭圆', line: '直线', polyline: '折线', polygon: '多边形', path: '路径', text: '文字', g: '分组', image: '图片' }
const ZH_LAYER_NAMES = { Background: '背景', 'Logo mark': '标志图形', Wordmark: '文字标志' }

function getLayerDisplayName(item, language) {
  if (language === 'en') return item.name
  if (ZH_LAYER_NAMES[item.name]) return ZH_LAYER_NAMES[item.name]
  const match = item.name.match(/^([a-z]+)(\s+\d+)?$/i)
  if (!match) return item.name
  return `${ZH_TAG_NAMES[match[1].toLowerCase()] || match[1]}${match[2] || ''}`
}

function getTagDisplayName(tag, language) {
  return language === 'zh' ? ZH_TAG_NAMES[tag] || tag : tag
}

function Icon({ name, size = 16 }) {
  const paths = {
    upload: <><path d="M8 11V3m0 0L5 6m3-3 3 3" /><path d="M3 10v3a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3" /></>,
    download: <><path d="M8 3v8m0 0 3-3m-3 3-3-3" /><path d="M3 12v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1" /></>,
    undo: <><path d="M6 5 3 8l3 3" /><path d="M3 8h6a4 4 0 0 1 4 4v1" /></>,
    redo: <><path d="m10 5 3 3-3 3" /><path d="M13 8H7a4 4 0 0 0-4 4v1" /></>,
    eye: <><path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" /><circle cx="8" cy="8" r="1.9" /></>,
    layers: <><path d="m8 2 6 3-6 3-6-3 6-3Z" /><path d="m2 8 6 3 6-3M2 11l6 3 6-3" /></>,
    chevron: <path d="m5 6 3 3 3-3" />,
    plus: <><path d="M8 3v10M3 8h10" /></>,
    grid: <><rect x="2.5" y="2.5" width="5" height="5" rx="1" /><rect x="8.5" y="2.5" width="5" height="5" rx="1" /><rect x="2.5" y="8.5" width="5" height="5" rx="1" /><rect x="8.5" y="8.5" width="5" height="5" rx="1" /></>,
    code: <><path d="m5 4-3 4 3 4M11 4l3 4-3 4M9 2.5 7 13.5" /></>,
    x: <><path d="m4 4 8 8M12 4l-8 8" /></>,
    check: <path d="m3 8 3 3 5-6" />,
  }
  return <svg className="icon" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function friendlyName(node, index) {
  return node.getAttribute('data-name') || node.getAttribute('id') || `${node.tagName.toLowerCase()} ${String(index + 1).padStart(2, '0')}`
}

function parseSvg(markup) {
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml')
  if (doc.querySelector('parsererror') || !doc.documentElement || doc.documentElement.tagName !== 'svg') {
    throw new Error('This file does not contain a valid SVG.')
  }
  let id = 0
  const elements = []
  const walk = (node, depth = 0) => {
    Array.from(node.children).forEach((child, index) => {
      if (!EDITABLE_TAGS.has(child.tagName)) return walk(child, depth)
      const editorId = `node-${id++}`
      child.setAttribute('data-editor-id', editorId)
      elements.push({ id: editorId, tag: child.tagName, name: friendlyName(child, index), depth, node: child })
      walk(child, depth + 1)
    })
  }
  walk(doc.documentElement)
  return { markup: new XMLSerializer().serializeToString(doc.documentElement), elements }
}

function getColor(value, fallback) {
  if (!value || value === 'none' || value.startsWith('url(')) return fallback
  if (value.startsWith('#')) return value.toUpperCase()
  return fallback
}

function isElementHidden(node) {
  if (!node) return false
  if (node.getAttribute('display') === 'none' || node.getAttribute('visibility') === 'hidden') return true
  const style = node.getAttribute('style') || ''
  return /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(style)
}

function setElementVisibility(node, hidden) {
  if (hidden) {
    node.setAttribute('display', 'none')
    return
  }
  node.removeAttribute('display')
  node.removeAttribute('visibility')
  const style = node.getAttribute('style') || ''
  const nextStyle = style
    .split(';')
    .map((rule) => rule.trim())
    .filter((rule) => rule && !/^(display|visibility)\s*:/i.test(rule))
    .join('; ')
  if (nextStyle) node.setAttribute('style', nextStyle)
  else node.removeAttribute('style')
}

function clampScale(value) {
  return Math.min(3, Math.max(0.5, value))
}

function pointerDistance(first, second) {
  return Math.hypot(second.x - first.x, second.y - first.y)
}

function getAncestorGroupIds(elements, targetId) {
  const ancestors = []
  for (const item of elements) {
    while (ancestors.length && ancestors[ancestors.length - 1].depth >= item.depth) ancestors.pop()
    if (item.id === targetId) return ancestors.filter((ancestor) => ancestor.tag === 'g').map((ancestor) => ancestor.id)
    ancestors.push(item)
  }
  return []
}

function getSvgPoint(svgWrap, clientX, clientY) {
  const svg = svgWrap?.querySelector('svg')
  const rect = svg?.getBoundingClientRect()
  if (!svg || !rect?.width || !rect?.height) return { x: clientX, y: clientY }
  const viewBox = svg.viewBox?.baseVal
  const width = viewBox?.width || Number(svg.getAttribute('width')) || rect.width
  const height = viewBox?.height || Number(svg.getAttribute('height')) || rect.height
  return { x: (clientX - rect.left) * width / rect.width, y: (clientY - rect.top) * height / rect.height }
}

function getSvgPointerDelta(svgWrap, start, current) {
  const startPoint = getSvgPoint(svgWrap, start.x, start.y)
  const currentPoint = getSvgPoint(svgWrap, current.x, current.y)
  return { x: currentPoint.x - startPoint.x, y: currentPoint.y - startPoint.y }
}

function updateElementTransform(rawMarkup, targetId, transform) {
  const doc = new DOMParser().parseFromString(rawMarkup, 'image/svg+xml')
  const node = doc.querySelector(`[data-editor-id="${targetId}"]`)
  if (!node) return rawMarkup
  if (transform) node.setAttribute('transform', transform)
  else node.removeAttribute('transform')
  return new XMLSerializer().serializeToString(doc.documentElement)
}

function getVisibleLayerItems(elements, expandedGroups) {
  const visible = []
  const ancestors = []
  elements.forEach((item, index) => {
    while (ancestors.length && ancestors[ancestors.length - 1].depth >= item.depth) ancestors.pop()
    const hiddenByCollapsedGroup = ancestors.some((ancestor) => ancestor.tag === 'g' && expandedGroups[ancestor.id] === false)
    if (!hiddenByCollapsedGroup) visible.push({ item, index })
    ancestors.push(item)
  })
  return visible
}

function App() {
  const initial = useMemo(() => parseSvg(SAMPLE_SVG), [])
  const [language, setLanguage] = useState('en')
  const [svgMarkup, setSvgMarkup] = useState(initial.markup)
  const [sourceDraft, setSourceDraft] = useState(initial.markup)
  const [elements, setElements] = useState(initial.elements)
  const [selectedId, setSelectedId] = useState('node-1')
  const [activeTab, setActiveTab] = useState('preview')
  const [fileName, setFileName] = useState('untitled.svg')
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [svgPosition, setSvgPosition] = useState({ x: 0, y: 0 })
  const [svgScale, setSvgScale] = useState(1)
  const [isDraggingSvg, setIsDraggingSvg] = useState(false)
  const [isDraggingElement, setIsDraggingElement] = useState(false)
  const [isResizingElement, setIsResizingElement] = useState(false)
  const [isPinchingSvg, setIsPinchingSvg] = useState(false)
  const [history, setHistory] = useState({ past: [], future: [] })
  const [expandedGroups, setExpandedGroups] = useState({})
  const [selectionBox, setSelectionBox] = useState(null)
  const fileInput = useRef(null)
  const canvasRef = useRef(null)
  const svgRef = useRef(null)
  const svgDragRef = useRef(null)
  const elementDragRef = useRef(null)
  const resizeRef = useRef(null)
  const layerRowRefs = useRef(new Map())
  const activePointersRef = useRef(new Map())
  const pinchRef = useRef(null)
  const copy = COPY[language]

  const selected = elements.find((item) => item.id === selectedId) || elements[0]
  const selectedAttrs = selected ? selected.node : null
  const selectedDisplayName = selected ? getLayerDisplayName(selected, language) : ''
  const visibleLayerItems = getVisibleLayerItems(elements, expandedGroups)

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
    document.title = language === 'zh' ? 'Vector Forge — SVG 编辑器' : 'Vector Forge — SVG editor'
  }, [language])

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
    if (row) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedId, visibleLayerItems.length])

  useEffect(() => {
    if (activeTab !== 'preview' || !selectedId) {
      setSelectionBox(null)
      return undefined
    }
    const frame = requestAnimationFrame(() => {
      const stage = canvasRef.current
      const target = svgRef.current?.querySelector(`[data-editor-id="${selectedId}"]`)
      if (!stage || !target) {
        setSelectionBox(null)
        return
      }
      const stageRect = stage.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      setSelectionBox({
        left: targetRect.left - stageRect.left,
        top: targetRect.top - stageRect.top,
        width: targetRect.width,
        height: targetRect.height,
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [activeTab, selectedId, svgMarkup, svgPosition.x, svgPosition.y, svgScale])

  const loadSvg = (raw, name = 'untitled.svg') => {
    try {
      const parsed = parseSvg(raw)
      setSvgMarkup(parsed.markup)
      setSourceDraft(parsed.markup)
      setElements(parsed.elements)
      setSelectedId(parsed.elements[0]?.id || '')
      setFileName(name)
      setError('')
      setDirty(false)
      setSvgPosition({ x: 0, y: 0 })
      setSvgScale(1)
      setHistory({ past: [], future: [] })
      setExpandedGroups({})
      setActiveTab('preview')
    } catch (err) {
      setError(language === 'zh' ? copy.invalidSvg : err.message)
    }
  }

  const currentSnapshot = () => ({ svgMarkup, fileName, selectedId, dirty })

  const commitDocument = (rawMarkup, { nextSelectedId = selectedId, nextFileName = fileName, nextDirty = true, historySnapshot = currentSnapshot(), forceHistory = false } = {}) => {
    const parsed = parseSvg(rawMarkup)
    if (!forceHistory && parsed.markup === svgMarkup && nextFileName === fileName && nextDirty === dirty) {
      setSourceDraft(parsed.markup)
      return
    }
    const validSelectedId = parsed.elements.some((item) => item.id === nextSelectedId) ? nextSelectedId : parsed.elements[0]?.id || ''
    setHistory((current) => ({ past: [...current.past, historySnapshot], future: [] }))
    setSvgMarkup(parsed.markup)
    setSourceDraft(parsed.markup)
    setElements(parsed.elements)
    setSelectedId(validSelectedId)
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
    setFileName(snapshot.fileName)
    setDirty(snapshot.dirty)
  }

  const undo = () => {
    if (!history.past.length) return
    const previous = history.past[history.past.length - 1]
    setHistory({ past: history.past.slice(0, -1), future: [currentSnapshot(), ...history.future] })
    restoreSnapshot(previous)
  }

  const redo = () => {
    if (!history.future.length) return
    const next = history.future[0]
    setHistory({ past: [...history.past, currentSnapshot()], future: history.future.slice(1) })
    restoreSnapshot(next)
  }

  useEffect(() => {
    const handleHistoryShortcut = (event) => {
      if (!event.metaKey || event.altKey || event.key.toLowerCase() !== 'z') return
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

  const updateAttribute = (attribute, value) => {
    if (!selected) return
    const doc = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml')
    const node = doc.querySelector(`[data-editor-id="${selected.id}"]`)
    if (!node) return
    if (value === '' || value == null) node.removeAttribute(attribute)
    else node.setAttribute(attribute, value)
    const nextMarkup = new XMLSerializer().serializeToString(doc.documentElement)
    commitDocument(nextMarkup, { nextSelectedId: selected.id })
  }

  const updateRectRadius = (value) => {
    if (!selected || selected.tag !== 'rect') return
    const doc = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml')
    const node = doc.querySelector(`[data-editor-id="${selected.id}"]`)
    if (!node) return
    if (value === '' || value == null || Number(value) === 0) {
      node.removeAttribute('rx')
      node.removeAttribute('ry')
    } else {
      node.setAttribute('rx', value)
      node.setAttribute('ry', value)
    }
    const nextMarkup = new XMLSerializer().serializeToString(doc.documentElement)
    commitDocument(nextMarkup, { nextSelectedId: selected.id })
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

  const handleFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => loadSvg(String(reader.result), file.name)
    reader.readAsText(file)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    handleFile(event.dataTransfer.files?.[0])
  }

  const exportSvg = () => {
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName.replace(/\.svg$/i, '') + '-edited.svg'
    link.click()
    URL.revokeObjectURL(url)
    setDirty(false)
  }

  const selectElementAtPoint = (clientX, clientY, fallbackTarget) => {
    const pointTarget = document.elementFromPoint(clientX, clientY)
    const target = pointTarget?.closest?.('[data-editor-id]') || fallbackTarget?.closest?.('[data-editor-id]')
    if (target) setSelectedId(target.getAttribute('data-editor-id'))
  }

  const handleCanvasClick = (event) => {
    selectElementAtPoint(event.clientX, event.clientY, event.target)
  }

  const handleSvgPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    selectElementAtPoint(event.clientX, event.clientY, event.target)
    const elementTarget = event.target?.closest?.('[data-editor-id]')
    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    event.currentTarget.setPointerCapture(event.pointerId)

    if (activePointersRef.current.size === 2) {
      const [first, second] = [...activePointersRef.current.values()]
      pinchRef.current = { distance: pointerDistance(first, second), scale: svgScale }
      svgDragRef.current = null
      elementDragRef.current = null
      setIsDraggingSvg(false)
      setIsDraggingElement(false)
      setIsPinchingSvg(true)
      return
    }

    if (elementTarget) {
      elementDragRef.current = {
        pointerId: event.pointerId,
        targetId: elementTarget.getAttribute('data-editor-id'),
        startX: event.clientX,
        startY: event.clientY,
        baseMarkup: svgMarkup,
        baseSnapshot: currentSnapshot(),
        baseTransform: elementTarget.getAttribute('transform') || '',
        previewMarkup: svgMarkup,
        moved: false,
      }
      svgDragRef.current = null
      setIsDraggingSvg(false)
      setIsDraggingElement(false)
      return
    }

    svgDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: svgPosition,
    }
    elementDragRef.current = null
    setIsDraggingElement(false)
    setIsDraggingSvg(true)
  }

  const handleSvgPointerMove = (event) => {
    if (activePointersRef.current.has(event.pointerId)) {
      activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    }

    if (activePointersRef.current.size >= 2) {
      const [first, second] = [...activePointersRef.current.values()]
      const pinch = pinchRef.current
      if (pinch && pinch.distance > 0) setSvgScale(clampScale(pinch.scale * pointerDistance(first, second) / pinch.distance))
      return
    }

    const elementDrag = elementDragRef.current
    if (elementDrag && elementDrag.pointerId === event.pointerId) {
      const screenDistance = Math.hypot(event.clientX - elementDrag.startX, event.clientY - elementDrag.startY)
      if (screenDistance <= 2) return
      const delta = getSvgPointerDelta(svgRef.current, { x: elementDrag.startX, y: elementDrag.startY }, { x: event.clientX, y: event.clientY })
      const translate = `translate(${delta.x.toFixed(2)} ${delta.y.toFixed(2)})`
      const nextTransform = elementDrag.baseTransform ? `${translate} ${elementDrag.baseTransform}` : translate
      const nextMarkup = updateElementTransform(elementDrag.baseMarkup, elementDrag.targetId, nextTransform)
      elementDrag.previewMarkup = nextMarkup
      elementDrag.moved = true
      setSvgMarkup(nextMarkup)
      setIsDraggingElement(true)
      return
    }

    const drag = svgDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    setSvgPosition({
      x: drag.origin.x + event.clientX - drag.startX,
      y: drag.origin.y + event.clientY - drag.startY,
    })
  }

  const handleSvgPointerUp = (event, cancelled = false) => {
    activePointersRef.current.delete(event.pointerId)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (activePointersRef.current.size < 2) {
      pinchRef.current = null
      setIsPinchingSvg(false)
    }
    if (activePointersRef.current.size > 0) return

    const elementDrag = elementDragRef.current
    if (elementDrag && elementDrag.pointerId === event.pointerId) {
      if (cancelled || !elementDrag.moved) {
        if (elementDrag.previewMarkup !== elementDrag.baseMarkup) setSvgMarkup(elementDrag.baseMarkup)
      } else {
        commitDocument(elementDrag.previewMarkup, { nextSelectedId: elementDrag.targetId, historySnapshot: elementDrag.baseSnapshot, forceHistory: true })
      }
      elementDragRef.current = null
      setIsDraggingElement(false)
    }
    svgDragRef.current = null
    setIsDraggingSvg(false)
  }

  const handleResizePointerDown = (event, handle) => {
    if (!selectionBox || !selected || resizeRef.current) return
    event.preventDefault()
    event.stopPropagation()
    const target = svgRef.current?.querySelector(`[data-editor-id="${selected.id}"]`)
    const baseBox = target?.getBoundingClientRect()
    if (!target || !baseBox?.width || !baseBox?.height) return
    const pointerId = event.pointerId ?? 'mouse'
    if (event.pointerId != null && event.currentTarget.setPointerCapture) event.currentTarget.setPointerCapture(event.pointerId)
    resizeRef.current = {
      pointerId,
      targetId: selected.id,
      handle,
      baseBox,
      baseMarkup: svgMarkup,
      baseSnapshot: currentSnapshot(),
      baseTransform: target.getAttribute('transform') || '',
      previewMarkup: svgMarkup,
      moved: false,
    }
    window.addEventListener('pointermove', handleResizePointerMove)
    window.addEventListener('pointerup', handleResizePointerUp)
    window.addEventListener('mousemove', handleResizePointerMove)
    window.addEventListener('mouseup', handleResizePointerUp)
    setIsResizingElement(true)
  }

  const handleResizePointerMove = (event) => {
    const resize = resizeRef.current
    if (!resize || (event.pointerId != null && resize.pointerId !== event.pointerId)) return
    event.preventDefault()
    const { baseBox } = resize
    const minSize = 8
    const anchor = resize.handle === 'top-left'
      ? { x: baseBox.right, y: baseBox.bottom }
      : { x: baseBox.left, y: baseBox.top }
    const width = resize.handle === 'top-left'
      ? anchor.x - Math.min(event.clientX, anchor.x - minSize)
      : Math.max(event.clientX, anchor.x + minSize) - anchor.x
    const height = resize.handle === 'top-left'
      ? anchor.y - Math.min(event.clientY, anchor.y - minSize)
      : Math.max(event.clientY, anchor.y + minSize) - anchor.y
    const scaleX = width / baseBox.width
    const scaleY = height / baseBox.height
    const anchorPoint = getSvgPoint(svgRef.current, anchor.x, anchor.y)
    const resizeTransform = `translate(${anchorPoint.x.toFixed(2)} ${anchorPoint.y.toFixed(2)}) scale(${scaleX.toFixed(4)} ${scaleY.toFixed(4)}) translate(${-anchorPoint.x.toFixed(2)} ${-anchorPoint.y.toFixed(2)})`
    const nextTransform = resize.baseTransform ? `${resizeTransform} ${resize.baseTransform}` : resizeTransform
    const nextMarkup = updateElementTransform(resize.baseMarkup, resize.targetId, nextTransform)
    resize.previewMarkup = nextMarkup
    resize.moved = true
    setSvgMarkup(nextMarkup)
  }

  const handleResizePointerUp = (event, cancelled = false) => {
    const resize = resizeRef.current
    if (!resize || (event.pointerId != null && resize.pointerId !== event.pointerId)) return
    if (event.pointerId != null && event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    window.removeEventListener('pointermove', handleResizePointerMove)
    window.removeEventListener('pointerup', handleResizePointerUp)
    window.removeEventListener('mousemove', handleResizePointerMove)
    window.removeEventListener('mouseup', handleResizePointerUp)
    if (cancelled) {
      setSvgMarkup(resize.baseMarkup)
    } else if (resize.moved) {
      commitDocument(resize.previewMarkup, { nextSelectedId: resize.targetId, historySnapshot: resize.baseSnapshot, forceHistory: true })
    }
    resizeRef.current = null
    setIsResizingElement(false)
  }

  useEffect(() => {
    const stage = canvasRef.current
    if (!stage || activeTab !== 'preview') return undefined

    const handleWheel = (event) => {
      // Prevent browser/page zoom for both trackpad pinch and Ctrl + wheel.
      event.preventDefault()
      event.stopPropagation()
      if (!svgRef.current?.contains(event.target)) return
      const factor = Math.exp(-event.deltaY * 0.0025)
      setSvgScale((current) => clampScale(current * factor))
    }

    stage.addEventListener('wheel', handleWheel, { passive: false })
    return () => stage.removeEventListener('wheel', handleWheel)
  }, [activeTab])

  const fill = getColor(selectedAttrs?.getAttribute('fill'), '#5B75FF')
  const stroke = getColor(selectedAttrs?.getAttribute('stroke'), '#15203A')
  const opacity = Number(selectedAttrs?.getAttribute('opacity') || 1)
  const strokeWidth = Number(selectedAttrs?.getAttribute('stroke-width') || 0)
  const rectWidth = Number(selectedAttrs?.getAttribute('width')) || 200
  const rectHeight = Number(selectedAttrs?.getAttribute('height')) || 200
  const cornerRadiusMax = Math.max(1, Math.floor(Math.min(rectWidth, rectHeight) / 2))
  const cornerRadius = Math.min(cornerRadiusMax, Number(selectedAttrs?.getAttribute('rx') || selectedAttrs?.getAttribute('ry') || 0))

  return (
    <main className="app-shell" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><span /></span><span>VECTOR FORGE</span></div>
        <div className="topbar-actions">
          <button className="icon-button" title={language === 'zh' ? '撤销（⌘ Z）' : 'Undo (⌘ Z)'} aria-keyshortcuts="Meta+Z" onClick={undo} disabled={!history.past.length}><Icon name="undo" /></button>
          <button className="icon-button" title={language === 'zh' ? '前进（⌘ Shift Z）' : 'Redo (⌘ Shift Z)'} aria-keyshortcuts="Meta+Shift+Z" onClick={redo} disabled={!history.future.length}><Icon name="redo" /></button>
          <span className="divider" />
          <span className="save-state"><span className={`status-dot ${dirty ? 'dirty' : ''}`} />{dirty ? copy.unsaved : copy.saved}</span>
          <button className="language-toggle" type="button" onClick={() => setLanguage((current) => current === 'en' ? 'zh' : 'en')} aria-label={copy.languageSwitch}>{copy.languageSwitch}</button>
          <button className="button button-quiet" onClick={() => fileInput.current?.click()}><Icon name="upload" /> {copy.open}</button>
          <button className="button button-accent" onClick={exportSvg}><Icon name="download" /> {copy.export}</button>
          <input ref={fileInput} type="file" accept="image/svg+xml,.svg" hidden onChange={(event) => handleFile(event.target.files?.[0])} />
        </div>
      </header>

      <section className="workspace-heading">
        <div><h1>{copy.title}</h1><p>{copy.subtitle}</p></div>
        <div className="file-chip"><span className="file-icon">SVG</span><span>{fileName}</span><span className="file-size">{elements.length} {copy.layersCount}</span></div>
      </section>

      <section className="workspace">
        <aside className="layers-panel panel">
          <div className="panel-header"><div className="panel-title"><Icon name="layers" /><span>{copy.layers}</span></div><button className="mini-button" title={copy.addLayer}><Icon name="plus" size={14} /></button></div>
          <div className="layer-list">
            {visibleLayerItems.map(({ item, index }) => {
              const hidden = isElementHidden(item.node)
              const displayName = getLayerDisplayName(item, language)
              const isGroup = item.tag === 'g'
              const isExpanded = expandedGroups[item.id] !== false
              return <div key={item.id} ref={(node) => { if (node) layerRowRefs.current.set(item.id, node); else layerRowRefs.current.delete(item.id) }} className={`layer-row ${item.id === selectedId ? 'selected' : ''} ${hidden ? 'hidden' : ''}`} style={{ paddingLeft: `${14 + item.depth * 15}px` }} role="button" tabIndex="0" onClick={() => setSelectedId(item.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedId(item.id) }}>
                <span className="layer-chevron">{isGroup ? <button className={`layer-collapse-toggle ${isExpanded ? 'expanded' : 'collapsed'}`} type="button" title={isExpanded ? (language === 'zh' ? '折叠分组' : 'Collapse group') : (language === 'zh' ? '展开分组' : 'Expand group')} aria-label={isExpanded ? (language === 'zh' ? '折叠分组' : 'Collapse group') : (language === 'zh' ? '展开分组' : 'Expand group')} aria-expanded={isExpanded} onClick={(event) => toggleGroup(item, event)}><Icon name="chevron" size={13} /></button> : ''}</span>
                <span className={`layer-shape shape-${item.tag}`} />
                <span className="layer-name">{displayName}</span>
                <span className="layer-index">{String(index + 1).padStart(2, '0')}</span>
                <button className={`layer-visibility ${hidden ? 'is-hidden' : ''}`} type="button" title={`${hidden ? copy.show : copy.hide} ${displayName}`} aria-label={`${hidden ? copy.show : copy.hide} ${displayName}`} aria-pressed={!hidden} onClick={(event) => toggleVisibility(item, event)}><Icon name="eye" size={14} /></button>
              </div>
            })}
          </div>
          <div className="layers-footer"><button><Icon name="plus" size={14} /> {copy.addElement}</button></div>
        </aside>

        <section className="canvas-panel">
          <div className="canvas-toolbar">
            <div className="view-tabs"><button className={activeTab === 'preview' ? 'active' : ''} onClick={() => setActiveTab('preview')}><Icon name="eye" size={14} /> {copy.preview}</button><button className={activeTab === 'source' ? 'active' : ''} onClick={() => setActiveTab('source')}><Icon name="code" size={14} /> {copy.source}</button></div>
            <div className="canvas-tools"><button className="zoom-readout" type="button" title={language === 'zh' ? '重置缩放' : 'Reset zoom'} onClick={() => setSvgScale(1)}>{Math.round(svgScale * 100)}%</button><span className="toolbar-divider" /><button className="tool-button"><Icon name="grid" size={15} /> {copy.grid}</button></div>
          </div>
          {activeTab === 'preview' ? (
            <div ref={canvasRef} className="canvas-stage" onClick={handleCanvasClick}>
              <div className="drop-hint"><span className="drop-icon"><Icon name="upload" size={15} /></span><span>{copy.dropHint}</span></div>
              <div
                className={`svg-wrap ${isDraggingSvg || isDraggingElement ? 'is-dragging' : ''} ${isDraggingElement ? 'is-dragging-element' : ''} ${isPinchingSvg ? 'is-pinching' : ''}`}
                ref={svgRef}
                style={{ '--svg-x': `${svgPosition.x}px`, '--svg-y': `${svgPosition.y}px`, '--svg-scale': svgScale }}
                onPointerDown={handleSvgPointerDown}
                onPointerMove={handleSvgPointerMove}
                onPointerUp={handleSvgPointerUp}
                onPointerCancel={(event) => handleSvgPointerUp(event, true)}
                dangerouslySetInnerHTML={{ __html: svgMarkup.replace(`data-editor-id="${selectedId}"`, `data-editor-id="${selectedId}" class="is-selected"`) }}
              />
              {selectionBox && selected && <div className={`selection-overlay ${isResizingElement ? 'is-resizing' : ''}`} style={{ left: selectionBox.left, top: selectionBox.top, width: selectionBox.width, height: selectionBox.height }} onPointerMove={handleResizePointerMove} onPointerUp={handleResizePointerUp} onPointerCancel={(event) => handleResizePointerUp(event, true)}>
                <button className="resize-handle resize-handle-top-left" type="button" aria-label={language === 'zh' ? '从左上角调整大小' : 'Resize from top left'} title={language === 'zh' ? '从左上角调整大小' : 'Resize from top left'} onPointerDown={(event) => handleResizePointerDown(event, 'top-left')} onMouseDown={(event) => handleResizePointerDown(event, 'top-left')} onPointerMove={handleResizePointerMove} onPointerUp={handleResizePointerUp} onPointerCancel={(event) => handleResizePointerUp(event, true)} />
                <button className="resize-handle resize-handle-bottom-right" type="button" aria-label={language === 'zh' ? '从右下角调整大小' : 'Resize from bottom right'} title={language === 'zh' ? '从右下角调整大小' : 'Resize from bottom right'} onPointerDown={(event) => handleResizePointerDown(event, 'bottom-right')} onMouseDown={(event) => handleResizePointerDown(event, 'bottom-right')} onPointerMove={handleResizePointerMove} onPointerUp={handleResizePointerUp} onPointerCancel={(event) => handleResizePointerUp(event, true)} />
              </div>}
            </div>
          ) : (
            <textarea className="source-editor" value={sourceDraft} onChange={(event) => setSourceDraft(event.target.value)} onBlur={() => { try { commitDocument(sourceDraft, { nextSelectedId: selectedId }) } catch (err) { setError(language === 'zh' ? copy.invalidSvg : err.message) } }} spellCheck="false" />
          )}
          {error && <div className="error-toast"><Icon name="x" size={15} />{error}</div>}
          <div className="canvas-status"><span><span className="live-dot" /> {copy.livePreview}</span><span>{elements.length} {copy.statusReady}</span><span className="status-path">{selected ? `${copy.selected}: ${selectedDisplayName}` : copy.noSelection}</span></div>
        </section>

        <aside className="inspector-panel panel">
          <div className="panel-header"><div className="panel-title"><span>{copy.inspector}</span></div><button className="mini-button"><Icon name="x" size={14} /></button></div>
          {selected ? <>
            <div className="selection-summary"><div className={`selection-icon tag-${selected.tag}`}>{selected.tag.slice(0, 2).toUpperCase()}</div><div className="selection-meta"><strong>{selectedDisplayName}</strong><span>{getTagDisplayName(selected.tag, language)} {copy.elementSuffix}</span></div><span className="selection-check"><Icon name="check" size={13} /></span></div>
            <div className="inspector-section"><div className="section-label">{copy.appearance}</div>
              <ColorField label={copy.fill} value={fill} onChange={(value) => updateAttribute('fill', value)} />
              <ColorField label={copy.stroke} value={stroke} onChange={(value) => updateAttribute('stroke', value)} />
              <div className="field-row"><label>{copy.opacity}</label><div className="range-wrap"><input type="range" min="0" max="1" step="0.01" value={opacity} onChange={(event) => updateAttribute('opacity', event.target.value)} /><span>{Math.round(opacity * 100)}%</span></div></div>
              <div className="field-row"><label>{copy.strokeWidth}</label><div className="range-wrap"><input type="range" min="0" max="24" step="1" value={strokeWidth} onChange={(event) => updateAttribute('stroke-width', event.target.value)} /><span>{strokeWidth}px</span></div></div>
              {selected.tag === 'rect' && <div className="field-row"><label>{copy.cornerRadius}</label><div className="range-wrap"><input type="range" min="0" max={cornerRadiusMax} step="1" value={cornerRadius} onChange={(event) => updateRectRadius(event.target.value)} /><span>{cornerRadius}px</span></div></div>}
            </div>
            <div className="inspector-section"><div className="section-label">{copy.elementDetails}</div><div className="detail-grid"><div><span>{copy.layer}</span><strong>{String(elements.indexOf(selected) + 1).padStart(2, '0')} / {String(elements.length).padStart(2, '0')}</strong></div><div><span>{copy.visibility}</span><strong>{copy.visible}</strong></div></div></div>
          </> : <div className="empty-inspector">{copy.noSelection}</div>}
          <div className="inspector-footer"><span><span className="kbd">⌘</span><span className="kbd">S</span> {copy.exportShort}</span><span className="footer-hint">{copy.changesInstant}</span></div>
        </aside>
      </section>
    </main>
  )
}

function ColorField({ label, value, onChange }) {
  return <div className="color-field"><label>{label}</label><div className="color-control"><input className="color-picker" type="color" value={value.length === 7 ? value : '#5B75FF'} onChange={(event) => onChange(event.target.value.toUpperCase())} /><input className="hex-input" value={value} onChange={(event) => onChange(event.target.value)} maxLength={7} /><span className="color-swatch" style={{ backgroundColor: value }} /></div></div>
}

createRoot(document.getElementById('root')).render(<App />)
