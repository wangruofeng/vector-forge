import { useEffect, useRef, useState } from 'react'
import { clampScale, getSvgPoint, getSvgPointerDelta, getTopLevelSelectedIds, getVisibleNodeRect, pointerCenter, pointerDistance } from '../editor/svg-geometry.js'
import { getEditableTextContent, translateElements, updateElementAttributes, updateElementTransform } from '../editor/svg-transforms.js'

export default function useCanvasInteraction({ activeTab, selectedId, selectedIds, selected, elements, svgMarkup, currentSnapshot, commitDocument, selectLayerIds }) {
  const [svgPosition, setSvgPosition] = useState({ x: 0, y: 0 })
  const [svgScale, setSvgScale] = useState(1)
  const [isDraggingSvg, setIsDraggingSvg] = useState(false)
  const [isDraggingElement, setIsDraggingElement] = useState(false)
  const [isResizingElement, setIsResizingElement] = useState(false)
  const [isPinchingSvg, setIsPinchingSvg] = useState(false)
  const [selectionBox, setSelectionBox] = useState(null)
  const [multiSelectionBoxes, setMultiSelectionBoxes] = useState([])
  const [hoveredLayerId, setHoveredLayerId] = useState('')
  const [transientMarkup, setTransientMarkup] = useState('')
  const canvasRef = useRef(null)
  const svgRef = useRef(null)
  const svgDragRef = useRef(null)
  const elementDragRef = useRef(null)
  const resizeRef = useRef(null)
  const activePointersRef = useRef(new Map())
  const pinchRef = useRef(null)
  const transientMarkupRef = useRef('')
  const previewFrameRef = useRef(0)
  const suppressCanvasClickRef = useRef(false)

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

  useEffect(() => {
    if (activeTab !== 'preview' || !selectedId) {
      setSelectionBox(null)
      setMultiSelectionBoxes([])
      return undefined
    }
    const frame = requestAnimationFrame(() => {
      const stage = canvasRef.current
      const wrap = svgRef.current
      if (!stage || !wrap) {
        setSelectionBox(null)
        setMultiSelectionBoxes([])
        return
      }
      const stageRect = stage.getBoundingClientRect()
      const toBox = (id) => {
        const node = wrap.querySelector(`[data-editor-id="${id}"]`)
        const rect = node ? getVisibleNodeRect(wrap, node) : null
        return rect ? { id, left: rect.left - stageRect.left, top: rect.top - stageRect.top, width: rect.width, height: rect.height } : null
      }
      setSelectionBox(toBox(selectedId))
      setMultiSelectionBoxes(selectedIds.filter((id) => id !== selectedId).map(toBox).filter(Boolean))
    })
    return () => cancelAnimationFrame(frame)
  }, [activeTab, selectedId, selectedIds, svgMarkup, transientMarkup, svgPosition.x, svgPosition.y, svgScale])

  const zoomBy = (factor) => setSvgScale((current) => clampScale(current * factor))

  const fitToScreen = () => {
    const stage = canvasRef.current
    const svg = svgRef.current?.querySelector('svg')
    if (!stage || !svg) return
    const rect = svg.getBoundingClientRect()
    const naturalWidth = rect.width / svgScale
    const naturalHeight = rect.height / svgScale
    if (!naturalWidth || !naturalHeight) return
    const nextScale = clampScale(Math.min((stage.clientWidth - 48) / naturalWidth, (stage.clientHeight - 48) / naturalHeight))
    setSvgScale(nextScale)
    setSvgPosition({ x: 0, y: 0 })
  }

  const getElementSvgBounds = (id) => {
    const node = svgRef.current?.querySelector(`[data-editor-id="${id}"]`)
    if (!node) return null
    const rect = node.getBoundingClientRect()
    if (!rect.width && !rect.height) return null
    const topLeft = getSvgPoint(svgRef.current, rect.left, rect.top)
    const bottomRight = getSvgPoint(svgRef.current, rect.right, rect.bottom)
    const minX = Math.min(topLeft.x, bottomRight.x)
    const minY = Math.min(topLeft.y, bottomRight.y)
    const maxX = Math.max(topLeft.x, bottomRight.x)
    const maxY = Math.max(topLeft.y, bottomRight.y)
    return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 }
  }

  const selectElementAtPoint = (clientX, clientY, fallbackTarget, additive = false) => {
    const pointTarget = document.elementFromPoint(clientX, clientY)
    const target = pointTarget?.closest?.('[data-editor-id]') || fallbackTarget?.closest?.('[data-editor-id]')
    const targetId = target?.getAttribute('data-editor-id')
    if (!targetId) return ''
    if (additive) {
      const nextIds = selectedIds.includes(targetId) ? selectedIds.filter((id) => id !== targetId) : [...selectedIds, targetId]
      selectLayerIds(nextIds, targetId)
    } else if (!selectedIds.includes(targetId)) {
      selectLayerIds([targetId], targetId)
    }
    return targetId
  }

  const handleCanvasClick = (event) => {
    if (suppressCanvasClickRef.current) {
      suppressCanvasClickRef.current = false
      return
    }
    if (event.target?.closest?.('[data-editor-id]')) return
    const targetId = selectElementAtPoint(event.clientX, event.clientY, event.target, event.metaKey || event.ctrlKey)
    if (!targetId && !event.metaKey && !event.ctrlKey) selectLayerIds([])
  }

  const handleSvgDoubleClick = (event, setTextDraft, setEditingTextId) => {
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

    svgDragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, origin: svgPosition, moved: false }
    elementDragRef.current = null
    setIsDraggingElement(false)
    setIsDraggingSvg(true)
  }

  const handleCanvasPointerMove = (event) => {
    const hoveredId = event.target?.closest?.('[data-editor-id]')?.getAttribute('data-editor-id') || ''
    setHoveredLayerId((current) => current === hoveredId ? current : hoveredId)
    if (activePointersRef.current.has(event.pointerId)) activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

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
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) <= 3) return
    drag.moved = true
    setSvgPosition({ x: drag.origin.x + event.clientX - drag.startX, y: drag.origin.y + event.clientY - drag.startY })
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
      if (elementDrag.moved) suppressCanvasClickRef.current = true
      if (cancelled || !elementDrag.moved) clearTransientMarkup()
      else {
        clearTransientMarkup()
        commitDocument(elementDrag.previewMarkup, { nextSelectedId: elementDrag.selectionIds[0], nextSelectedIds: elementDrag.selectionIds, historySnapshot: elementDrag.baseSnapshot, forceHistory: true })
      }
      elementDragRef.current = null
      setIsDraggingElement(false)
    }
    if (svgDragRef.current?.moved) suppressCanvasClickRef.current = true
    svgDragRef.current = null
    setIsDraggingSvg(false)
  }

  const handleResizePointerDown = (event, handle) => {
    if (!selectionBox || !selected || resizeRef.current) return
    event.preventDefault()
    event.stopPropagation()
    const target = svgRef.current?.querySelector(`[data-editor-id="${selected.id}"]`)
    const baseBox = target ? getVisibleNodeRect(svgRef.current, target) : null
    if (!target || (selected.tag !== 'line' && (!baseBox?.width || !baseBox?.height))) return
    const pointerId = event.pointerId ?? 'mouse'
    if (event.pointerId != null && event.currentTarget.setPointerCapture) event.currentTarget.setPointerCapture(event.pointerId)
    const lineX1 = Number(target.getAttribute('x1')) || 0
    const lineX2 = Number(target.getAttribute('x2')) || 0
    resizeRef.current = {
      pointerId, targetId: selected.id, handle, kind: selected.tag === 'line' ? 'line' : 'shape',
      lineEndpoint: selected.tag === 'line' ? (handle === 'line-start' ? (lineX1 <= lineX2 ? 'x1' : 'x2') : (lineX1 <= lineX2 ? 'x2' : 'x1')) : '',
      baseBox, baseMarkup: svgMarkup, baseSnapshot: currentSnapshot(), baseTransform: target.getAttribute('transform') || '', previewMarkup: svgMarkup, moved: false,
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
      const endpointUpdates = resize.lineEndpoint === 'x1' ? { x1: point.x.toFixed(2), y1: point.y.toFixed(2) } : { x2: point.x.toFixed(2), y2: point.y.toFixed(2) }
      const nextMarkup = updateElementAttributes(resize.baseMarkup, resize.targetId, endpointUpdates)
      resize.previewMarkup = nextMarkup
      resize.moved = true
      updateTransientMarkup(nextMarkup)
      return
    }
    const { baseBox } = resize
    const minSize = 8
    const anchor = resize.handle === 'top-left' ? { x: baseBox.right, y: baseBox.bottom } : { x: baseBox.left, y: baseBox.top }
    const width = resize.handle === 'top-left' ? anchor.x - Math.min(event.clientX, anchor.x - minSize) : Math.max(event.clientX, anchor.x + minSize) - anchor.x
    const height = resize.handle === 'top-left' ? anchor.y - Math.min(event.clientY, anchor.y - minSize) : Math.max(event.clientY, anchor.y + minSize) - anchor.y
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
    suppressCanvasClickRef.current = true
    if (cancelled) clearTransientMarkup()
    else if (resize.moved) {
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

  return {
    canvasRef, svgRef, svgPosition, setSvgPosition, svgScale, setSvgScale,
    isDraggingSvg, isDraggingElement, isResizingElement, isPinchingSvg,
    selectionBox, setSelectionBox, multiSelectionBoxes, hoveredLayerId, setHoveredLayerId,
    transientMarkup, updateTransientMarkup, clearTransientMarkup, zoomBy, fitToScreen, getElementSvgBounds,
    handleCanvasClick, handleSvgDoubleClick, handleCanvasPointerDown, handleCanvasPointerMove, handleCanvasPointerUp,
    handleResizePointerDown, handleResizePointerMove, handleResizePointerUp, suppressCanvasClickRef,
  }
}
