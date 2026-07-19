import { EDITABLE_TAGS } from './svg-parser.js'
import { getSvgDimensions } from './svg-geometry.js'

export function updateElementTransform(rawMarkup, targetId, transform) {
  const doc = new DOMParser().parseFromString(rawMarkup, 'image/svg+xml')
  const node = doc.querySelector(`[data-editor-id="${targetId}"]`)
  if (!node) return rawMarkup
  if (transform) node.setAttribute('transform', transform)
  else node.removeAttribute('transform')
  return new XMLSerializer().serializeToString(doc.documentElement)
}

export function translateElements(rawMarkup, targetIds, delta) {
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

export function syncTextLineLayout(node) {
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

export function getEditableTextContent(node) {
  if (!node) return ''
  const tspans = Array.from(node.children).filter((child) => child.tagName?.toLowerCase() === 'tspan')
  return tspans.length ? tspans.map((tspan) => tspan.textContent || '').join('\n') : (node.textContent || '')
}

export function updateElementAttributes(rawMarkup, targetId, updates) {
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

export function formatSvgMarkup(rawMarkup) {
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

export function highlightSvgSource(source) {
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

export function createLayerMarkup(rawMarkup, tag, textContent = 'New text') {
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

export function copyLayerMarkup(rawMarkup, targetId) {
  const doc = new DOMParser().parseFromString(rawMarkup, 'image/svg+xml')
  const node = doc.querySelector(`[data-editor-id="${targetId}"]`)
  return node ? new XMLSerializer().serializeToString(node) : ''
}

export function insertClonedLayer(rawMarkup, sourceMarkup, targetId, pastedId) {
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

export function removeLayer(rawMarkup, targetId) {
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

export function reorderSiblingElements(rawMarkup, draggedId, targetId) {
  const doc = new DOMParser().parseFromString(rawMarkup, 'image/svg+xml')
  const dragged = doc.querySelector(`[data-editor-id="${draggedId}"]`)
  const target = doc.querySelector(`[data-editor-id="${targetId}"]`)
  if (!dragged || !target || dragged === target || dragged.parentElement !== target.parentElement) return rawMarkup
  target.parentElement.insertBefore(dragged, target)
  return new XMLSerializer().serializeToString(doc.documentElement)
}

export function sanitizeForExport(rawMarkup) {
  const doc = new DOMParser().parseFromString(rawMarkup, 'image/svg+xml')
  doc.querySelectorAll('[data-editor-id]').forEach((node) => node.removeAttribute('data-editor-id'))
  doc.querySelectorAll('.is-selected').forEach((node) => {
    const nextClass = (node.getAttribute('class') || '').replace(/\bis-selected\b/g, '').trim()
    if (nextClass) node.setAttribute('class', nextClass)
    else node.removeAttribute('class')
  })
  return new XMLSerializer().serializeToString(doc.documentElement)
}

export function minifySvg(rawMarkup) {
  return rawMarkup.replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ').replace(/\d*\.\d{3,}/g, (match) => String(Number(Number(match).toFixed(2)))).trim()
}

export function withExplicitSize(rawMarkup, width, height) {
  const doc = new DOMParser().parseFromString(rawMarkup, 'image/svg+xml')
  if (!doc.documentElement.hasAttribute('width')) doc.documentElement.setAttribute('width', String(width))
  if (!doc.documentElement.hasAttribute('height')) doc.documentElement.setAttribute('height', String(height))
  return new XMLSerializer().serializeToString(doc.documentElement)
}

export function translateElementsById(rawMarkup, moves) {
  const doc = new DOMParser().parseFromString(rawMarkup, 'image/svg+xml')
  moves.forEach(({ id, dx, dy }) => {
    if (!dx && !dy) return
    const node = doc.querySelector(`[data-editor-id="${id}"]`)
    if (!node) return
    const translate = `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`
    const baseTransform = node.getAttribute('transform') || ''
    node.setAttribute('transform', baseTransform ? `${translate} ${baseTransform}` : translate)
  })
  return new XMLSerializer().serializeToString(doc.documentElement)
}

export function highlightSelectedMarkup(rawMarkup, selectedIds, editingTextId = '') {
  return selectedIds.reduce(
    (markup, id) => markup.replace(`data-editor-id="${id}"`, `data-editor-id="${id}" class="is-selected${id === editingTextId ? ' is-editing-text' : ''}"`),
    rawMarkup,
  )
}
