import Icon from './Icon.jsx'
import { ADD_LAYER_TAGS, getLayerDisplayName, getTagDisplayName } from '../app/copy.js'
import { isElementHidden } from '../editor/svg-parser.js'

export default function LayerPanel(props) {
  const { copy, language, isLayersOpen, setIsLayersOpen, addLayerMenuOpen, setAddLayerMenuOpen, visibleLayerItems, selectedIds, selectLayerIds, layerRowRefs, draggingLayerId, dragOverLayerId, suppressLayerClickRef, handleLayerMouseDown, openContextMenu, startRename, toggleGroup, expandedGroups, renamingLayerId, renameInputRef, renameDraft, setRenameDraft, commitRename, toggleVisibility, addLayer } = props
  return (
        <aside className={`layers-panel panel ${isLayersOpen ? '' : 'is-collapsed'}`}>
          <div className="panel-header layers-header"><div className="panel-title"><Icon name="layers" /><span>{copy.layers}</span></div><button className="mini-button layers-toggle" type="button" title={isLayersOpen ? copy.collapseLayers : copy.expandLayers} aria-label={isLayersOpen ? copy.collapseLayers : copy.expandLayers} aria-expanded={isLayersOpen} onClick={() => setIsLayersOpen((current) => !current)}><Icon name="sidebar" size={14} /></button><button className="mini-button layers-add-button" type="button" title={copy.addLayer} aria-label={copy.addLayer} aria-expanded={addLayerMenuOpen} onClick={() => setAddLayerMenuOpen((current) => !current)}><Icon name="plus" size={14} /></button></div>
          {addLayerMenuOpen && <div className="add-layer-menu" role="menu">{ADD_LAYER_TAGS.map((tag) => <button key={tag} type="button" role="menuitem" onClick={() => addLayer(tag)}><span className={`layer-shape shape-${tag}`} /><span>{getTagDisplayName(tag, language)}</span></button>)}</div>}
          <div className="layer-list">
            {visibleLayerItems.map(({ item, index }) => {
              const hidden = isElementHidden(item.node)
              const displayName = getLayerDisplayName(item, language)
              const isGroup = item.tag === 'g'
              const isExpanded = expandedGroups[item.id] !== false
              return <div key={item.id} data-layer-id={item.id} ref={(node) => { if (node) layerRowRefs.current.set(item.id, node); else layerRowRefs.current.delete(item.id) }} className={`layer-row ${selectedIds.includes(item.id) ? 'selected' : ''} ${hidden ? 'hidden' : ''} ${draggingLayerId === item.id ? 'dragging' : ''} ${dragOverLayerId === item.id ? 'drag-over' : ''}`} style={{ paddingLeft: `${14 + item.depth * 15}px` }} role="button" tabIndex="0" onClick={(event) => { if (suppressLayerClickRef.current) { suppressLayerClickRef.current = false; return } if (event.metaKey || event.ctrlKey) { const nextIds = selectedIds.includes(item.id) ? selectedIds.filter((id) => id !== item.id) : [...selectedIds, item.id]; selectLayerIds(nextIds, item.id) } else selectLayerIds([item.id], item.id) }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') selectLayerIds([item.id], item.id) }} onMouseDown={(event) => handleLayerMouseDown(event, item)} onContextMenu={(event) => openContextMenu(event, item.id)} onDoubleClick={() => startRename(item.id)}>
                <span className="layer-chevron">{isGroup ? <button className={`layer-collapse-toggle ${isExpanded ? 'expanded' : 'collapsed'}`} type="button" title={isExpanded ? copy.collapseGroup : copy.expandGroup} aria-label={isExpanded ? copy.collapseGroup : copy.expandGroup} aria-expanded={isExpanded} onClick={(event) => toggleGroup(item, event)}><Icon name="chevron" size={13} /></button> : ''}</span>
                <span className={`layer-shape shape-${item.tag}`} />
                {renamingLayerId === item.id ? <input ref={renameInputRef} className="rename-input" value={renameDraft} placeholder={copy.renamePlaceholder} onChange={(event) => setRenameDraft(event.target.value)} onBlur={commitRename} onKeyDown={(event) => { event.stopPropagation(); if (event.key === 'Enter') { event.preventDefault(); commitRename() } if (event.key === 'Escape') { event.preventDefault(); setRenamingLayerId('') } }} onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()} /> : <span className="layer-name">{displayName}</span>}
                <span className="layer-index">{String(index + 1).padStart(2, '0')}</span>
                <button className={`layer-visibility ${hidden ? 'is-hidden' : ''}`} type="button" title={`${hidden ? copy.show : copy.hide} ${displayName}`} aria-label={`${hidden ? copy.show : copy.hide} ${displayName}`} aria-pressed={!hidden} onClick={(event) => toggleVisibility(item, event)}><Icon name="eye" size={14} /></button>
              </div>
            })}
          </div>
        </aside>

  )
}

