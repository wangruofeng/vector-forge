import Icon from './Icon.jsx'
import { highlightSelectedMarkup } from '../editor/svg-transforms.js'

export default function CanvasPanel(props) {
  const { copy, activeTab, setActiveTab, formatSource, selectedIds, alignSelection, zoomBy, fitToScreen, svgScale, setSvgScale, setSvgPosition, canvasRef, handleCanvasClick, handleSvgDoubleClick, openContextMenu, handleCanvasPointerDown, handleCanvasPointerMove, handleCanvasPointerUp, hoveredLayerId, setHoveredLayerId, elements, isDraggingSvg, isDraggingElement, isPinchingSvg, svgRef, svgPosition, renderedMarkup, editingTextId, selectedId, selected, selectionBox, textEditRef, textDraft, setTextDraft, commitTextEdit, cancelTextEdit, language, selectionGroupBox, multiSelectionBoxes, isResizingElement, handleResizePointerMove, handleResizePointerUp, handleResizePointerDown, sourceHighlightRef, highlightedSource, sourceDraft, setSourceDraft, syncSourceScroll, commitDocument, showToast, loadDemo, toast, toastTimerRef, selectedDisplayName, setToast } = props
  return (
        <section className="canvas-panel">
          <div className="canvas-toolbar">
            <div className="view-tabs"><button className={activeTab === 'preview' ? 'active' : ''} onClick={() => setActiveTab('preview')}><Icon name="eye" size={14} /> {copy.preview}</button><button className={activeTab === 'source' ? 'active' : ''} onClick={() => setActiveTab('source')}><Icon name="code" size={14} /> {copy.source}</button></div>
            <div className="canvas-tools">{activeTab === 'source' ? <button className="tool-button" type="button" title={copy.format} onClick={formatSource}><Icon name="code" size={15} /> {copy.format}</button> : <>{selectedIds.length >= 2 && <span className="align-group"><button className="mini-button" type="button" title={copy.alignLeft} aria-label={copy.alignLeft} onClick={() => alignSelection('left')}><Icon name="alignLeft" size={14} /></button><button className="mini-button" type="button" title={copy.alignCenterX} aria-label={copy.alignCenterX} onClick={() => alignSelection('center-x')}><Icon name="alignCenterX" size={14} /></button><button className="mini-button" type="button" title={copy.alignRight} aria-label={copy.alignRight} onClick={() => alignSelection('right')}><Icon name="alignRight" size={14} /></button><button className="mini-button" type="button" title={copy.alignTop} aria-label={copy.alignTop} onClick={() => alignSelection('top')}><Icon name="alignTop" size={14} /></button><button className="mini-button" type="button" title={copy.alignCenterY} aria-label={copy.alignCenterY} onClick={() => alignSelection('center-y')}><Icon name="alignCenterY" size={14} /></button><button className="mini-button" type="button" title={copy.alignBottom} aria-label={copy.alignBottom} onClick={() => alignSelection('bottom')}><Icon name="alignBottom" size={14} /></button><button className="mini-button" type="button" title={copy.distributeX} aria-label={copy.distributeX} disabled={selectedIds.length < 3} onClick={() => alignSelection('distribute-x')}><Icon name="distributeX" size={14} /></button><button className="mini-button" type="button" title={copy.distributeY} aria-label={copy.distributeY} disabled={selectedIds.length < 3} onClick={() => alignSelection('distribute-y')}><Icon name="distributeY" size={14} /></button></span>}<button className="icon-button" type="button" title={`${copy.zoomOut} (⌘-)`} aria-label={copy.zoomOut} onClick={() => zoomBy(0.8)}><Icon name="minus" size={14} /></button><button className="icon-button" type="button" title={`${copy.zoomIn} (⌘=)`} aria-label={copy.zoomIn} onClick={() => zoomBy(1.25)}><Icon name="plus" size={14} /></button><button className="icon-button" type="button" title={`${copy.zoomFit} (⌘0)`} aria-label={copy.zoomFit} onClick={fitToScreen}><Icon name="fit" size={14} /></button><button className="zoom-readout" type="button" title={copy.resetView} onClick={() => { setSvgScale(1); setSvgPosition({ x: 0, y: 0 }) }}>{Math.round(svgScale * 100)}%</button></>}</div>
          </div>
          {activeTab === 'preview' ? (
            <div ref={canvasRef} className="canvas-stage" onClick={handleCanvasClick} onDoubleClick={handleSvgDoubleClick} onContextMenu={(event) => { const target = event.target?.closest?.('[data-editor-id]'); if (target) openContextMenu(event, target.getAttribute('data-editor-id')) }} onPointerDown={handleCanvasPointerDown} onPointerMove={handleCanvasPointerMove} onPointerUp={handleCanvasPointerUp} onPointerCancel={(event) => handleCanvasPointerUp(event, true)} onPointerLeave={() => setHoveredLayerId('')}>
              {elements.length === 0 && <div className="drop-hint"><span className="drop-icon"><Icon name="upload" size={15} /></span><span>{copy.dropHint}</span></div>}
              <div
                className={`svg-wrap ${isDraggingSvg || isDraggingElement ? 'is-dragging' : ''} ${isDraggingElement ? 'is-dragging-element' : ''} ${isPinchingSvg ? 'is-pinching' : ''}`}
                ref={svgRef}
                style={{ '--svg-x': `${svgPosition.x}px`, '--svg-y': `${svgPosition.y}px`, '--svg-scale': svgScale }}
                dangerouslySetInnerHTML={{ __html: highlightSelectedMarkup(renderedMarkup, selectedIds) }}
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
            <div className="source-editor-wrap">
              <pre ref={sourceHighlightRef} className="source-highlight" aria-hidden="true" dangerouslySetInnerHTML={{ __html: highlightedSource }} />
              <textarea className="source-editor" value={sourceDraft} onChange={(event) => setSourceDraft(event.target.value)} onScroll={syncSourceScroll} onBlur={() => { if (!sourceDraft.trim()) return; try { commitDocument(sourceDraft, { nextSelectedId: selectedId }) } catch { showToast(copy.invalidSvg, 'error') } }} spellCheck="false" />
              {!sourceDraft.trim() && <div className="source-empty-state"><p>{copy.invalidSvg}</p><button className="button button-accent" type="button" onClick={loadDemo}>{copy.loadDemo}</button></div>}
            </div>
          )}
          {toast && <div key={toast.id} className={`toast ${toast.kind}`} role={toast.kind === 'error' ? 'alert' : 'status'}><Icon name={toast.kind === 'error' ? 'x' : 'check'} size={15} /><span>{toast.message}</span><button type="button" className="toast-close" aria-label={copy.close} onClick={() => { if (toastTimerRef.current) { window.clearTimeout(toastTimerRef.current); toastTimerRef.current = 0 } setToast(null) }}><Icon name="x" size={13} /></button></div>}
          <div className="canvas-status"><span><span className="live-dot" /> {copy.livePreview}</span><span>{elements.length} {copy.statusReady}</span><span className="status-path">{selected ? `${copy.selected}: ${selectedDisplayName}` : copy.noSelection}</span></div>
        </section>

  )
}
