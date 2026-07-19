import Icon from './Icon.jsx'
import { getTagDisplayName } from '../app/copy.js'

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

export default function InspectorPanel(props) {
  const { copy, language, isInspectorOpen, setIsInspectorOpen, selected, selectedDisplayName, textFieldDraft, setTextFieldDraft, commitTextField, setTextDraft, setEditingTextId, textFontSize, textLetterSpacing, textFontFamily, previewAttributeDebounced, commitPreviewAttributes, handleTextAttributeKeyDown, rectWidthValue, rectHeightValue, fill, stroke, opacity, strokeWidth, cornerRadiusMax, cornerRadius, previewRectRadius, elements } = props
  return (
        <aside className={`inspector-panel panel ${isInspectorOpen ? '' : 'is-collapsed'}`}>
          <div className="panel-header inspector-header"><div className="panel-title"><span>{copy.inspector}</span></div><button className="mini-button inspector-toggle" type="button" title={isInspectorOpen ? copy.collapseInspector : copy.expandInspector} aria-label={isInspectorOpen ? copy.collapseInspector : copy.expandInspector} aria-expanded={isInspectorOpen} onClick={() => setIsInspectorOpen((current) => !current)}><Icon name="sidebar" size={14} /></button></div>
          <div className="inspector-content">{selected ? <>
            <div className="selection-summary"><div className={`selection-icon tag-${selected.tag}`}>{selected.tag.slice(0, 2).toUpperCase()}</div><div className="selection-meta"><strong>{selectedDisplayName}</strong><span>{getTagDisplayName(selected.tag, language)} {copy.elementSuffix}</span></div><span className="selection-check"><Icon name="check" size={13} /></span></div>
            <div className="inspector-section"><div className="section-label">{copy.appearance}</div>
              {selected.tag === 'text' && <>
                <div className="text-content-field"><label htmlFor="text-content-input">{copy.textContent}</label><div className="text-content-control"><textarea id="text-content-input" rows="3" value={textFieldDraft} onChange={(event) => setTextFieldDraft(event.target.value)} onBlur={commitTextField} onKeyDown={(event) => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); event.currentTarget.blur() } }} aria-label={copy.editText} /><button type="button" onClick={() => { setTextDraft(textFieldDraft); setEditingTextId(selected.id) }} aria-label={copy.editText} title={copy.editText}>↗</button></div></div>
                <div className="text-property-grid">
                  <NumericField id="text-font-size-input" label={copy.fontSize} value={textFontSize} min={0} step={1} suffix="px" onPreview={(value) => previewAttributeDebounced('font-size', value)} onCommit={commitPreviewAttributes} onKeyDown={handleTextAttributeKeyDown} />
                  <NumericField id="text-letter-spacing-input" label={copy.letterSpacing} value={textLetterSpacing} step={0.5} suffix="px" onPreview={(value) => previewAttributeDebounced('letter-spacing', value)} onCommit={commitPreviewAttributes} onKeyDown={handleTextAttributeKeyDown} />
                </div>
                <div className="text-property-field"><label htmlFor="text-font-family-input">{copy.fontFamily}</label><input id="text-font-family-input" className="text-property-input" list="text-font-family-options" placeholder={copy.fontFamilyPlaceholder} value={textFontFamily} onChange={(event) => previewAttributeDebounced('font-family', event.target.value)} onBlur={commitPreviewAttributes} onKeyDown={handleTextAttributeKeyDown} /><datalist id="text-font-family-options"><option value="Arial, sans-serif" /><option value="Georgia, serif" /><option value="Inter, sans-serif" /><option value="Manrope, sans-serif" /><option value="monospace" /></datalist></div>
              </>}
              {selected.tag === 'rect' && <div className="text-property-grid"><NumericField id="rect-width-input" label={copy.width} value={rectWidthValue} min={0} step={1} suffix="px" onPreview={(value) => previewAttributeDebounced('width', value)} onCommit={commitPreviewAttributes} /><NumericField id="rect-height-input" label={copy.height} value={rectHeightValue} min={0} step={1} suffix="px" onPreview={(value) => previewAttributeDebounced('height', value)} onCommit={commitPreviewAttributes} /></div>}
              <ColorField label={copy.fill} value={fill} onPreview={(value) => previewAttributeDebounced('fill', value)} onCommit={commitPreviewAttributes} />
              <ColorField label={copy.stroke} value={stroke} onPreview={(value) => previewAttributeDebounced('stroke', value)} onCommit={commitPreviewAttributes} />
              <div className="field-row"><label>{copy.opacity}</label><div className="range-wrap"><input type="range" min="0" max="1" step="0.01" value={opacity} style={{ '--range-progress': `${opacity * 100}%` }} onChange={(event) => previewAttributeDebounced('opacity', event.target.value)} onPointerUp={commitPreviewAttributes} onBlur={commitPreviewAttributes} /><span>{Math.round(opacity * 100)}%</span></div></div>
              <div className="field-row"><label>{copy.strokeWidth}</label><div className="range-wrap"><input type="range" min="0" max="24" step="1" value={strokeWidth} style={{ '--range-progress': `${strokeWidth / 24 * 100}%` }} onChange={(event) => previewAttributeDebounced('stroke-width', event.target.value)} onPointerUp={commitPreviewAttributes} onBlur={commitPreviewAttributes} /><span>{strokeWidth}px</span></div></div>
              {selected.tag === 'rect' && <div className="field-row"><label>{copy.cornerRadius}</label><div className="range-wrap"><input type="range" min="0" max={cornerRadiusMax} step="1" value={cornerRadius} style={{ '--range-progress': `${cornerRadiusMax ? cornerRadius / cornerRadiusMax * 100 : 0}%` }} onChange={(event) => previewRectRadius(event.target.value)} onPointerUp={commitPreviewAttributes} onBlur={commitPreviewAttributes} /><span>{cornerRadius}px</span></div></div>}
            </div>
            <div className="inspector-section"><div className="section-label">{copy.elementDetails}</div><div className="detail-grid"><div><span>{copy.layer}</span><strong>{String(elements.indexOf(selected) + 1).padStart(2, '0')} / {String(elements.length).padStart(2, '0')}</strong></div><div><span>{copy.visibility}</span><strong>{copy.visible}</strong></div></div></div>
          </> : <div className="empty-inspector">{copy.noSelection}</div>}</div>
          <div className="inspector-footer"><span><span className="kbd">⌘</span><span className="kbd">S</span> {copy.exportShort}</span><span className="footer-hint">{copy.changesInstant}</span></div>
        </aside>
  )
}
