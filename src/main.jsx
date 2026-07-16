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

const STORAGE_KEY = 'vector-forge:document'

const EDITABLE_TAGS = new Set(['rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'path', 'text', 'g', 'image'])

const COPY = {
  en: {
    languageSwitch: '中文', saved: 'All changes saved', unsaved: 'Unsaved changes', open: 'Import SVG', export: 'Export SVG',
    title: 'Edit the details', subtitle: 'Fine-tune every layer without leaving the canvas.', layers: 'Layers', addLayer: 'Add layer', addElement: 'Add element', loadDemo: 'Load demo SVG', textContent: 'Text content', editText: 'Edit text content', fontSize: 'Font size', letterSpacing: 'Character spacing', fontFamily: 'Font family', fontFamilyPlaceholder: 'e.g. Arial, sans-serif',
    preview: 'Preview', source: 'Source', format: 'Format', mode2D: '2D', mode3D: '3D', viewMode2D: '2D view', viewMode3D: '3D view', resetView: 'Reset view and center', fullscreen: 'Full-screen edit', exitFullscreen: 'Exit full-screen', collapseLayers: 'Collapse layers', expandLayers: 'Expand layers', collapseInspector: 'Collapse properties', expandInspector: 'Expand properties', dropHint: 'Drop an SVG anywhere to begin', inspector: 'Inspector', appearance: 'Appearance',
    fill: 'Fill', stroke: 'Stroke', opacity: 'Opacity', strokeWidth: 'Stroke width', cornerRadius: 'Corner radius', width: 'Width', height: 'Height', elementDetails: 'Element details', layer: 'Layer', visibility: 'Visibility',
    visible: 'Visible', livePreview: 'Live preview', statusReady: 'elements • SVG ready', changesInstant: 'Changes apply instantly', exportShort: 'Export', selected: 'Selected', resizeLineStart: 'Adjust line start', resizeLineEnd: 'Adjust line end',
    layersCount: 'layers', elementSuffix: 'element', show: 'Show', hide: 'Hide', noSelection: 'Select a layer to edit its properties.', invalidSvg: 'This file does not contain a valid SVG.',
  },
  zh: {
    languageSwitch: 'English', saved: '所有更改已保存', unsaved: '有未保存的更改', open: '导入 SVG', export: '导出 SVG',
    title: '编辑细节', subtitle: '无需离开画布，微调每一层。', layers: '图层', addLayer: '添加图层', addElement: '添加元素', loadDemo: '加载 Demo SVG', textContent: '文字内容', editText: '编辑文字内容', fontSize: '字体大小', letterSpacing: '字符间距', fontFamily: '字体家族', fontFamilyPlaceholder: '例如 Arial, sans-serif',
    preview: '预览', source: '源码', format: '格式化', mode2D: '2D', mode3D: '3D', viewMode2D: '2D 查看', viewMode3D: '3D 查看', resetView: '重置视图并居中', fullscreen: '全屏编辑', exitFullscreen: '退出全屏', collapseLayers: '折叠图层面板', expandLayers: '展开图层面板', collapseInspector: '折叠属性面板', expandInspector: '展开属性面板', dropHint: '将 SVG 拖到这里开始', inspector: '检查器', appearance: '外观',
    fill: '填充', stroke: '描边', opacity: '不透明度', strokeWidth: '描边宽度', cornerRadius: '圆角半径', width: '宽度', height: '高度', elementDetails: '元素详情', layer: '图层', visibility: '可见性',
    visible: '可见', livePreview: '实时预览', statusReady: '个元素 · SVG 就绪', changesInstant: '更改会即时生效', exportShort: '导出', selected: '已选中', resizeLineStart: '调整线条起点', resizeLineEnd: '调整线条终点',
    layersCount: '个图层', elementSuffix: '元素', show: '显示', hide: '隐藏', noSelection: '选择一个图层来编辑它的属性。', invalidSvg: '该文件不包含有效的 SVG。',
  },
}

const ZH_TAG_NAMES = { rect: '矩形', circle: '圆形', ellipse: '椭圆', line: '直线', polyline: '折线', polygon: '多边形', path: '路径', text: '文字', g: '分组', image: '图片' }
const ZH_LAYER_NAMES = { Background: '背景', 'Logo mark': '标志图形', Wordmark: '文字标志' }
const ADD_LAYER_TAGS = ['rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'path', 'text']

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
    code: <><path d="m5 4-3 4 3 4M11 4l3 4-3 4M9 2.5 7 13.5" /></>,
    cube: <><path d="m8 2 5 3v6l-5 3-5-3V5l5-3Z" /><path d="m3 5 5 3 5-3M8 8v6" /></>,
    expand: <path d="M3 6V3h3M10 3h3v3M13 10v3h-3M6 13H3v-3" />,
    exitFullscreen: <>
        <path d="M5 3v3H3" />
        <path d="M11 3v3h2" />
        <path d="M3 10h2v3" />
        <path d="M13 10h-2v3" />
      </>,
    sidebar: <><rect x="2.5" y="3" width="11" height="10" rx="1.5" /><path d="M6.5 3v10" /></>,
    x: <><path d="m4 4 8 8M12 4l-8 8" /></>,
    check: <path d="m3 8 3 3 5-6" />,
  }
  const strokeWidth = name === 'expand' || name === 'exitFullscreen' ? 2.1 : 1.45
  return <svg className="icon" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
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
  const usedIds = new Set(Array.from(doc.querySelectorAll('[data-editor-id]')).map((node) => node.getAttribute('data-editor-id')).filter(Boolean))
  const elements = []
  const nextEditorId = () => {
    while (usedIds.has(`node-${id}`)) id += 1
    const editorId = `node-${id++}`
    usedIds.add(editorId)
    return editorId
  }
  const walk = (node, depth = 0) => {
    Array.from(node.children).forEach((child, index) => {
      if (!EDITABLE_TAGS.has(child.tagName)) return walk(child, depth)
      const existingId = child.getAttribute('data-editor-id')
      const editorId = existingId || nextEditorId()
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
  return Math.min(4, Math.max(0.5, value))
}

function pointerDistance(first, second) {
  return Math.hypot(second.x - first.x, second.y - first.y)
}

function pointerCenter(first, second) {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }
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

function translateElements(rawMarkup, targetIds, delta) {
  const doc = new DOMParser().parseFromString(rawMarkup, 'image/svg+xml')
  const translate = `translate(${delta.x.toFixed(2)} ${delta.y.toFixed(2)})`
  targetIds.forEach((targetId) => {
    const node = doc.querySelector(`[data-editor-id="${targetId}"]`)
    if (!node) return
    const baseTransform = node.getAttribute('transform') || ''
    node.setAttribute('transform', baseTransform ? `${translate} ${baseTransform}` : translate)
  })
  return new XMLSerializer().serializeToString(doc.documentElement)
}

function getTopLevelSelectedIds(rawMarkup, targetIds) {
  const doc = new DOMParser().parseFromString(rawMarkup, 'image/svg+xml')
  const selected = new Set(targetIds)
  return targetIds.filter((targetId) => {
    let parent = doc.querySelector(`[data-editor-id="${targetId}"]`)?.parentElement
    while (parent) {
      if (selected.has(parent.getAttribute('data-editor-id'))) return false
      parent = parent.parentElement
    }
    return true
  })
}

function syncTextLineLayout(node) {
  if (node.tagName?.toLowerCase() !== 'text') return
  const configuredLineHeight = Number(node.getAttribute('line-height'))
  const lineHeight = Number.isFinite(configuredLineHeight) && configuredLineHeight > 0 ? configuredLineHeight : 1.2
  const fontSize = Number.parseFloat(node.getAttribute('font-size') || '16') || 16
  const lineHeightPx = lineHeight <= 10 ? lineHeight * fontSize : lineHeight
  const tspans = Array.from(node.children).filter((child) => child.tagName?.toLowerCase() === 'tspan')
  const lines = tspans.length > 1 ? tspans : (node.textContent || '').split(/\r?\n/)
  if (lines.length <= 1) return

  const x = node.getAttribute('x')
  if (tspans.length <= 1) {
    const text = node.textContent || ''
    node.replaceChildren()
    lines.forEach((line, index) => {
      const tspan = node.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'tspan')
      if (x != null) tspan.setAttribute('x', x)
      if (index > 0) tspan.setAttribute('dy', `${lineHeightPx}px`)
      tspan.textContent = line
      node.appendChild(tspan)
    })
    return
  }

  tspans.forEach((tspan, index) => {
    if (x != null && !tspan.hasAttribute('x')) tspan.setAttribute('x', x)
    if (index === 0) tspan.removeAttribute('dy')
    else tspan.setAttribute('dy', `${lineHeightPx}px`)
  })
}

function getEditableTextContent(node) {
  if (!node) return ''
  const tspans = Array.from(node.children).filter((child) => child.tagName?.toLowerCase() === 'tspan')
  return tspans.length ? tspans.map((tspan) => tspan.textContent || '').join('\n') : (node.textContent || '')
}

function updateElementAttributes(rawMarkup, targetId, updates) {
  const doc = new DOMParser().parseFromString(rawMarkup, 'image/svg+xml')
  const node = doc.querySelector(`[data-editor-id="${targetId}"]`)
  if (!node) return rawMarkup
  Object.entries(updates).forEach(([attribute, value]) => {
    if (value === '' || value == null) node.removeAttribute(attribute)
    else node.setAttribute(attribute, value)
  })
  if (node.tagName?.toLowerCase() === 'text' && 'font-size' in updates) syncTextLineLayout(node)
  return new XMLSerializer().serializeToString(doc.documentElement)
}

function formatSvgMarkup(rawMarkup) {
  const doc = new DOMParser().parseFromString(rawMarkup.trim(), 'image/svg+xml')
  if (doc.querySelector('parsererror') || doc.documentElement?.tagName?.toLowerCase() !== 'svg') throw new Error('Invalid SVG source.')
  const serialized = new XMLSerializer().serializeToString(doc.documentElement)
  const tokens = serialized.replace(/>\s+</g, '><').match(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g) || []
  const lines = []
  let depth = 0
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index].trim()
    if (!token) continue
    if (!token.startsWith('<')) {
      const next = tokens[index + 1]?.trim()
      if (next?.startsWith('</') && lines.length) {
        lines[lines.length - 1] += token + next
        depth = Math.max(0, depth - 1)
        index += 1
      }
      continue
    }
    if (token.startsWith('</')) depth = Math.max(0, depth - 1)
    lines.push(`${'  '.repeat(depth)}${token}`)
    if (token.startsWith('<') && !token.startsWith('</') && !token.startsWith('<?') && !token.startsWith('<!') && !token.endsWith('/>')) depth += 1
  }
  return lines.join('\n')
}

function highlightSvgSource(source) {
  const escapeHtml = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const highlightTag = (rawTag) => {
    const nameMatch = rawTag.match(/^(\s*<\/?)([A-Za-z_][\w:.-]*)/)
    if (!nameMatch) return escapeHtml(rawTag)
    const output = [escapeHtml(nameMatch[1]), `<span class="syntax-tag">${escapeHtml(nameMatch[2])}</span>`]
    const rest = rawTag.slice(nameMatch[0].length)
    let cursor = 0
    const attributePattern = /([A-Za-z_:][\w:.-]*)(\s*=\s*)("[^"]*"|'[^']*')/g
    let match
    while ((match = attributePattern.exec(rest))) {
      output.push(escapeHtml(rest.slice(cursor, match.index)))
      output.push(`<span class="syntax-attribute">${escapeHtml(match[1])}</span>${escapeHtml(match[2])}<span class="syntax-value">${escapeHtml(match[3])}</span>`)
      cursor = match.index + match[0].length
    }
    output.push(escapeHtml(rest.slice(cursor)))
    return output.join('')
  }

  const tokens = source.match(/<!--[\s\S]*?-->|<[^>]*>|[^<]+/g) || []
  return tokens.map((token) => token.startsWith('<!--') ? `<span class="syntax-comment">${escapeHtml(token)}</span>` : token.startsWith('<') ? highlightTag(token) : escapeHtml(token)).join('')
}

function getSvgDimensions(doc) {
  const root = doc.documentElement
  const viewBox = (root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number)
  if (viewBox.length === 4 && viewBox.every(Number.isFinite)) return { x: viewBox[0], y: viewBox[1], width: viewBox[2], height: viewBox[3] }
  return { x: 0, y: 0, width: Number(root.getAttribute('width')) || 720, height: Number(root.getAttribute('height')) || 480 }
}

function createLayerMarkup(rawMarkup, tag, textContent = 'New text') {
  const doc = new DOMParser().parseFromString(rawMarkup, 'image/svg+xml')
  const root = doc.documentElement
  const bounds = getSvgDimensions(doc)
  const centerX = bounds.x + bounds.width / 2
  const centerY = bounds.y + bounds.height / 2
  const newId = `node-new-${Date.now()}`
  const node = doc.createElementNS('http://www.w3.org/2000/svg', tag)
  const attributes = {
    rect: { x: centerX - 100, y: centerY - 60, width: 200, height: 120, rx: 16, fill: '#C8FF4F' },
    circle: { cx: centerX, cy: centerY, r: 72, fill: '#FF8B5C' },
    ellipse: { cx: centerX, cy: centerY, rx: 110, ry: 72, fill: '#5B75FF' },
    line: { x1: centerX - 140, y1: centerY, x2: centerX + 140, y2: centerY, stroke: '#C8FF4F', 'stroke-width': 12, 'stroke-linecap': 'round' },
    polyline: { points: `${centerX - 150},${centerY + 70} ${centerX - 50},${centerY - 80} ${centerX + 45},${centerY + 45} ${centerX + 150},${centerY - 65}`, fill: 'none', stroke: '#FF8B5C', 'stroke-width': 12, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
    polygon: { points: `${centerX},${centerY - 110} ${centerX + 110},${centerY + 90} ${centerX - 110},${centerY + 90}`, fill: '#5B75FF' },
    path: { d: `M ${centerX - 125} ${centerY + 70} C ${centerX - 80} ${centerY - 115}, ${centerX + 80} ${centerY - 115}, ${centerX + 125} ${centerY + 70}`, fill: 'none', stroke: '#FF8B5C', 'stroke-width': 16, 'stroke-linecap': 'round' },
    text: { x: centerX, y: centerY, 'text-anchor': 'middle', 'font-family': 'Manrope, Arial, sans-serif', 'font-size': 48, 'font-weight': 700, fill: '#15203A' },
  }[tag] || { fill: '#C8FF4F' }
  Object.entries(attributes).forEach(([attribute, value]) => node.setAttribute(attribute, String(value)))
  node.setAttribute('data-editor-id', newId)
  if (tag === 'text') node.textContent = textContent
  root.appendChild(doc.createTextNode('\n  '))
  root.appendChild(node)
  root.appendChild(doc.createTextNode('\n'))
  return { markup: new XMLSerializer().serializeToString(root), id: newId }
}

function copyLayerMarkup(rawMarkup, targetId) {
  const doc = new DOMParser().parseFromString(rawMarkup, 'image/svg+xml')
  const node = doc.querySelector(`[data-editor-id="${targetId}"]`)
  return node ? new XMLSerializer().serializeToString(node) : ''
}

function insertClonedLayer(rawMarkup, sourceMarkup, targetId, pastedId) {
  const doc = new DOMParser().parseFromString(rawMarkup, 'image/svg+xml')
  const target = doc.querySelector(`[data-editor-id="${targetId}"]`)
  const sourceDoc = new DOMParser().parseFromString(sourceMarkup, 'image/svg+xml')
  const source = sourceDoc.documentElement
  if (!target || !source) return rawMarkup
  const clone = source.cloneNode(true)
  clone.querySelectorAll('[data-editor-id]').forEach((node) => node.removeAttribute('data-editor-id'))
  clone.setAttribute('data-editor-id', pastedId)
  const usedIds = new Set(Array.from(doc.querySelectorAll('[id]')).map((node) => node.getAttribute('id')).filter(Boolean))
  const clonedNodes = [clone, ...clone.querySelectorAll('[id]')]
  clonedNodes.forEach((node) => {
    const originalId = node.getAttribute('id')
    if (!originalId) return
    let nextId = `${originalId}-copy`
    let suffix = 2
    while (usedIds.has(nextId)) nextId = `${originalId}-copy-${suffix++}`
    node.setAttribute('id', nextId)
    usedIds.add(nextId)
  })
  const parent = target.parentElement || doc.documentElement
  parent.insertBefore(clone, target.nextSibling)
  return new XMLSerializer().serializeToString(doc.documentElement)
}

function removeLayer(rawMarkup, targetId) {
  const doc = new DOMParser().parseFromString(rawMarkup, 'image/svg+xml')
  const node = doc.querySelector(`[data-editor-id="${targetId}"]`)
  if (!node || node === doc.documentElement) return { markup: rawMarkup, nextSelectedId: targetId }
  const parent = node.parentElement
  const siblings = Array.from(parent?.children || []).filter((child) => child !== node && EDITABLE_TAGS.has(child.tagName))
  const nodeIndex = Array.from(parent?.children || []).indexOf(node)
  const nextSibling = siblings.find((sibling) => Array.from(parent.children).indexOf(sibling) > nodeIndex) || siblings[siblings.length - 1]
  const nextSelectedId = nextSibling?.getAttribute('data-editor-id') || parent?.getAttribute('data-editor-id') || ''
  node.remove()
  return { markup: new XMLSerializer().serializeToString(doc.documentElement), nextSelectedId }
}

function reorderSiblingElements(rawMarkup, draggedId, targetId) {
  const doc = new DOMParser().parseFromString(rawMarkup, 'image/svg+xml')
  const dragged = doc.querySelector(`[data-editor-id="${draggedId}"]`)
  const target = doc.querySelector(`[data-editor-id="${targetId}"]`)
  if (!dragged || !target || dragged === target || dragged.parentElement !== target.parentElement) return rawMarkup
  target.parentElement.insertBefore(dragged, target)
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
  const [persisted] = useState(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
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
  const [activeTab, setActiveTab] = useState('preview')
  const [previewMode, setPreviewMode] = useState('2d')
  const [isFullscreen, setIsFullscreen] = useState(Boolean(persisted?.isFullscreen))
  const [isLayersOpen, setIsLayersOpen] = useState(true)
  const [isInspectorOpen, setIsInspectorOpen] = useState(true)
  const [addLayerMenuOpen, setAddLayerMenuOpen] = useState(false)
  const [fileName, setFileName] = useState(persisted?.fileName || 'untitled.svg')
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(Boolean(persisted?.dirty))
  const [svgPosition, setSvgPosition] = useState({ x: 0, y: 0 })
  const [svgScale, setSvgScale] = useState(1)
  const [isDraggingSvg, setIsDraggingSvg] = useState(false)
  const [isDraggingElement, setIsDraggingElement] = useState(false)
  const [isResizingElement, setIsResizingElement] = useState(false)
  const [isPinchingSvg, setIsPinchingSvg] = useState(false)
  const [history, setHistory] = useState(() => ({
    past: Array.isArray(persisted?.history?.past) ? persisted.history.past : [],
    future: Array.isArray(persisted?.history?.future) ? persisted.history.future : [],
  }))
  const [expandedGroups, setExpandedGroups] = useState({})
  const [draggingLayerId, setDraggingLayerId] = useState('')
  const [dragOverLayerId, setDragOverLayerId] = useState('')
  const [selectionBox, setSelectionBox] = useState(null)
  const [hoveredLayerId, setHoveredLayerId] = useState('')
  const [editingTextId, setEditingTextId] = useState('')
  const [textDraft, setTextDraft] = useState('')
  const [textFieldDraft, setTextFieldDraft] = useState('')
  const [attributeDrafts, setAttributeDrafts] = useState({ targetId: '', values: {} })
  const [transientMarkup, setTransientMarkup] = useState('')
  const fileInput = useRef(null)
  const canvasRef = useRef(null)
  const svgRef = useRef(null)
  const svgDragRef = useRef(null)
  const elementDragRef = useRef(null)
  const resizeRef = useRef(null)
  const layerRowRefs = useRef(new Map())
  const layerDragRef = useRef(null)
  const suppressLayerClickRef = useRef(false)
  const sourceHighlightRef = useRef(null)
  const clipboardLayerRef = useRef(null)
  const textEditRef = useRef(null)
  const activePointersRef = useRef(new Map())
  const pinchRef = useRef(null)
  const transientMarkupRef = useRef('')
  const previewFrameRef = useRef(0)
  const attributePreviewFrameRef = useRef(0)
  const pendingAttributeUpdatesRef = useRef(null)
  const attributeCommitTimerRef = useRef(0)
  const copy = COPY[language]

  const selected = elements.find((item) => item.id === selectedId)
  const selectedAttrs = selected ? selected.node : null
  const selectedDisplayName = selected ? getLayerDisplayName(selected, language) : ''
  const renderedMarkup = transientMarkup || svgMarkup
  const selectLayerIds = (nextIds, primaryId = nextIds[nextIds.length - 1] || '') => {
    const validIds = [...new Set(nextIds)].filter((id) => elements.some((item) => item.id === id))
    setSelectedIds(validIds)
    setSelectedId(validIds.includes(primaryId) ? primaryId : validIds[validIds.length - 1] || '')
  }
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
    document.title = language === 'zh' ? 'Vector Forge — SVG 编辑器' : 'Vector Forge — SVG editor'
  }, [language])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
          svgMarkup, fileName, selectedId, selectedIds, dirty, history, language, isFullscreen,
        }))
      } catch {
        // Storage can be unavailable or full; editing should continue in memory.
      }
    }, 350)
    return () => window.clearTimeout(timeout)
  }, [svgMarkup, fileName, selectedId, selectedIds, dirty, history, language, isFullscreen])

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
    textEditRef.current?.focus()
    textEditRef.current?.select()
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
  }, [activeTab, isLayersOpen, isInspectorOpen, previewMode, renderedMarkup, selectedId, svgPosition.x, svgPosition.y, svgScale])

  const updateTransientMarkup = (markup) => {
    transientMarkupRef.current = markup
    if (previewFrameRef.current) return
    previewFrameRef.current = requestAnimationFrame(() => {
      previewFrameRef.current = 0
      setTransientMarkup(transientMarkupRef.current)
    })
  }

  const clearTransientMarkup = () => {
    if (previewFrameRef.current) cancelAnimationFrame(previewFrameRef.current)
    previewFrameRef.current = 0
    transientMarkupRef.current = ''
    setTransientMarkup('')
  }

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

  const previewTextAttribute = (attribute, value) => {
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

  const loadSvg = (raw, name = 'untitled.svg') => {
    try {
      const parsed = parseSvg(raw)
      setSvgMarkup(parsed.markup)
      setSourceDraft(parsed.markup)
      setElements(parsed.elements)
      setSelectedId(parsed.elements[0]?.id || '')
      setSelectedIds(parsed.elements[0]?.id ? [parsed.elements[0].id] : [])
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

  const commitDocument = (rawMarkup, { nextSelectedId = selectedId, nextSelectedIds, nextFileName = fileName, nextDirty = true, historySnapshot = currentSnapshot(), forceHistory = false } = {}) => {
    const parsed = parseSvg(rawMarkup)
    if (!forceHistory && parsed.markup === svgMarkup && nextFileName === fileName && nextDirty === dirty) {
      setSourceDraft(parsed.markup)
      return
    }
    const validSelectedId = parsed.elements.some((item) => item.id === nextSelectedId) ? nextSelectedId : parsed.elements[0]?.id || ''
    const validSelectedIds = (nextSelectedIds || [validSelectedId]).filter((id) => parsed.elements.some((item) => item.id === id))
    setHistory((current) => ({ past: [...current.past, historySnapshot], future: [] }))
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

  const previewAttribute = (attribute, value) => previewAttributes({ [attribute]: value })

  const previewRectRadius = (value) => {
    if (!selected || selected.tag !== 'rect') return
    const nextValue = value === '' || value == null || Number(value) === 0 ? '' : value
    previewAttributes({ rx: nextValue, ry: nextValue })
  }

  const commitTextEdit = () => {
    if (!editingTextId) return
    const doc = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml')
    const node = doc.querySelector(`[data-editor-id="${editingTextId}"]`)
    if (node) {
      node.textContent = textDraft
      syncTextLineLayout(node)
      const nextMarkup = new XMLSerializer().serializeToString(doc.documentElement)
      commitDocument(nextMarkup, { nextSelectedId: editingTextId })
    }
    setEditingTextId('')
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

  const cancelTextEdit = () => setEditingTextId('')

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
    const reader = new FileReader()
    reader.onload = () => loadSvg(String(reader.result), file.name)
    reader.readAsText(file)
  }

  const addLayer = (tag) => {
    const textContent = language === 'zh' ? '新文本' : 'New text'
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
    event.preventDefault()
  }

  const pasteLayer = (event) => {
    if (!selected || !clipboardLayerRef.current) return
    const pastedId = `node-paste-${Date.now()}`
    const nextMarkup = insertClonedLayer(svgMarkup, clipboardLayerRef.current, selected.id, pastedId)
    if (nextMarkup === svgMarkup) return
    event.preventDefault()
    commitDocument(nextMarkup, { nextSelectedId: pastedId })
    setActiveTab('preview')
  }

  const deleteSelectedLayer = (event) => {
    if (!selected) return
    const removed = removeLayer(svgMarkup, selected.id)
    if (removed.markup === svgMarkup) return
    event.preventDefault()
    commitDocument(removed.markup, { nextSelectedId: removed.nextSelectedId })
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
      if (key === 'escape') {
        setSelectedId('')
        return
      }
      const modifier = event.metaKey || event.ctrlKey
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
  }, [selectedId, elements, svgMarkup, fileName, dirty, history, isLayersOpen, isInspectorOpen])

  const syncSourceScroll = (event) => {
    if (!sourceHighlightRef.current) return
    sourceHighlightRef.current.scrollTop = event.currentTarget.scrollTop
    sourceHighlightRef.current.scrollLeft = event.currentTarget.scrollLeft
  }

  const formatSource = () => {
    try {
      const formatted = formatSvgMarkup(sourceDraft)
      commitDocument(formatted, { nextSelectedId: selectedId })
      setError('')
    } catch (err) {
      setError(language === 'zh' ? copy.invalidSvg : err.message)
    }
  }

  const loadDemo = () => loadSvg(SAMPLE_SVG, 'demo.svg')

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

  const selectElementAtPoint = (clientX, clientY, fallbackTarget, additive = false) => {
    const pointTarget = document.elementFromPoint(clientX, clientY)
    const target = pointTarget?.closest?.('[data-editor-id]') || fallbackTarget?.closest?.('[data-editor-id]')
    const targetId = target?.getAttribute('data-editor-id')
    if (!targetId) return ''
    if (additive) {
      const nextIds = selectedIds.includes(targetId) ? selectedIds.filter((id) => id !== targetId) : [...selectedIds, targetId]
      selectLayerIds(nextIds, targetId)
    } else if (!selectedIds.includes(targetId) || selectedIds.length !== 1) {
      selectLayerIds([targetId], targetId)
    }
    return targetId
  }

  const handleCanvasClick = (event) => {
    if (event.target?.closest?.('[data-editor-id]')) return
    selectElementAtPoint(event.clientX, event.clientY, event.target, event.metaKey || event.ctrlKey)
  }

  const handleSvgDoubleClick = (event) => {
    const target = event.target?.closest?.('[data-editor-id]')
    const item = target ? elements.find((element) => element.id === target.getAttribute('data-editor-id')) : null
    if (!item || item.tag !== 'text') return
    event.preventDefault()
    event.stopPropagation()
    selectLayerIds([item.id], item.id)
    const stageRect = canvasRef.current?.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    if (stageRect && targetRect) setSelectionBox({ left: targetRect.left - stageRect.left, top: targetRect.top - stageRect.top, width: targetRect.width, height: targetRect.height })
    setTextDraft(getEditableTextContent(target))
    setEditingTextId(item.id)
  }

  const handleCanvasPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const elementTarget = event.target?.closest?.('[data-editor-id]')
    const targetId = selectElementAtPoint(event.clientX, event.clientY, event.target, event.metaKey || event.ctrlKey)
    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    event.currentTarget.setPointerCapture(event.pointerId)

    if (activePointersRef.current.size === 2) {
      const [first, second] = [...activePointersRef.current.values()]
      pinchRef.current = { distance: pointerDistance(first, second), scale: svgScale, center: pointerCenter(first, second), origin: svgPosition }
      svgDragRef.current = null
      elementDragRef.current = null
      setIsDraggingSvg(false)
      setIsDraggingElement(false)
      setIsPinchingSvg(true)
      return
    }

    if (elementTarget) {
      const selectionIds = targetId && selectedIds.includes(targetId) && !event.metaKey && !event.ctrlKey ? selectedIds : [targetId]
      elementDragRef.current = {
        pointerId: event.pointerId,
        targetIds: getTopLevelSelectedIds(svgMarkup, selectionIds),
        selectionIds,
        startX: event.clientX,
        startY: event.clientY,
        baseMarkup: svgMarkup,
        baseSnapshot: currentSnapshot(),
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

  const handleCanvasPointerMove = (event) => {
    const hoveredId = event.target?.closest?.('[data-editor-id]')?.getAttribute('data-editor-id') || ''
    setHoveredLayerId((current) => current === hoveredId ? current : hoveredId)
    if (activePointersRef.current.has(event.pointerId)) {
      activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    }

    if (activePointersRef.current.size >= 2) {
      const [first, second] = [...activePointersRef.current.values()]
      const pinch = pinchRef.current
      if (pinch) {
        const center = pointerCenter(first, second)
        if (pinch.distance > 0) setSvgScale(clampScale(pinch.scale * pointerDistance(first, second) / pinch.distance))
        setSvgPosition({ x: pinch.origin.x + center.x - pinch.center.x, y: pinch.origin.y + center.y - pinch.center.y })
      }
      return
    }

    const elementDrag = elementDragRef.current
    if (elementDrag && elementDrag.pointerId === event.pointerId) {
      const screenDistance = Math.hypot(event.clientX - elementDrag.startX, event.clientY - elementDrag.startY)
      if (screenDistance <= 2) return
      const delta = getSvgPointerDelta(svgRef.current, { x: elementDrag.startX, y: elementDrag.startY }, { x: event.clientX, y: event.clientY })
      const nextMarkup = translateElements(elementDrag.baseMarkup, elementDrag.targetIds, delta)
      elementDrag.previewMarkup = nextMarkup
      elementDrag.moved = true
      updateTransientMarkup(nextMarkup)
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

  const handleCanvasPointerUp = (event, cancelled = false) => {
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
        clearTransientMarkup()
      } else {
        clearTransientMarkup()
        commitDocument(elementDrag.previewMarkup, { nextSelectedId: elementDrag.selectionIds[0], nextSelectedIds: elementDrag.selectionIds, historySnapshot: elementDrag.baseSnapshot, forceHistory: true })
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
    if (!target || (selected.tag !== 'line' && (!baseBox?.width || !baseBox?.height))) return
    const pointerId = event.pointerId ?? 'mouse'
    if (event.pointerId != null && event.currentTarget.setPointerCapture) event.currentTarget.setPointerCapture(event.pointerId)
    const lineX1 = Number(target.getAttribute('x1')) || 0
    const lineX2 = Number(target.getAttribute('x2')) || 0
    resizeRef.current = {
      pointerId,
      targetId: selected.id,
      handle,
      kind: selected.tag === 'line' ? 'line' : 'shape',
      lineEndpoint: selected.tag === 'line' ? (handle === 'line-start' ? (lineX1 <= lineX2 ? 'x1' : 'x2') : (lineX1 <= lineX2 ? 'x2' : 'x1')) : '',
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
    if (!resize || (event.pointerId != null && resize.pointerId !== event.pointerId) || (event.type.startsWith('mouse') && resize.pointerId !== 'mouse')) return
    event.preventDefault()
    if (resize.kind === 'line') {
      const point = getSvgPoint(svgRef.current, event.clientX, event.clientY)
      const nextMarkup = updateElementAttributes(resize.baseMarkup, resize.targetId, { [resize.lineEndpoint]: point.x.toFixed(2) })
      resize.previewMarkup = nextMarkup
      resize.moved = true
      updateTransientMarkup(nextMarkup)
      return
    }
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
    updateTransientMarkup(nextMarkup)
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
      clearTransientMarkup()
    } else if (resize.moved) {
      clearTransientMarkup()
      commitDocument(resize.previewMarkup, { nextSelectedId: resize.targetId, historySnapshot: resize.baseSnapshot, forceHistory: true })
    }
    resizeRef.current = null
    setIsResizingElement(false)
  }

  useEffect(() => {
    const stage = canvasRef.current
    if (!stage || activeTab !== 'preview') return undefined

    const handleWheel = (event) => {
      event.preventDefault()
      event.stopPropagation()
      if (event.ctrlKey || event.metaKey) {
        const factor = Math.exp(-event.deltaY * 0.0025)
        setSvgScale((current) => clampScale(current * factor))
        return
      }
      setSvgPosition((current) => ({ x: current.x - event.deltaX, y: current.y - event.deltaY }))
    }

    stage.addEventListener('wheel', handleWheel, { passive: false })
    return () => stage.removeEventListener('wheel', handleWheel)
  }, [activeTab])

  const fill = getDraftedAttribute('fill', getColor(selectedAttrs?.getAttribute('fill'), '#5B75FF'))
  const stroke = getDraftedAttribute('stroke', getColor(selectedAttrs?.getAttribute('stroke'), '#15203A'))
  const opacity = Number(getDraftedAttribute('opacity', '1'))
  const strokeWidth = Number(getDraftedAttribute('stroke-width', '0'))
  const rectWidthValue = getDraftedAttribute('width', selectedAttrs?.getAttribute('width') || '200')
  const rectHeightValue = getDraftedAttribute('height', selectedAttrs?.getAttribute('height') || '200')
  const rectWidth = Number(rectWidthValue) || 200
  const rectHeight = Number(rectHeightValue) || 200
  const cornerRadiusMax = Math.max(1, Math.floor(Math.min(rectWidth, rectHeight) / 2))
  const cornerRadius = Math.min(cornerRadiusMax, Number(getDraftedAttribute('rx', selectedAttrs?.getAttribute('ry') || '0')))

  return (
    <main className={`app-shell ${isFullscreen ? 'fullscreen-mode' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><span /></span><span>VECTOR FORGE</span></div>
        <div className="topbar-actions">
          <button className="icon-button" title={language === 'zh' ? '撤销（⌘ Z）' : 'Undo (⌘ Z)'} aria-keyshortcuts="Meta+Z" onClick={undo} disabled={!history.past.length}><Icon name="undo" /></button>
          <button className="icon-button" title={language === 'zh' ? '前进（⌘ Shift Z）' : 'Redo (⌘ Shift Z)'} aria-keyshortcuts="Meta+Shift+Z" onClick={redo} disabled={!history.future.length}><Icon name="redo" /></button>
          <button className="icon-button" type="button" title={isFullscreen ? copy.exitFullscreen : copy.fullscreen} aria-label={isFullscreen ? copy.exitFullscreen : copy.fullscreen} aria-pressed={isFullscreen} onClick={() => setIsFullscreen((current) => !current)}><Icon name={isFullscreen ? 'exitFullscreen' : 'expand'} /></button>
          <span className="divider" />
          <span className="save-state"><span className={`status-dot ${dirty ? 'dirty' : ''}`} />{dirty ? copy.unsaved : copy.saved}</span>
          <button className="language-toggle" type="button" onClick={() => setLanguage((current) => current === 'en' ? 'zh' : 'en')} aria-label={copy.languageSwitch}>{copy.languageSwitch}</button>
          <button className="button button-quiet" onClick={() => fileInput.current?.click()}><Icon name="download" /> {copy.open}</button>
          <button className="button button-accent" onClick={exportSvg}><Icon name="upload" /> {copy.export}</button>
          <input ref={fileInput} type="file" accept="image/svg+xml,.svg" hidden onChange={(event) => handleFile(event.target.files?.[0])} />
        </div>
      </header>

      <section className="workspace-heading">
        <div><h1>{copy.title}</h1><p>{copy.subtitle}</p></div>
        <div className="file-chip"><span className="file-icon">SVG</span><span>{fileName}</span><span className="file-size">{elements.length} {copy.layersCount}</span></div>
      </section>

      <section className={`workspace ${isLayersOpen ? '' : 'layers-collapsed'} ${isInspectorOpen ? '' : 'inspector-collapsed'}`}>
        <aside className={`layers-panel panel ${isLayersOpen ? '' : 'is-collapsed'}`}>
          <div className="panel-header layers-header"><div className="panel-title"><Icon name="layers" /><span>{copy.layers}</span></div><button className="mini-button layers-toggle" type="button" title={isLayersOpen ? copy.collapseLayers : copy.expandLayers} aria-label={isLayersOpen ? copy.collapseLayers : copy.expandLayers} aria-expanded={isLayersOpen} onClick={() => setIsLayersOpen((current) => !current)}><Icon name="sidebar" size={14} /></button><button className="mini-button layers-add-button" type="button" title={copy.addLayer} aria-label={copy.addLayer} aria-expanded={addLayerMenuOpen} onClick={() => setAddLayerMenuOpen((current) => !current)}><Icon name="plus" size={14} /></button></div>
          {addLayerMenuOpen && <div className="add-layer-menu" role="menu">{ADD_LAYER_TAGS.map((tag) => <button key={tag} type="button" role="menuitem" onClick={() => addLayer(tag)}><span className={`layer-shape shape-${tag}`} /><span>{getTagDisplayName(tag, language)}</span></button>)}</div>}
          <div className="layer-list">
            {visibleLayerItems.map(({ item, index }) => {
              const hidden = isElementHidden(item.node)
              const displayName = getLayerDisplayName(item, language)
              const isGroup = item.tag === 'g'
              const isExpanded = expandedGroups[item.id] !== false
              return <div key={item.id} data-layer-id={item.id} ref={(node) => { if (node) layerRowRefs.current.set(item.id, node); else layerRowRefs.current.delete(item.id) }} className={`layer-row ${selectedIds.includes(item.id) ? 'selected' : ''} ${hidden ? 'hidden' : ''} ${draggingLayerId === item.id ? 'dragging' : ''} ${dragOverLayerId === item.id ? 'drag-over' : ''}`} style={{ paddingLeft: `${14 + item.depth * 15}px` }} role="button" tabIndex="0" aria-grabbed={draggingLayerId === item.id} onClick={(event) => { if (suppressLayerClickRef.current) { suppressLayerClickRef.current = false; return } if (event.metaKey || event.ctrlKey) { const nextIds = selectedIds.includes(item.id) ? selectedIds.filter((id) => id !== item.id) : [...selectedIds, item.id]; selectLayerIds(nextIds, item.id) } else selectLayerIds([item.id], item.id) }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') selectLayerIds([item.id], item.id) }} onMouseDown={(event) => handleLayerMouseDown(event, item)}>
                <span className="layer-chevron">{isGroup ? <button className={`layer-collapse-toggle ${isExpanded ? 'expanded' : 'collapsed'}`} type="button" title={isExpanded ? (language === 'zh' ? '折叠分组' : 'Collapse group') : (language === 'zh' ? '展开分组' : 'Expand group')} aria-label={isExpanded ? (language === 'zh' ? '折叠分组' : 'Collapse group') : (language === 'zh' ? '展开分组' : 'Expand group')} aria-expanded={isExpanded} onClick={(event) => toggleGroup(item, event)}><Icon name="chevron" size={13} /></button> : ''}</span>
                <span className={`layer-shape shape-${item.tag}`} />
                <span className="layer-name">{displayName}</span>
                <span className="layer-index">{String(index + 1).padStart(2, '0')}</span>
                <button className={`layer-visibility ${hidden ? 'is-hidden' : ''}`} type="button" title={`${hidden ? copy.show : copy.hide} ${displayName}`} aria-label={`${hidden ? copy.show : copy.hide} ${displayName}`} aria-pressed={!hidden} onClick={(event) => toggleVisibility(item, event)}><Icon name="eye" size={14} /></button>
              </div>
            })}
          </div>
        </aside>

        <section className="canvas-panel">
          <div className="canvas-toolbar">
            <div className="view-tabs"><button className={activeTab === 'preview' ? 'active' : ''} onClick={() => setActiveTab('preview')}><Icon name="eye" size={14} /> {copy.preview}</button><button className={activeTab === 'source' ? 'active' : ''} onClick={() => setActiveTab('source')}><Icon name="code" size={14} /> {copy.source}</button></div>
            <div className="canvas-tools">{activeTab === 'source' ? <button className="tool-button" type="button" title={copy.format} onClick={formatSource}><Icon name="code" size={15} /> {copy.format}</button> : <><button className="mode-toggle" type="button" title={previewMode === '2d' ? copy.viewMode2D : copy.viewMode3D} aria-label={previewMode === '2d' ? copy.viewMode3D : copy.viewMode2D} aria-pressed={previewMode === '3d'} onClick={() => setPreviewMode((current) => current === '2d' ? '3d' : '2d')}><Icon name="cube" size={14} /><span className={previewMode === '2d' ? 'active' : ''}>{copy.mode2D}</span><span className={previewMode === '3d' ? 'active' : ''}>{copy.mode3D}</span></button><button className="zoom-readout" type="button" title={copy.resetView} onClick={() => { setSvgScale(1); setSvgPosition({ x: 0, y: 0 }) }}>{Math.round(svgScale * 100)}%</button></>}</div>
          </div>
          {activeTab === 'preview' ? (
            <div ref={canvasRef} className={`canvas-stage mode-${previewMode}`} onClick={handleCanvasClick} onDoubleClick={handleSvgDoubleClick} onPointerDown={handleCanvasPointerDown} onPointerMove={handleCanvasPointerMove} onPointerUp={handleCanvasPointerUp} onPointerCancel={(event) => handleCanvasPointerUp(event, true)} onPointerLeave={() => setHoveredLayerId('')}>
              {elements.length === 0 && <div className="drop-hint"><span className="drop-icon"><Icon name="upload" size={15} /></span><span>{copy.dropHint}</span></div>}
              <div
                className={`svg-wrap ${isDraggingSvg || isDraggingElement ? 'is-dragging' : ''} ${isDraggingElement ? 'is-dragging-element' : ''} ${isPinchingSvg ? 'is-pinching' : ''}`}
                ref={svgRef}
                style={{ '--svg-x': `${svgPosition.x}px`, '--svg-y': `${svgPosition.y}px`, '--svg-scale': svgScale }}
                dangerouslySetInnerHTML={{ __html: renderedMarkup.replace(`data-editor-id="${selectedId}"`, `data-editor-id="${selectedId}" class="is-selected"`) }}
              />
              {editingTextId === selectedId && selected?.tag === 'text' && selectionBox && <input
                ref={textEditRef}
                className="text-edit-input"
                style={{ left: selectionBox.left - 5, top: selectionBox.top - 5, width: Math.max(selectionBox.width + 10, 120) }}
                value={textDraft}
                onChange={(event) => setTextDraft(event.target.value)}
                onKeyDown={(event) => {
                  event.stopPropagation()
                  if (event.key === 'Enter') { event.preventDefault(); commitTextEdit() }
                  if (event.key === 'Escape') { event.preventDefault(); cancelTextEdit() }
                }}
                onBlur={commitTextEdit}
                onClick={(event) => event.stopPropagation()}
                aria-label={language === 'zh' ? '编辑文本内容' : 'Edit text content'}
              />}
              {selectionBox && selected && <div className={`selection-overlay ${isResizingElement ? 'is-resizing' : ''} ${hoveredLayerId === selected.id ? 'is-hovered' : ''}`} style={{ left: selectionBox.left, top: selectionBox.top, width: selectionBox.width, height: selectionBox.height }} onPointerMove={handleResizePointerMove} onPointerUp={handleResizePointerUp} onPointerCancel={(event) => handleResizePointerUp(event, true)}>
                {selected.tag === 'line' ? <><button className="resize-handle resize-handle-line-start" type="button" aria-label={copy.resizeLineStart} title={copy.resizeLineStart} onPointerDown={(event) => handleResizePointerDown(event, 'line-start')} onMouseDown={(event) => handleResizePointerDown(event, 'line-start')} onPointerMove={handleResizePointerMove} onPointerUp={handleResizePointerUp} onPointerCancel={(event) => handleResizePointerUp(event, true)} /><button className="resize-handle resize-handle-line-end" type="button" aria-label={copy.resizeLineEnd} title={copy.resizeLineEnd} onPointerDown={(event) => handleResizePointerDown(event, 'line-end')} onMouseDown={(event) => handleResizePointerDown(event, 'line-end')} onPointerMove={handleResizePointerMove} onPointerUp={handleResizePointerUp} onPointerCancel={(event) => handleResizePointerUp(event, true)} /></> : <><button className="resize-handle resize-handle-top-left" type="button" aria-label={language === 'zh' ? '从左上角调整大小' : 'Resize from top left'} title={language === 'zh' ? '从左上角调整大小' : 'Resize from top left'} onPointerDown={(event) => handleResizePointerDown(event, 'top-left')} onMouseDown={(event) => handleResizePointerDown(event, 'top-left')} onPointerMove={handleResizePointerMove} onPointerUp={handleResizePointerUp} onPointerCancel={(event) => handleResizePointerUp(event, true)} /><button className="resize-handle resize-handle-bottom-right" type="button" aria-label={language === 'zh' ? '从右下角调整大小' : 'Resize from bottom right'} title={language === 'zh' ? '从右下角调整大小' : 'Resize from bottom right'} onPointerDown={(event) => handleResizePointerDown(event, 'bottom-right')} onMouseDown={(event) => handleResizePointerDown(event, 'bottom-right')} onPointerMove={handleResizePointerMove} onPointerUp={handleResizePointerUp} onPointerCancel={(event) => handleResizePointerUp(event, true)} /></>}
                <span className="selection-size-label">{Math.round(selectionBox.width)} × {Math.round(selectionBox.height)}</span>
              </div>}
            </div>
          ) : (
            <div className="source-editor-wrap">
              <pre ref={sourceHighlightRef} className="source-highlight" aria-hidden="true" dangerouslySetInnerHTML={{ __html: highlightedSource }} />
              <textarea className="source-editor" value={sourceDraft} onChange={(event) => setSourceDraft(event.target.value)} onScroll={syncSourceScroll} onBlur={() => { if (!sourceDraft.trim()) { setError(''); return } try { commitDocument(sourceDraft, { nextSelectedId: selectedId }) } catch (err) { setError(language === 'zh' ? copy.invalidSvg : err.message) } }} spellCheck="false" />
              {!sourceDraft.trim() && <div className="source-empty-state"><p>{copy.invalidSvg}</p><button className="button button-accent" type="button" onClick={loadDemo}>{copy.loadDemo}</button></div>}
            </div>
          )}
          {error && <div className="error-toast"><Icon name="x" size={15} />{error}</div>}
          <div className="canvas-status"><span><span className="live-dot" /> {copy.livePreview}</span><span>{elements.length} {copy.statusReady}</span><span className="status-path">{selected ? `${copy.selected}: ${selectedDisplayName}` : copy.noSelection}</span></div>
        </section>

        <aside className={`inspector-panel panel ${isInspectorOpen ? '' : 'is-collapsed'}`}>
          <div className="panel-header inspector-header"><div className="panel-title"><span>{copy.inspector}</span></div><button className="mini-button inspector-toggle" type="button" title={isInspectorOpen ? copy.collapseInspector : copy.expandInspector} aria-label={isInspectorOpen ? copy.collapseInspector : copy.expandInspector} aria-expanded={isInspectorOpen} onClick={() => setIsInspectorOpen((current) => !current)}><Icon name="sidebar" size={14} /></button></div>
          <div className="inspector-content">{selected ? <>
            <div className="selection-summary"><div className={`selection-icon tag-${selected.tag}`}>{selected.tag.slice(0, 2).toUpperCase()}</div><div className="selection-meta"><strong>{selectedDisplayName}</strong><span>{getTagDisplayName(selected.tag, language)} {copy.elementSuffix}</span></div><span className="selection-check"><Icon name="check" size={13} /></span></div>
            <div className="inspector-section"><div className="section-label">{copy.appearance}</div>
              {selected.tag === 'text' && <>
                <div className="text-content-field"><label htmlFor="text-content-input">{copy.textContent}</label><div className="text-content-control"><textarea id="text-content-input" rows="3" value={textFieldDraft} onChange={(event) => setTextFieldDraft(event.target.value)} onBlur={commitTextField} onKeyDown={(event) => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); event.currentTarget.blur() } }} aria-label={copy.editText} /><button type="button" onClick={() => { setTextDraft(textFieldDraft); setEditingTextId(selected.id) }} aria-label={copy.editText} title={copy.editText}>↗</button></div></div>
                <div className="text-property-grid">
                  <NumericField id="text-font-size-input" label={copy.fontSize} value={textFontSize} min={0} step={1} suffix="px" onPreview={(value) => previewTextAttribute('font-size', value)} onCommit={commitPreviewAttributes} onKeyDown={handleTextAttributeKeyDown} />
                  <NumericField id="text-letter-spacing-input" label={copy.letterSpacing} value={textLetterSpacing} step={0.5} suffix="px" onPreview={(value) => previewTextAttribute('letter-spacing', value)} onCommit={commitPreviewAttributes} onKeyDown={handleTextAttributeKeyDown} />
                </div>
                <div className="text-property-field"><label htmlFor="text-font-family-input">{copy.fontFamily}</label><input id="text-font-family-input" className="text-property-input" list="text-font-family-options" placeholder={copy.fontFamilyPlaceholder} value={textFontFamily} onChange={(event) => previewTextAttribute('font-family', event.target.value)} onBlur={commitPreviewAttributes} onKeyDown={handleTextAttributeKeyDown} /><datalist id="text-font-family-options"><option value="Arial, sans-serif" /><option value="Georgia, serif" /><option value="Inter, sans-serif" /><option value="Manrope, sans-serif" /><option value="monospace" /></datalist></div>
              </>}
              {selected.tag === 'rect' && <div className="text-property-grid"><NumericField id="rect-width-input" label={copy.width} value={rectWidthValue} min={0} step={1} suffix="px" onPreview={(value) => previewAttribute('width', value)} onCommit={commitPreviewAttributes} /><NumericField id="rect-height-input" label={copy.height} value={rectHeightValue} min={0} step={1} suffix="px" onPreview={(value) => previewAttribute('height', value)} onCommit={commitPreviewAttributes} /></div>}
              <ColorField label={copy.fill} value={fill} onPreview={(value) => previewAttribute('fill', value)} onCommit={commitPreviewAttributes} />
              <ColorField label={copy.stroke} value={stroke} onPreview={(value) => previewAttribute('stroke', value)} onCommit={commitPreviewAttributes} />
              <div className="field-row"><label>{copy.opacity}</label><div className="range-wrap"><input type="range" min="0" max="1" step="0.01" value={opacity} style={{ '--range-progress': `${opacity * 100}%` }} onChange={(event) => previewAttribute('opacity', event.target.value)} onPointerUp={commitPreviewAttributes} onBlur={commitPreviewAttributes} /><span>{Math.round(opacity * 100)}%</span></div></div>
              <div className="field-row"><label>{copy.strokeWidth}</label><div className="range-wrap"><input type="range" min="0" max="24" step="1" value={strokeWidth} style={{ '--range-progress': `${strokeWidth / 24 * 100}%` }} onChange={(event) => previewAttribute('stroke-width', event.target.value)} onPointerUp={commitPreviewAttributes} onBlur={commitPreviewAttributes} /><span>{strokeWidth}px</span></div></div>
              {selected.tag === 'rect' && <div className="field-row"><label>{copy.cornerRadius}</label><div className="range-wrap"><input type="range" min="0" max={cornerRadiusMax} step="1" value={cornerRadius} style={{ '--range-progress': `${cornerRadiusMax ? cornerRadius / cornerRadiusMax * 100 : 0}%` }} onChange={(event) => previewRectRadius(event.target.value)} onPointerUp={commitPreviewAttributes} onBlur={commitPreviewAttributes} /><span>{cornerRadius}px</span></div></div>}
            </div>
            <div className="inspector-section"><div className="section-label">{copy.elementDetails}</div><div className="detail-grid"><div><span>{copy.layer}</span><strong>{String(elements.indexOf(selected) + 1).padStart(2, '0')} / {String(elements.length).padStart(2, '0')}</strong></div><div><span>{copy.visibility}</span><strong>{copy.visible}</strong></div></div></div>
          </> : <div className="empty-inspector">{copy.noSelection}</div>}</div>
          <div className="inspector-footer"><span><span className="kbd">⌘</span><span className="kbd">S</span> {copy.exportShort}</span><span className="footer-hint">{copy.changesInstant}</span></div>
        </aside>
      </section>
    </main>
  )
}

function ColorField({ label, value, onPreview, onCommit }) {
  const pickerValue = value.length === 7 && /^#[0-9a-f]{6}$/i.test(value) ? value : '#5B75FF'
  return <div className="color-field"><label>{label}</label><div className="color-control"><input className="color-picker" type="color" value={pickerValue} onChange={(event) => onPreview(event.target.value.toUpperCase())} onBlur={onCommit} /><input className="hex-input" value={value} onChange={(event) => onPreview(event.target.value)} onBlur={onCommit} maxLength={7} /></div></div>
}

function NumericField({ id, label, value, min, step, suffix, onPreview, onCommit, onKeyDown }) {
  const adjust = (direction) => {
    const current = Number(value)
    const precision = String(step).split('.')[1]?.length || 0
    const next = Number(((Number.isFinite(current) ? current : 0) + direction * step).toFixed(precision))
    onPreview(String(min == null ? next : Math.max(min, next)))
    onCommit()
  }
  return <div className="text-property-field"><label htmlFor={id}>{label}</label><div className="numeric-field"><input id={id} type="number" min={min} step={step} value={value} onChange={(event) => onPreview(event.target.value)} onBlur={onCommit} onKeyDown={onKeyDown} /><span className="numeric-stepper"><button type="button" aria-label={`${label} +`} onMouseDown={(event) => event.preventDefault()} onClick={() => adjust(1)}><Icon name="chevron" size={10} /></button><button type="button" aria-label={`${label} -`} onMouseDown={(event) => event.preventDefault()} onClick={() => adjust(-1)}><Icon name="chevron" size={10} /></button></span>{suffix && <span className="numeric-suffix">{suffix}</span>}</div></div>
}

createRoot(document.getElementById('root')).render(<App />)
