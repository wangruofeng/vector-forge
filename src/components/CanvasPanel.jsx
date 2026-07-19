import Icon from './Icon.jsx'
import { highlightSelectedMarkup, highlightSvgSource } from '../editor/svg-transforms.js'
import { getElementAndDescendantIds } from '../editor/svg-parser.js'

function getSourceRows(source, elements, expandedGroups) {
  const lines = source.split('\n')
  const elementById = new Map(elements.map((item) => [item.id, item]))
  const stack = []
  const rows = []
  const tagPattern = /<\/?([A-Za-z_][\w:.-]*)\b[^>]*>/g

  lines.forEach((line, lineIndex) => {
    const idMatch = line.match(/data-editor-id=["']([^"']+)["']/)
    const item = idMatch ? elementById.get(idMatch[1]) : null
    const tags = [...line.matchAll(tagPattern)]
    const closingTag = line.trim().startsWith('</')
    if (closingTag) stack.pop()
    const hidden = stack.some((id) => expandedGroups[id] === false)
    if (!hidden) rows.push({ type: 'line', line, lineIndex, item })
    if (item?.tag === 'g' && !line.trim().endsWith('/>') && !closingTag) {
      stack.push(item.id)
      if (expandedGroups[item.id] === false) rows.push({ type: 'fold', lineIndex, item })
    } else if (tags.some((match) => !line.slice(match.index).startsWith('</')) && !line.trim().endsWith('/>') && !item) {
      stack.push('non-editable')
    }
    if (closingTag && stack[stack.length - 1] === 'non-editable') stack.pop()
  })
  return rows
}

export default function CanvasPanel(props) {
  const { copy, activeTab, setActiveTab, formatSource, sourceDisplayMode, setSourceDisplayMode, expandedGroups, toggleGroup, selectedIds, selectLayerIds, alignSelection, zoomBy, fitToScreen, svgScale, setSvgScale, setSvgPosition, canvasRef, handleCanvasClick, handleSvgDoubleClick, openContextMenu, handleCanvasPointerDown, handleCanvasPointerMove, handleCanvasPointerUp, hoveredLayerId, setHoveredLayerId, elements, isDraggingSvg, isDraggingElement, isPinchingSvg, svgRef, svgPosition, renderedMarkup, editingTextId, textEditStyle, selectedId, selected, selectionBox, textEditRef, textDraft, setTextDraft, commitTextEdit, cancelTextEdit, language, selectionGroupBox, multiSelectionBoxes, isResizingElement, handleResizePointerMove, handleResizePointerUp, handleResizePointerDown, sourceHighlightRef, highlightedSource, sourceDraft, setSourceDraft, syncSourceScroll, commitDocument, showToast, loadDemo, toast, toastTimerRef, selectedDisplayName, setToast } = props
  const sourceRows = getSourceRows(sourceDraft, elements, expandedGroups)
  const selectSourceItem = (item) => selectLayerIds(getElementAndDescendantIds(elements, item.id), item.id)
  const textAnchor = selected?.node?.getAttribute('text-anchor') || 'start'
  const textInlineStyle = {
    color: selected?.node?.getAttribute('fill') || '#15203A',
    fontFamily: selected?.node?.getAttribute('font-family') || 'Arial, sans-serif',
    fontSize: `${Math.max(12, selectionBox?.height || 16)}px`,
    fontStyle: selected?.node?.getAttribute('font-style') || 'normal',
    fontWeight: selected?.node?.getAttribute('font-weight') || '400',
    letterSpacing: selected?.node?.getAttribute('letter-spacing') || 'normal',
    textAlign: textAnchor === 'middle' ? 'center' : textAnchor === 'end' ? 'right' : 'left',
    ...textEditStyle,
  }
  return (
        <section className="canvas-panel">
          <div className="canvas-toolbar">
            <div className="view-tabs"><button className={activeTab === 'preview' ? 'active' : ''} onClick={() => setActiveTab('preview')}><Icon name="eye" size={14} /> {copy.preview}</button><button className={activeTab === 'source' ? 'active' : ''} onClick={() => setActiveTab('source')}><Icon name="code" size={14} /> {copy.source}</button></div>
            <div className="canvas-tools">{activeTab === 'source' ? <><button className="tool-button" type="button" title={copy.format} onClick={formatSource}><Icon name="code" size={15} /> {copy.format}</button>{sourceDisplayMode === 'tree' ? <button className="tool-button" type="button" onClick={() => setSourceDisplayMode('edit')}><Icon name="edit" size={14} /> {copy.editSource}</button> : null}</> : <>{selectedIds.length >= 2 && <span className="align-group"><button className="mini-button" type="button" title={copy.alignLeft} aria-label={copy.alignLeft} onClick={() => alignSelection('left')}><Icon name="alignLeft" size={14} /></button><button className="mini-button" type="button" title={copy.alignCenterX} aria-label={copy.alignCenterX} onClick={() => alignSelection('center-x')}><Icon name="alignCenterX" size={14} /></button><button className="mini-button" type="button" title={copy.alignRight} aria-label={copy.alignRight} onClick={() => alignSelection('right')}><Icon name="alignRight" size={14} /></button><button className="mini-button" type="button" title={copy.alignTop} aria-label={copy.alignTop} onClick={() => alignSelection('top')}><Icon name="alignTop" size={14} /></button><button className="mini-button" type="button" title={copy.alignCenterY} aria-label={copy.alignCenterY} onClick={() => alignSelection('center-y')}><Icon name="alignCenterY" size={14} /></button><button className="mini-button" type="button" title={copy.alignBottom} aria-label={copy.alignBottom} onClick={() => alignSelection('bottom')}><Icon name="alignBottom" size={14} /></button><button className="mini-button" type="button" title={copy.distributeX} aria-label={copy.distributeX} disabled={selectedIds.length < 3} onClick={() => alignSelection('distribute-x')}><Icon name="distributeX" size={14} /></button><button className="mini-button" type="button" title={copy.distributeY} aria-label={copy.distributeY} disabled={selectedIds.length < 3} onClick={() => alignSelection('distribute-y')}><Icon name="distributeY" size={14} /></button></span>}<button className="icon-button" type="button" title={`${copy.zoomOut} (⌘-)`} aria-label={copy.zoomOut} onClick={() => zoomBy(0.8)}><Icon name="minus" size={14} /></button><button className="icon-button" type="button" title={`${copy.zoomIn} (⌘=)`} aria-label={copy.zoomIn} onClick={() => zoomBy(1.25)}><Icon name="plus" size={14} /></button><button className="icon-button" type="button" title={`${copy.zoomFit} (⌘0)`} aria-label={copy.zoomFit} onClick={fitToScreen}><Icon name="fit" size={14} /></button><button className="zoom-readout" type="button" title={copy.resetView} onClick={() => { setSvgScale(1); setSvgPosition({ x: 0, y: 0 }) }}>{Math.round(svgScale * 100)}%</button></>}</div>
          </div>
          {activeTab === 'preview' ? (
            <div ref={canvasRef} className="canvas-stage" onClick={handleCanvasClick} onDoubleClick={handleSvgDoubleClick} onContextMenu={(event) => { const target = event.target?.closest?.('[data-editor-id]'); if (target) openContextMenu(event, target.getAttribute('data-editor-id')) }} onPointerDown={handleCanvasPointerDown} onPointerMove={handleCanvasPointerMove} onPointerUp={handleCanvasPointerUp} onPointerCancel={(event) => handleCanvasPointerUp(event, true)} onPointerLeave={() => setHoveredLayerId('')}>
              {elements.length === 0 && <div className="drop-hint"><span className="drop-icon"><Icon name="upload" size={15} /></span><span>{copy.dropHint}</span></div>}
              <div
                className={`svg-wrap ${isDraggingSvg || isDraggingElement ? 'is-dragging' : ''} ${isDraggingElement ? 'is-dragging-element' : ''} ${isPinchingSvg ? 'is-pinching' : ''}`}
                ref={svgRef}
                style={{ '--svg-x': `${svgPosition.x}px`, '--svg-y': `${svgPosition.y}px`, '--svg-scale': svgScale }}
                dangerouslySetInnerHTML={{ __html: highlightSelectedMarkup(renderedMarkup, selectedIds, editingTextId) }}
              />
              {editingTextId === selectedId && selected?.tag === 'text' && selectionBox && <div
                ref={textEditRef}
                className="text-inline-editor"
                style={{ ...textInlineStyle, left: selectionBox.left - 4, top: selectionBox.top - 4, width: Math.max(selectionBox.width + 8, 40), height: Math.max(selectionBox.height + 8, 28) }}
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-multiline="false"
                onInput={(event) => setTextDraft(event.currentTarget.textContent || '')}
                onKeyDown={(event) => {
                  event.stopPropagation()
                  if (event.key === 'Enter') { event.preventDefault(); commitTextEdit(event.currentTarget.textContent || '') }
                  if (event.key === 'Escape') { event.preventDefault(); cancelTextEdit() }
                }}
                onBlur={(event) => commitTextEdit(event.currentTarget.textContent || '')}
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                aria-label={copy.editText}
              />}
              {selectionGroupBox && <div className="selection-overlay selection-overlay-group" style={{ left: selectionGroupBox.left, top: selectionGroupBox.top, width: selectionGroupBox.right - selectionGroupBox.left, height: selectionGroupBox.bottom - selectionGroupBox.top }} />}
              {selectedIds.length > 1 && selectionBox && <div className="selection-overlay selection-overlay-multi selection-overlay-primary" style={{ left: selectionBox.left, top: selectionBox.top, width: selectionBox.width, height: selectionBox.height }} />}
              {selectedIds.length > 1 && multiSelectionBoxes.map((box) => <div key={box.id} className="selection-overlay selection-overlay-multi" style={{ left: box.left, top: box.top, width: box.width, height: box.height }} />)}
              {selectedIds.length <= 1 && selectionBox && selected && <div className={`selection-overlay ${isResizingElement ? 'is-resizing' : ''} ${hoveredLayerId === selected.id ? 'is-hovered' : ''}`} style={{ left: selectionBox.left, top: selectionBox.top, width: selectionBox.width, height: selectionBox.height }} onPointerMove={handleResizePointerMove} onPointerUp={handleResizePointerUp} onPointerCancel={(event) => handleResizePointerUp(event, true)}>
                {selected.tag === 'line' ? <><button className="resize-handle resize-handle-line-start" type="button" aria-label={copy.resizeLineStart} title={copy.resizeLineStart} onPointerDown={(event) => handleResizePointerDown(event, 'line-start')} onMouseDown={(event) => handleResizePointerDown(event, 'line-start')} onPointerMove={handleResizePointerMove} onPointerUp={handleResizePointerUp} onPointerCancel={(event) => handleResizePointerUp(event, true)} /><button className="resize-handle resize-handle-line-end" type="button" aria-label={copy.resizeLineEnd} title={copy.resizeLineEnd} onPointerDown={(event) => handleResizePointerDown(event, 'line-end')} onMouseDown={(event) => handleResizePointerDown(event, 'line-end')} onPointerMove={handleResizePointerMove} onPointerUp={handleResizePointerUp} onPointerCancel={(event) => handleResizePointerUp(event, true)} /></> : <><button className="resize-handle resize-handle-top-left" type="button" aria-label={copy.resizeTopLeft} title={copy.resizeTopLeft} onPointerDown={(event) => handleResizePointerDown(event, 'top-left')} onMouseDown={(event) => handleResizePointerDown(event, 'top-left')} onPointerMove={handleResizePointerMove} onPointerUp={handleResizePointerUp} onPointerCancel={(event) => handleResizePointerUp(event, true)} /><button className="resize-handle resize-handle-bottom-right" type="button" aria-label={copy.resizeBottomRight} title={copy.resizeBottomRight} onPointerDown={(event) => handleResizePointerDown(event, 'bottom-right')} onMouseDown={(event) => handleResizePointerDown(event, 'bottom-right')} onPointerMove={handleResizePointerMove} onPointerUp={handleResizePointerUp} onPointerCancel={(event) => handleResizePointerUp(event, true)} /></>}
                <span className="selection-size-label">{Math.round(selectionBox.width)} × {Math.round(selectionBox.height)}</span>
              </div>}
            </div>
          ) : (
            <div className={`source-editor-wrap ${sourceDisplayMode === 'tree' ? 'source-tree-mode' : ''}`}>
              {sourceDisplayMode === 'tree' ? <div className="source-tree" role="tree" aria-label={copy.sourceTree}>
                {sourceRows.map((row) => row.type === 'fold' ? <div key={`fold-${row.lineIndex}`} className="source-fold-row"><span className="source-line-number">…</span><span>{copy.collapsedContent}</span></div> : <div key={row.lineIndex} className={`source-code-row ${row.item && selectedIds.includes(row.item.id) ? 'selected' : ''}`} role={row.item ? 'treeitem' : undefined} onClick={() => row.item && selectSourceItem(row.item)}>
                  <span className="source-line-number">{row.lineIndex + 1}</span><button className="source-fold-button" type="button" tabIndex={row.item?.tag === 'g' ? 0 : -1} aria-label={row.item?.tag === 'g' ? (expandedGroups[row.item.id] === false ? copy.expandGroup : copy.collapseGroup) : undefined} onClick={(event) => { if (!row.item || row.item.tag !== 'g') return; event.stopPropagation(); toggleGroup(row.item, event) }}>{row.item?.tag === 'g' ? <Icon name="chevron" size={12} /> : null}</button><code dangerouslySetInnerHTML={{ __html: highlightSvgSource(row.line) }} />
                </div>)}
              </div> : <><pre ref={sourceHighlightRef} className="source-highlight" aria-hidden="true" dangerouslySetInnerHTML={{ __html: highlightedSource }} /><textarea className="source-editor" value={sourceDraft} onChange={(event) => setSourceDraft(event.target.value)} onScroll={syncSourceScroll} onBlur={() => { if (!sourceDraft.trim()) return; try { commitDocument(sourceDraft, { nextSelectedId: selectedId }); setSourceDisplayMode('tree') } catch { showToast(copy.invalidSvg, 'error') } }} spellCheck="false" /></>}
              {!sourceDraft.trim() && <div className="source-empty-state"><p>{copy.invalidSvg}</p><button className="button button-accent" type="button" onClick={loadDemo}>{copy.loadDemo}</button></div>}
            </div>
          )}
          {toast && <div key={toast.id} className={`toast ${toast.kind}`} role={toast.kind === 'error' ? 'alert' : 'status'}><Icon name={toast.kind === 'error' ? 'x' : 'check'} size={15} /><span>{toast.message}</span><button type="button" className="toast-close" aria-label={copy.close} onClick={() => { if (toastTimerRef.current) { window.clearTimeout(toastTimerRef.current); toastTimerRef.current = 0 } setToast(null) }}><Icon name="x" size={13} /></button></div>}
          <div className="canvas-status"><span><span className="live-dot" /> {copy.livePreview}</span><span>{elements.length} {copy.statusReady}</span><span className="status-path">{selected ? `${copy.selected}: ${selectedDisplayName}` : copy.noSelection}</span></div>
        </section>

  )
}
