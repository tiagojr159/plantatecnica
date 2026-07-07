const appConfig = window.APP_CONFIG || {};

const state = {
    components: [],
    componentsById: new Map(),
    projects: [],
    items: [],
    selectedItemId: null,
    selectedItemIds: [],
    clipboardItems: [],
    dragState: null,
    skipNextWorkspaceClick: 0,
    minSizeM: 0.2,
    project: {
        id: null,
        name: '',
        createdAt: null,
        updatedAt: null,
        canvas: {
            widthM: Number(appConfig.defaultCanvasWidthM || 20),
            heightM: Number(appConfig.defaultCanvasHeightM || 8),
        },
        view: getDefaultView(),
    },
    scalePxPerMeter: Number(appConfig.scalePxPerMeter || 90),
    snapStepM: Number(appConfig.snapStepM || 0.1),
    zCounter: 1,
};

const elements = {};
const numberFormatter = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});
const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
});

document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    bindEvents();
    initializeApplication();
});

function cacheElements() {
    elements.catalog = document.getElementById('catalog');
    elements.projectList = document.getElementById('projectList');
    elements.workspace = document.getElementById('workspace');
    elements.projectName = document.getElementById('projectName');
    elements.canvasWidthInput = document.getElementById('canvasWidthInput');
    elements.canvasHeightInput = document.getElementById('canvasHeightInput');
    elements.assembledWidth = document.getElementById('assembledWidth');
    elements.assembledHeight = document.getElementById('assembledHeight');
    elements.totalItems = document.getElementById('totalItems');
    elements.statusMessage = document.getElementById('statusMessage');
    elements.newProjectBtn = document.getElementById('newProjectBtn');
    elements.saveProjectBtn = document.getElementById('saveProjectBtn');
    elements.applyCanvasBtn = document.getElementById('applyCanvasBtn');
    elements.expandWidth10Btn = document.getElementById('expandWidth10Btn');
    elements.expandWidth25Btn = document.getElementById('expandWidth25Btn');
    elements.toggleDimensions = document.getElementById('toggleDimensions');
    elements.toggleNames = document.getElementById('toggleNames');
    elements.selectionEmpty = document.getElementById('selectionEmpty');
    elements.selectionForm = document.getElementById('selectionForm');
    elements.selectedName = document.getElementById('selectedName');
    elements.selectedWidth = document.getElementById('selectedWidth');
    elements.selectedHeight = document.getElementById('selectedHeight');
    elements.selectedX = document.getElementById('selectedX');
    elements.selectedY = document.getElementById('selectedY');
    elements.selectedRotation = document.getElementById('selectedRotation');
    elements.invertItemBtn = document.getElementById('invertItemBtn');
    elements.rotate30ItemBtn = document.getElementById('rotate30ItemBtn');
    elements.duplicateItemBtn = document.getElementById('duplicateItemBtn');
    elements.deleteItemBtn = document.getElementById('deleteItemBtn');
}

function bindEvents() {
    elements.catalog.addEventListener('dragstart', handleCatalogDragStart);
    elements.catalog.addEventListener('click', handleCatalogClick);
    elements.workspace.addEventListener('dragover', (event) => event.preventDefault());
    elements.workspace.addEventListener('drop', handleWorkspaceDrop);
    elements.workspace.addEventListener('pointerdown', handleWorkspacePointerDown);
    elements.workspace.addEventListener('click', handleWorkspaceClick);
    elements.projectList.addEventListener('click', handleProjectCardClick);
    elements.newProjectBtn.addEventListener('click', createNewProject);
    elements.saveProjectBtn.addEventListener('click', saveCurrentProject);
    elements.applyCanvasBtn.addEventListener('click', applyCanvasSizeFromInputs);
    elements.expandWidth10Btn.addEventListener('click', () => expandCanvasWidth(10));
    elements.expandWidth25Btn.addEventListener('click', () => expandCanvasWidth(25));
    elements.toggleDimensions.addEventListener('change', handleViewOptionsChange);
    elements.toggleNames.addEventListener('change', handleViewOptionsChange);
    elements.projectName.addEventListener('input', () => {
        state.project.name = elements.projectName.value.trim();
    });
    [elements.selectedWidth, elements.selectedHeight, elements.selectedX, elements.selectedY, elements.selectedRotation].forEach((input) => {
        input.addEventListener('input', () => updateSelectedItemFromInputs(false));
        input.addEventListener('change', () => updateSelectedItemFromInputs(true));
        input.addEventListener('blur', () => updateSelectedItemFromInputs(true));
    });
    elements.invertItemBtn.addEventListener('click', invertSelectedItem);
    elements.rotate30ItemBtn.addEventListener('click', () => rotateSelectedItemBy(30));
    elements.duplicateItemBtn.addEventListener('click', duplicateSelectedItem);
    elements.deleteItemBtn.addEventListener('click', deleteSelectedItem);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopDraggingItem);
    document.addEventListener('keydown', handleKeyboardShortcuts, true);
}

async function initializeApplication() {
    syncCanvasInputs();
    createNewProject(false);

    try {
        setStatus('Carregando componentes e projetos...', 'info');
        await Promise.all([loadComponents(), loadProjects()]);
        renderAll();

        if (state.components.length === 0) {
            setStatus('Nenhuma imagem foi encontrada em images. Adicione componentes nessa pasta.', 'warning');
            return;
        }

        setStatus('Tudo pronto. Arraste ou clique nos componentes para montar a planta.', 'success');
        const pendingProject = new URLSearchParams(window.location.search).get('project');
        if (pendingProject) {
            openSavedProject(pendingProject);
        }
    } catch (error) {
        console.error(error);
        setStatus(error.message || 'Nao foi possivel inicializar a aplicacao.', 'error');
    }
}

function createNewProject(showStatus = true) {
    state.project = {
        id: null,
        name: '',
        createdAt: null,
        updatedAt: null,
        canvas: {
            widthM: Number(appConfig.defaultCanvasWidthM || 20),
            heightM: Number(appConfig.defaultCanvasHeightM || 8),
        },
        view: getDefaultView(),
    };
    state.items = [];
    state.selectedItemId = null;
    state.selectedItemIds = [];
    state.dragState = null;
    state.zCounter = 1;
    syncProjectInputs();
    renderWorkspace();
    renderSelection();
    renderProjects();
    updateMetrics();

    if (showStatus) {
        setStatus('Novo projeto criado. Defina a planta e comece a montar.', 'info');
    }
}

async function loadComponents() {
    const payload = await requestJson(buildApiUrl('components'));
    const components = Array.isArray(payload.components) ? payload.components : [];
    state.components = components.map((component) => ({
        id: String(component.id || ''),
        name: String(component.name || 'Componente'),
        image: versionedAssetUrl(String(component.image || '')),
        widthM: roundTo(Number(component.widthM || 1), 2),
        heightM: roundTo(Number(component.heightM || 1), 2),
        category: String(component.category || 'Outros'),
    }));
    state.componentsById = new Map(state.components.map((component) => [component.id, component]));
    renderCatalog();
}

async function loadProjects() {
    const payload = await requestJson(buildApiUrl('projects'));
    const projects = Array.isArray(payload.projects) ? payload.projects : [];
    state.projects = projects.filter((project) => String(project.editor || 'technical') !== 'terrain');
    renderProjects();
}

function renderAll() {
    renderCatalog();
    renderWorkspace();
    renderSelection();
    renderProjects();
    updateMetrics();
}

function renderCatalog() {
    elements.catalog.innerHTML = '';

    if (state.components.length === 0) {
        elements.catalog.innerHTML = '<div class="empty-state">Sem componentes no momento.</div>';
        return;
    }

    const fragment = document.createDocumentFragment();

    state.components.forEach((component) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'catalog-card';
        button.draggable = true;
        button.dataset.componentId = component.id;
        button.innerHTML = `
            <div class="catalog-thumb">
                <img src="${versionedAssetUrl(component.image)}" alt="${escapeHtml(component.name)}">
            </div>
            <div class="catalog-meta">
                <strong>${escapeHtml(component.name)}</strong>
                <span>${escapeHtml(component.category)}</span>
                <span>Largura: ${formatMeters(component.widthM)} | Altura: ${formatMeters(component.heightM)}</span>
                <span class="muted-note">Clique para inserir ou arraste para a planta.</span>
            </div>
        `;
        fragment.appendChild(button);
    });

    elements.catalog.appendChild(fragment);
}

function renderWorkspace() {
    const widthPx = Math.max(240, state.project.canvas.widthM * state.scalePxPerMeter);
    const heightPx = Math.max(260, state.project.canvas.heightM * state.scalePxPerMeter);
    elements.workspace.style.width = `${widthPx}px`;
    elements.workspace.style.height = `${heightPx}px`;
    elements.workspace.innerHTML = '';

    const showDimensions = Boolean(state.project.view && state.project.view.showDimensions);
    const showNames = Boolean(state.project.view && state.project.view.showNames);
    const bounds = calculateAssemblyBounds();
    if (showDimensions && bounds.widthM > 0 && bounds.heightM > 0) {
        elements.workspace.appendChild(createBoundsOverlay(bounds));
    }

    const sortedItems = [...state.items].sort((left, right) => left.zIndex - right.zIndex);
    const fragment = document.createDocumentFragment();

    sortedItems.forEach((item) => {
        const isSelected = isItemSelected(item.id);
        const isDragging = state.dragState && (state.dragState.itemId === item.id || (state.dragState.itemIds || []).includes(item.id));
        const node = document.createElement('div');
        node.className = `canvas-item${isSelected ? ' is-selected' : ''}${isDragging ? ' is-dragging' : ''}`;
        node.dataset.itemId = item.id;
        node.style.left = `${item.x * state.scalePxPerMeter}px`;
        node.style.bottom = `${item.y * state.scalePxPerMeter}px`;
        node.style.width = `${item.widthM * state.scalePxPerMeter}px`;
        node.style.height = `${item.heightM * state.scalePxPerMeter}px`;
        node.style.zIndex = String(item.zIndex);
        node.style.transform = `rotate(${item.rotationDeg || 0}deg)`;
        node.style.transformOrigin = 'center center';
        node.innerHTML =             `<img src="${versionedAssetUrl(item.image)}" alt="${escapeHtml(item.name)}"${item.flipX ? ' style="transform: scaleX(-1);"' : ''}>            ${showNames ? `<span class="item-title">${escapeHtml(item.name)}</span>` : ''}            ${showDimensions ? `<span class="dimension-badge dimension-badge--height">A ${formatMeters(item.heightM)}</span><span class="dimension-badge dimension-badge--width">L ${formatMeters(item.widthM)}</span>` : ''}            ${isSelected && getSelectedItems().length === 1 ? createCanvasControls() : ''}`;
        fragment.appendChild(node);
    });

    elements.workspace.appendChild(fragment);
    if (state.dragState && state.dragState.mode === 'marquee') {
        elements.workspace.appendChild(createMarqueeOverlay(state.dragState));
    }
    updateMetrics(bounds);
}

function createMarqueeOverlay(dragState) {
    const minX = Math.min(dragState.startX, dragState.currentX);
    const minY = Math.min(dragState.startY, dragState.currentY);
    const maxX = Math.max(dragState.startX, dragState.currentX);
    const maxY = Math.max(dragState.startY, dragState.currentY);
    const overlay = document.createElement('div');
    overlay.className = 'selection-marquee';
    overlay.style.left = `${minX * state.scalePxPerMeter}px`;
    overlay.style.bottom = `${minY * state.scalePxPerMeter}px`;
    overlay.style.width = `${Math.max(0, maxX - minX) * state.scalePxPerMeter}px`;
    overlay.style.height = `${Math.max(0, maxY - minY) * state.scalePxPerMeter}px`;
    return overlay;
}

function createCanvasControls() {
    return [
        'n',
        'e',
        's',
        'w',
    ].map((handle) => '<span class=\"canvas-resize-handle canvas-resize-handle--' + handle + '\" data-resize-handle=\"' + handle + '\"></span>').join('')
        + '<span class="canvas-resize-strip canvas-resize-strip--w" data-resize-handle="w"></span>'
        + '<span class="canvas-resize-strip canvas-resize-strip--e" data-resize-handle="e"></span>'
        + '<span class="canvas-rotate-link"></span>'
        + '<span class="canvas-rotate-handle" data-rotate-handle="true"></span>';
}

function createBoundsOverlay(bounds) {
    const overlay = document.createElement('div');
    overlay.className = 'structure-bounds';
    overlay.style.left = `${bounds.minX * state.scalePxPerMeter}px`;
    overlay.style.bottom = `${bounds.minY * state.scalePxPerMeter}px`;
    overlay.style.width = `${bounds.widthM * state.scalePxPerMeter}px`;
    overlay.style.height = `${bounds.heightM * state.scalePxPerMeter}px`;
    overlay.innerHTML = `
        <span class="structure-bounds__label">${formatMeters(bounds.widthM)}</span>
        <span class="structure-bounds__label--height">${formatMeters(bounds.heightM)}</span>
    `;
    return overlay;
}

function renderSelection() {
    const selectedItems = getSelectedItems();
    const item = selectedItems.length === 1 ? selectedItems[0] : null;
    const hasSelection = Boolean(item);
    elements.selectionEmpty.hidden = hasSelection;
    elements.selectionForm.hidden = !hasSelection;

    if (!item) {
        if (selectedItems.length > 1) {
            elements.selectionEmpty.textContent = `${selectedItems.length} pecas selecionadas. Arraste uma delas para mover o grupo, use Ctrl+C/Ctrl+V para copiar e colar, ou Delete para apagar.`;
        } else {
            elements.selectionEmpty.textContent = 'Selecione uma peca na planta para ajustar a posicao e duplicar ou remover.';
        }
        return;
    }

    elements.selectedName.value = item.name;
    elements.selectedWidth.value = item.widthM.toFixed(2).replace(/\.00$/, '');
    elements.selectedHeight.value = item.heightM.toFixed(2).replace(/\.00$/, '');
    elements.selectedX.value = item.x.toFixed(2).replace(/\.00$/, '');
    elements.selectedY.value = item.y.toFixed(2).replace(/\.00$/, '');
    elements.selectedRotation.value = String(item.rotationDeg || 0);
}

function renderProjects() {
    elements.projectList.innerHTML = '';

    if (state.projects.length === 0) {
        elements.projectList.innerHTML = '<div class="empty-state">Nenhum projeto salvo ainda.</div>';
        return;
    }

    const fragment = document.createDocumentFragment();

    state.projects.forEach((project) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `project-card${project.id === state.project.id ? ' is-active' : ''}`;
        button.dataset.projectId = String(project.id || '');

        const stats = project.stats || {};
        button.innerHTML = `
            <strong>${escapeHtml(String(project.name || 'Projeto sem nome'))}</strong>
            <span>${escapeHtml(formatProjectDate(project.updatedAt))}</span>
            <div class="project-card__meta">
                <span>${Number(project.itemCount || 0)} pecas</span>
                <span>L ${formatMeters(Number(stats.widthM || 0))}</span>
                <span>A ${formatMeters(Number(stats.heightM || 0))}</span>
            </div>
        `;
        fragment.appendChild(button);
    });

    elements.projectList.appendChild(fragment);
}

function updateMetrics(bounds = calculateAssemblyBounds()) {
    elements.assembledWidth.textContent = formatMeters(bounds.widthM || 0);
    elements.assembledHeight.textContent = formatMeters(bounds.heightM || 0);
    elements.totalItems.textContent = String(state.items.length);
}

function handleCatalogDragStart(event) {
    const card = event.target.closest('[data-component-id]');
    if (!card || !event.dataTransfer) {
        return;
    }

    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('text/plain', card.dataset.componentId || '');
}

function handleCatalogClick(event) {
    const card = event.target.closest('[data-component-id]');
    if (!card) {
        return;
    }

    const component = state.componentsById.get(card.dataset.componentId || '');
    if (!component) {
        return;
    }

    const offset = Math.min(state.items.length * 0.2, 1.2);
    addComponentToCanvas(component, 0.2 + offset, 0);
    setStatus(`Componente ${component.name} inserido na planta.`, 'success');
}

function handleWorkspaceDrop(event) {
    event.preventDefault();
    const componentId = event.dataTransfer ? event.dataTransfer.getData('text/plain') : '';
    const component = state.componentsById.get(componentId || '');
    if (!component) {
        return;
    }

    const dropPoint = convertPointerToCanvasPoint(event.clientX, event.clientY);
    const targetX = dropPoint.x - component.widthM / 2;
    const targetY = dropPoint.y - component.heightM / 2;
    addComponentToCanvas(component, targetX, targetY);
    setStatus(`Componente ${component.name} adicionado na planta.`, 'success');
}

function handleWorkspacePointerDown(event) {
    if (event.button !== 0) {
        return;
    }

    const itemNode = event.target.closest('[data-item-id]');
    if (!itemNode) {
        const pointerPoint = convertPointerToCanvasPoint(event.clientX, event.clientY, false);
        state.dragState = {
            mode: 'marquee',
            startX: pointerPoint.x,
            startY: pointerPoint.y,
            currentX: pointerPoint.x,
            currentY: pointerPoint.y,
            additive: event.shiftKey || event.ctrlKey || event.metaKey,
            initialIds: [...state.selectedItemIds],
        };
        state.skipNextWorkspaceClick = Date.now() + 250;
        renderWorkspace();
        event.preventDefault();
        return;
    }

    const item = state.items.find((entry) => entry.id === itemNode.dataset.itemId);
    if (!item) {
        return;
    }

    const resizeHandle = event.target.closest('[data-resize-handle]');
    const rotateHandle = event.target.closest('[data-rotate-handle]');
    const alreadySelected = isItemSelected(item.id);
    if ((resizeHandle || rotateHandle) && !alreadySelected) {
        selectOnly(item.id);
    }

    const selectedItemsForControl = getSelectedItems();
    if (resizeHandle && selectedItemsForControl.length === 1) {
        selectedItemsForControl[0].zIndex = ++state.zCounter;
        state.skipNextWorkspaceClick = Date.now() + 250;
        state.dragState = createResizeDragState(selectedItemsForControl[0], resizeHandle.dataset.resizeHandle || 'se');
        renderWorkspace();
        renderSelection();
        event.preventDefault();
        return;
    }

    if (rotateHandle && selectedItemsForControl.length === 1) {
        selectedItemsForControl[0].zIndex = ++state.zCounter;
        state.skipNextWorkspaceClick = Date.now() + 250;
        state.dragState = {
            mode: 'rotate',
            itemId: selectedItemsForControl[0].id,
        };
        renderWorkspace();
        renderSelection();
        event.preventDefault();
        return;
    }

    if (event.shiftKey || event.ctrlKey || event.metaKey) {
        toggleItemSelection(item.id);
        state.skipNextWorkspaceClick = Date.now() + 250;
        renderWorkspace();
        renderSelection();
        event.preventDefault();
        return;
    } else if (!alreadySelected) {
        selectOnly(item.id);
    }

    const selectedItems = getSelectedItems();
    selectedItems.forEach((selected) => { selected.zIndex = ++state.zCounter; });
    state.skipNextWorkspaceClick = Date.now() + 250;

    const pointerPoint = convertPointerToCanvasPoint(event.clientX, event.clientY);
    if (selectedItems.length > 1 && isItemSelected(item.id)) {
        state.dragState = {
            mode: 'group-move',
            itemIds: selectedItems.map((entry) => entry.id),
            startX: pointerPoint.x,
            startY: pointerPoint.y,
            originalItems: selectedItems.map((entry) => ({ id: entry.id, x: entry.x, y: entry.y })),
        };
    } else {
        state.dragState = {
            mode: 'move',
            itemId: item.id,
            offsetX: pointerPoint.x - item.x,
            offsetY: pointerPoint.y - item.y,
        };
    }
    renderWorkspace();
    renderSelection();
    event.preventDefault();
}

function handleWorkspaceClick(event) {
    if (state.skipNextWorkspaceClick && Date.now() <= state.skipNextWorkspaceClick) {
        state.skipNextWorkspaceClick = 0;
        return;
    }
    state.skipNextWorkspaceClick = 0;

    const itemNode = event.target.closest('[data-item-id]');
    if (!itemNode) {
        clearSelection();
        renderWorkspace();
        renderSelection();
        return;
    }

    if (event.shiftKey || event.ctrlKey || event.metaKey) {
        toggleItemSelection(itemNode.dataset.itemId || '');
    } else {
        selectOnly(itemNode.dataset.itemId || '');
    }
    const item = getSelectedItem();
    if (item) {
        item.zIndex = ++state.zCounter;
    }
    renderWorkspace();
    renderSelection();
}

function handlePointerMove(event) {
    if (!state.dragState) {
        return;
    }

    if (state.dragState.mode === 'marquee') {
        const pointerPoint = convertPointerToCanvasPoint(event.clientX, event.clientY, false);
        state.dragState.currentX = pointerPoint.x;
        state.dragState.currentY = pointerPoint.y;
        renderWorkspace();
        return;
    }

    if (state.dragState.mode === 'group-move') {
        applyGroupMoveFromPointer(event.clientX, event.clientY);
        renderWorkspace();
        renderSelection();
        return;
    }

    const item = state.items.find((entry) => entry.id === state.dragState.itemId);
    if (!item) {
        return;
    }

    if (state.dragState.mode === 'rotate') {
        applyItemRotationFromPointer(item, event.clientX, event.clientY);
    } else if (state.dragState.mode === 'resize') {
        applyItemResizeFromPointer(item, event.clientX, event.clientY);
    } else {
        const pointerPoint = convertPointerToCanvasPoint(event.clientX, event.clientY);
        const nextX = pointerPoint.x - state.dragState.offsetX;
        const nextY = pointerPoint.y - state.dragState.offsetY;
        const position = clampAndSnapItem(item, nextX, nextY, item.id);
        item.x = position.x;
        item.y = position.y;
    }
    renderWorkspace();
    renderSelection();
}

function stopDraggingItem() {
    if (!state.dragState) {
        return;
    }

    if (state.dragState.mode === 'marquee') {
        finishMarqueeSelection();
    }

    state.dragState = null;
    renderWorkspace();
    renderSelection();
}

function handleKeyboardShortcuts(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c' && getSelectedItems().length > 0) {
        event.preventDefault();
        copySelectedItems();
        return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v' && state.clipboardItems.length > 0) {
        event.preventDefault();
        pasteCopiedItems();
        return;
    }

    if (isEditableShortcutTarget(event.target)) {
        return;
    }

    if ((event.key === 'Delete' || event.key === 'Backspace') && getSelectedItems().length > 0) {
        event.preventDefault();
        deleteSelectedItem();
    }
}

function handleProjectCardClick(event) {
    const card = event.target.closest('[data-project-id]');
    if (!card) {
        return;
    }

    openSavedProject(card.dataset.projectId || '');
}

function addComponentToCanvas(component, rawX, rawY) {
    const item = createItemFromComponent(component);
    const position = clampAndSnapItem(item, rawX, rawY);
    item.x = position.x;
    item.y = position.y;
    item.zIndex = ++state.zCounter;
    state.items.push(item);
    selectOnly(item.id);
    renderWorkspace();
    renderSelection();
}

function createItemFromComponent(component) {
    const uniqueId = `item_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    return {
        id: uniqueId,
        componentId: component.id,
        name: component.name,
        image: component.image,
        widthM: roundTo(Number(component.widthM || 1), 2),
        heightM: roundTo(Number(component.heightM || 1), 2),
        x: 0,
        y: 0,
        rotationDeg: 0,
        flipX: false,
        zIndex: state.zCounter + 1,
    };
}

function clampAndSnapItem(item, rawX, rawY, ignoredItemId = '') {
    const maxX = Math.max(0, state.project.canvas.widthM - item.widthM);
    const maxY = Math.max(0, state.project.canvas.heightM - item.heightM);
    let x = clamp(rawX, 0, maxX);
    let y = clamp(rawY, 0, maxY);

    x = snapValue(x, state.snapStepM);
    y = snapValue(y, state.snapStepM);

    const snapped = snapAgainstNeighbors(item, x, y, ignoredItemId);
    x = clamp(snapValue(snapped.x, state.snapStepM), 0, maxX);
    y = clamp(snapValue(snapped.y, state.snapStepM), 0, maxY);

    return {
        x: roundTo(x, 2),
        y: roundTo(y, 2),
    };
}

function snapAgainstNeighbors(item, x, y, ignoredItemId = '') {
    const tolerance = 0.2;
    let bestX = x;
    let bestY = y;
    let bestXDistance = tolerance + 1;
    let bestYDistance = tolerance + 1;

    state.items.forEach((other) => {
        if (other.id === ignoredItemId) {
            return;
        }

        const xCandidates = [
            other.x,
            other.x + other.widthM,
            other.x - item.widthM,
            other.x + other.widthM - item.widthM,
        ];
        const yCandidates = [
            other.y,
            other.y + other.heightM,
            other.y - item.heightM,
            other.y + other.heightM - item.heightM,
        ];

        xCandidates.forEach((candidate) => {
            const distance = Math.abs(candidate - x);
            if (distance < bestXDistance && distance <= tolerance) {
                bestX = candidate;
                bestXDistance = distance;
            }
        });

        yCandidates.forEach((candidate) => {
            const distance = Math.abs(candidate - y);
            if (distance < bestYDistance && distance <= tolerance) {
                bestY = candidate;
                bestYDistance = distance;
            }
        });
    });

    return { x: bestX, y: bestY };
}

function calculateAssemblyBounds() {
    if (state.items.length === 0) {
        return {
            minX: 0,
            minY: 0,
            maxX: 0,
            maxY: 0,
            widthM: 0,
            heightM: 0,
        };
    }

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = 0;
    let maxY = 0;

    state.items.forEach((item) => {
        const extents = getRotatedItemExtents(item);
        minX = Math.min(minX, extents.minX);
        minY = Math.min(minY, extents.minY);
        maxX = Math.max(maxX, extents.maxX);
        maxY = Math.max(maxY, extents.maxY);
    });

    return {
        minX: roundTo(minX, 2),
        minY: roundTo(minY, 2),
        maxX: roundTo(maxX, 2),
        maxY: roundTo(maxY, 2),
        widthM: roundTo(Math.max(0, maxX - minX), 2),
        heightM: roundTo(Math.max(0, maxY - minY), 2),
    };
}

function getSelectedItem() {
    return state.items.find((item) => item.id === state.selectedItemId) || null;
}

function getSelectedItems() {
    const selectedIds = new Set(state.selectedItemIds || []);
    return state.items.filter((item) => selectedIds.has(item.id));
}

function isItemSelected(itemId) {
    return (state.selectedItemIds || []).includes(itemId);
}

function selectOnly(itemId) {
    if (!itemId) {
        clearSelection();
        return;
    }
    state.selectedItemId = itemId;
    state.selectedItemIds = [itemId];
}

function clearSelection() {
    state.selectedItemId = null;
    state.selectedItemIds = [];
}

function toggleItemSelection(itemId) {
    if (!itemId) {
        return;
    }
    const current = new Set(state.selectedItemIds || []);
    if (current.has(itemId)) {
        current.delete(itemId);
    } else {
        current.add(itemId);
    }
    state.selectedItemIds = [...current];
    state.selectedItemId = state.selectedItemIds[state.selectedItemIds.length - 1] || null;
}

function finishMarqueeSelection() {
    const dragState = state.dragState;
    const minX = Math.min(dragState.startX, dragState.currentX);
    const minY = Math.min(dragState.startY, dragState.currentY);
    const maxX = Math.max(dragState.startX, dragState.currentX);
    const maxY = Math.max(dragState.startY, dragState.currentY);
    const selectedIds = state.items
        .filter((item) => rectsIntersect(getRotatedItemExtents(item), { minX, minY, maxX, maxY }))
        .map((item) => item.id);

    const merged = dragState.additive ? [...new Set([...(dragState.initialIds || []), ...selectedIds])] : selectedIds;
    state.selectedItemIds = merged;
    state.selectedItemId = merged[merged.length - 1] || null;

    if (merged.length > 0) {
        setStatus(`${merged.length} peca${merged.length === 1 ? '' : 's'} selecionada${merged.length === 1 ? '' : 's'}.`, 'info');
    }
}

function rectsIntersect(first, second) {
    return first.minX <= second.maxX
        && first.maxX >= second.minX
        && first.minY <= second.maxY
        && first.maxY >= second.minY;
}

function applyGroupMoveFromPointer(clientX, clientY) {
    const dragState = state.dragState;
    const pointerPoint = convertPointerToCanvasPoint(clientX, clientY);
    const rawDeltaX = snapValue(pointerPoint.x - dragState.startX, state.snapStepM);
    const rawDeltaY = snapValue(pointerPoint.y - dragState.startY, state.snapStepM);
    const delta = clampGroupDelta(dragState.originalItems, rawDeltaX, rawDeltaY);

    dragState.originalItems.forEach((original) => {
        const item = state.items.find((entry) => entry.id === original.id);
        if (!item) {
            return;
        }
        item.x = roundTo(original.x + delta.x, 2);
        item.y = roundTo(original.y + delta.y, 2);
    });
}

function clampGroupDelta(originalItems, deltaX, deltaY) {
    let minDeltaX = Number.NEGATIVE_INFINITY;
    let minDeltaY = Number.NEGATIVE_INFINITY;
    let maxDeltaX = Number.POSITIVE_INFINITY;
    let maxDeltaY = Number.POSITIVE_INFINITY;

    originalItems.forEach((original) => {
        const item = state.items.find((entry) => entry.id === original.id);
        if (!item) {
            return;
        }
        minDeltaX = Math.max(minDeltaX, -original.x);
        minDeltaY = Math.max(minDeltaY, -original.y);
        maxDeltaX = Math.min(maxDeltaX, state.project.canvas.widthM - item.widthM - original.x);
        maxDeltaY = Math.min(maxDeltaY, state.project.canvas.heightM - item.heightM - original.y);
    });

    return {
        x: roundTo(clamp(deltaX, minDeltaX, maxDeltaX), 2),
        y: roundTo(clamp(deltaY, minDeltaY, maxDeltaY), 2),
    };
}

function copySelectedItems() {
    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) {
        return;
    }
    state.clipboardItems = selectedItems.map((item) => ({ ...item }));
    setStatus(`${selectedItems.length} peca${selectedItems.length === 1 ? '' : 's'} copiada${selectedItems.length === 1 ? '' : 's'}.`, 'success');
}

function pasteCopiedItems() {
    if (!state.clipboardItems.length) {
        return;
    }

    const bounds = calculateItemSetBounds(state.clipboardItems);
    const offset = 0.4;
    const pastedItems = state.clipboardItems.map((item) => {
        const duplicate = {
            ...item,
            id: `item_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
            x: roundTo(item.x + offset, 2),
            y: roundTo(item.y + offset, 2),
            zIndex: ++state.zCounter,
        };
        duplicate.x = clamp(duplicate.x, 0, Math.max(0, state.project.canvas.widthM - duplicate.widthM));
        duplicate.y = clamp(duplicate.y, 0, Math.max(0, state.project.canvas.heightM - duplicate.heightM));

        if (bounds.maxX + offset > state.project.canvas.widthM) {
            duplicate.x = roundTo(item.x - bounds.minX, 2);
        }
        if (bounds.maxY + offset > state.project.canvas.heightM) {
            duplicate.y = roundTo(item.y - bounds.minY, 2);
        }

        return duplicate;
    });

    state.items.push(...pastedItems);
    state.selectedItemIds = pastedItems.map((item) => item.id);
    state.selectedItemId = state.selectedItemIds[state.selectedItemIds.length - 1] || null;
    renderWorkspace();
    renderSelection();
    setStatus(`${pastedItems.length} peca${pastedItems.length === 1 ? '' : 's'} colada${pastedItems.length === 1 ? '' : 's'} na planta.`, 'success');
}

function calculateItemSetBounds(items) {
    if (!items.length) {
        return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }
    return items.reduce((bounds, item) => ({
        minX: Math.min(bounds.minX, item.x),
        minY: Math.min(bounds.minY, item.y),
        maxX: Math.max(bounds.maxX, item.x + item.widthM),
        maxY: Math.max(bounds.maxY, item.y + item.heightM),
    }), {
        minX: Number.POSITIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
    });
}

function updateSelectedItemFromInputs(syncInputs = true) {
    const item = getSelectedItem();
    if (!item) {
        return;
    }

    item.widthM = clamp(parsePositiveNumber(elements.selectedWidth.value, item.widthM), state.minSizeM, state.project.canvas.widthM);
    item.heightM = clamp(parsePositiveNumber(elements.selectedHeight.value, item.heightM), state.minSizeM, state.project.canvas.heightM);
    item.rotationDeg = normalizeRotation(parseFloat(elements.selectedRotation.value));

    const nextX = parseFloat(elements.selectedX.value);
    const nextY = parseFloat(elements.selectedY.value);
    const position = clampAndSnapItem(
        item,
        Number.isFinite(nextX) ? nextX : item.x,
        Number.isFinite(nextY) ? nextY : item.y,
        item.id,
    );

    item.x = position.x;
    item.y = position.y;
    renderWorkspace();
    if (syncInputs) {
        renderSelection();
    }
}

function duplicateSelectedItem() {
    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) {
        return;
    }

    const duplicates = selectedItems.map((item) => {
        const duplicate = {
            ...item,
            id: `item_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
            rotationDeg: item.rotationDeg || 0,
            zIndex: ++state.zCounter,
        };
        const position = clampAndSnapItem(duplicate, item.x + 0.3, item.y + 0.3);
        duplicate.x = position.x;
        duplicate.y = position.y;
        return duplicate;
    });

    state.items.push(...duplicates);
    state.selectedItemIds = duplicates.map((item) => item.id);
    state.selectedItemId = state.selectedItemIds[state.selectedItemIds.length - 1] || null;
    renderWorkspace();
    renderSelection();
    setStatus(`${duplicates.length} copia${duplicates.length === 1 ? '' : 's'} criada${duplicates.length === 1 ? '' : 's'}.`, 'success');
}

function invertSelectedItem() {
    const item = getSelectedItem();
    if (!item) {
        return;
    }
    item.flipX = !item.flipX;
    renderWorkspace();
    renderSelection();
    setStatus(`Peca ${item.flipX ? 'invertida' : 'desinvertida'} na horizontal.`, 'success');
}

function rotateSelectedItemBy(deltaDeg) {
    const item = getSelectedItem();
    if (!item) {
        return;
    }
    item.rotationDeg = normalizeRotation(Number(item.rotationDeg || 0) + Number(deltaDeg || 0));
    renderWorkspace();
    renderSelection();
    setStatus(`Peca girada para ${item.rotationDeg} graus.`, 'success');
}

function deleteSelectedItem() {
    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) {
        return;
    }

    const selectedIds = new Set(selectedItems.map((item) => item.id));
    state.items = state.items.filter((entry) => !selectedIds.has(entry.id));
    clearSelection();
    renderWorkspace();
    renderSelection();
    setStatus(`${selectedItems.length} peca${selectedItems.length === 1 ? '' : 's'} removida${selectedItems.length === 1 ? '' : 's'} da planta.`, 'info');
}

function applyCanvasSizeFromInputs() {
    const widthM = parsePositiveNumber(elements.canvasWidthInput.value, state.project.canvas.widthM);
    const heightM = parsePositiveNumber(elements.canvasHeightInput.value, state.project.canvas.heightM);

    state.project.canvas.widthM = widthM;
    state.project.canvas.heightM = heightM;
    state.items.forEach((item) => {
        const position = clampAndSnapItem(item, item.x, item.y, item.id);
        item.x = position.x;
        item.y = position.y;
    });
    syncCanvasInputs();
    renderWorkspace();
    renderSelection();
    setStatus('Dimensoes da planta atualizadas.', 'success');
}

function handleViewOptionsChange() {
    state.project.view = normalizeView({
        showDimensions: elements.toggleDimensions.checked,
        showNames: elements.toggleNames.checked,
    });
    renderWorkspace();
    setStatus('Opcoes de legenda atualizadas.', 'info');
}

function expandCanvasWidth(extraWidthM) {
    state.project.canvas.widthM = roundTo(state.project.canvas.widthM + extraWidthM, 2);
    syncCanvasInputs();
    renderWorkspace();
    renderSelection();

    const scrollContainer = elements.workspace.closest('.workspace-scroll');
    if (scrollContainer) {
        scrollContainer.scrollLeft = scrollContainer.scrollWidth;
    }

    setStatus(`Area horizontal ampliada para ${formatMeters(state.project.canvas.widthM)}.`, 'success');
}

async function saveCurrentProject() {
    try {
        setStatus('Salvando projeto em JSON...', 'info');
        const payload = {
            id: state.project.id,
            name: state.project.name || 'Projeto sem nome',
            createdAt: state.project.createdAt,
            canvas: {
                widthM: state.project.canvas.widthM,
                heightM: state.project.canvas.heightM,
            },
            view: {
                showDimensions: state.project.view.showDimensions,
                showNames: state.project.view.showNames,
            },
            items: state.items.map((item) => ({
                id: item.id,
                componentId: item.componentId,
                name: item.name,
                image: item.image,
                widthM: item.widthM,
                heightM: item.heightM,
                x: item.x,
                y: item.y,
                zIndex: item.zIndex,
                rotationDeg: item.rotationDeg || 0,
                flipX: Boolean(item.flipX),
            })),
        };

        const response = await requestJson(buildApiUrl('save_project'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const project = response.project || {};
        state.project.id = String(project.id || state.project.id || '');
        state.project.createdAt = String(project.createdAt || state.project.createdAt || '');
        state.project.updatedAt = String(project.updatedAt || '');
        state.project.name = String(project.name || state.project.name || 'Projeto sem nome');
        elements.projectName.value = state.project.name;
        await loadProjects();
        renderProjects();
        setStatus('Projeto salvo com sucesso. Voce pode reabrir e continuar editando quando quiser.', 'success');
    } catch (error) {
        console.error(error);
        setStatus(error.message || 'Nao foi possivel salvar o projeto.', 'error');
    }
}

async function openSavedProject(projectId) {
    if (!projectId) {
        return;
    }

    try {
        setStatus('Abrindo projeto salvo...', 'info');
        const payload = await requestJson(buildApiUrl('project', { id: projectId }));
        const project = payload.project || {};
        const canvas = project.canvas || {};
        const items = Array.isArray(project.items) ? project.items : [];

        state.project = {
            id: String(project.id || projectId),
            name: String(project.name || 'Projeto sem nome'),
            createdAt: String(project.createdAt || ''),
            updatedAt: String(project.updatedAt || ''),
            canvas: {
                widthM: parsePositiveNumber(canvas.widthM, Number(appConfig.defaultCanvasWidthM || 20)),
                heightM: parsePositiveNumber(canvas.heightM, Number(appConfig.defaultCanvasHeightM || 8)),
            },
            view: normalizeView(project.view),
        };
        state.items = items.map(sanitizeLoadedItem).filter(Boolean);
        state.items.forEach((item) => {
            const position = clampAndSnapItem(item, item.x, item.y, item.id);
            item.x = position.x;
            item.y = position.y;
        });
        state.selectedItemId = null;
        state.selectedItemIds = [];
        state.dragState = null;
        state.zCounter = state.items.reduce((highest, item) => Math.max(highest, item.zIndex || 1), 1);
        syncProjectInputs();
        renderWorkspace();
        renderSelection();
        renderProjects();
        setStatus(`Projeto ${state.project.name} carregado.`, 'success');
    } catch (error) {
        console.error(error);
        setStatus(error.message || 'Nao foi possivel abrir o projeto.', 'error');
    }
}

function sanitizeLoadedItem(item) {
    if (!item || typeof item !== 'object') {
        return null;
    }

    const widthM = roundTo(Number(item.widthM || 0), 2);
    const heightM = roundTo(Number(item.heightM || 0), 2);
    if (!(widthM > 0) || !(heightM > 0)) {
        return null;
    }

    return {
        id: String(item.id || `item_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`),
        componentId: String(item.componentId || ''),
        name: String(item.name || 'Componente'),
        image: versionedAssetUrl(String(item.image || '')),
        widthM,
        heightM,
        x: roundTo(Math.max(0, Number(item.x || 0)), 2),
        y: roundTo(Math.max(0, Number(item.y || 0)), 2),
        zIndex: Math.max(1, Number(item.zIndex || 1)),
        rotationDeg: normalizeRotation(Number(item.rotationDeg || 0)),
        flipX: Boolean(item.flipX),
    };
}

function syncProjectInputs() {
    elements.projectName.value = state.project.name;
    syncCanvasInputs();
    syncViewInputs();
}

function syncCanvasInputs() {
    elements.canvasWidthInput.value = state.project.canvas.widthM.toFixed(2).replace(/\.00$/, '');
    elements.canvasHeightInput.value = state.project.canvas.heightM.toFixed(2).replace(/\.00$/, '');
}

function syncViewInputs() {
    const view = normalizeView(state.project.view);
    elements.toggleDimensions.checked = view.showDimensions;
    elements.toggleNames.checked = view.showNames;
}

function convertPointerToCanvasPoint(clientX, clientY, snapToGrid = true) {
    const rect = elements.workspace.getBoundingClientRect();
    const x = (clientX - rect.left) / state.scalePxPerMeter;
    const y = (rect.bottom - clientY) / state.scalePxPerMeter;
    return {
        x: snapToGrid ? roundTo(snapValue(x, state.snapStepM), 2) : roundTo(x, 4),
        y: snapToGrid ? roundTo(snapValue(y, state.snapStepM), 2) : roundTo(y, 4),
    };
}

function createResizeDragState(item, handle) {
    return {
        mode: 'resize',
        itemId: item.id,
        handle,
        anchorHandle: getOppositeHandle(handle),
        anchorPoint: getHandlePoint(item, getOppositeHandle(handle)),
        rotationDeg: item.rotationDeg || 0,
    };
}

function applyItemRotationFromPointer(item, clientX, clientY) {
    const point = convertPointerToCanvasPoint(clientX, clientY, false);
    const center = getItemCenter(item);
    const angleDeg = (Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI + 90;
    item.rotationDeg = normalizeRotation(angleDeg);
}

function applyItemResizeFromPointer(item, clientX, clientY) {
    const point = convertPointerToCanvasPoint(clientX, clientY, false);
    const dragState = state.dragState;
    const angleRad = ((dragState.rotationDeg || 0) * Math.PI) / 180;
    const deltaWorld = {
        x: point.x - dragState.anchorPoint.x,
        y: point.y - dragState.anchorPoint.y,
    };
    const deltaLocal = rotateVector(deltaWorld, -angleRad);
    const candidate = buildResizeCandidate(item, dragState.handle, dragState.anchorHandle, dragState.anchorPoint, deltaLocal);
    const position = clampAndSnapItem(candidate, candidate.x, candidate.y, candidate.id);
    item.widthM = candidate.widthM;
    item.heightM = candidate.heightM;
    item.x = position.x;
    item.y = position.y;
}

function buildResizeCandidate(item, handle, anchorHandle, anchorPoint, deltaLocal) {
    let widthM = item.widthM;
    let heightM = item.heightM;

    if (handle.includes('e')) {
        widthM = clamp(deltaLocal.x, state.minSizeM, state.project.canvas.widthM);
    }
    if (handle.includes('w')) {
        widthM = clamp(-deltaLocal.x, state.minSizeM, state.project.canvas.widthM);
    }
    if (handle.includes('n')) {
        heightM = clamp(deltaLocal.y, state.minSizeM, state.project.canvas.heightM);
    }
    if (handle.includes('s')) {
        heightM = clamp(-deltaLocal.y, state.minSizeM, state.project.canvas.heightM);
    }
    if (handle === 'n' || handle === 's') {
        widthM = item.widthM;
    }
    if (handle === 'e' || handle === 'w') {
        heightM = item.heightM;
    }

    widthM = roundTo(Math.max(state.minSizeM, snapValue(widthM, state.snapStepM)), 2);
    heightM = roundTo(Math.max(state.minSizeM, snapValue(heightM, state.snapStepM)), 2);

    const anchorLocal = getLocalCorner(anchorHandle, widthM, heightM);
    const centerLocal = { x: widthM / 2, y: heightM / 2 };
    const rotatedAnchorOffset = rotateVector({
        x: anchorLocal.x - centerLocal.x,
        y: anchorLocal.y - centerLocal.y,
    }, ((item.rotationDeg || 0) * Math.PI) / 180);

    return {
        ...item,
        widthM,
        heightM,
        x: roundTo(anchorPoint.x - centerLocal.x - rotatedAnchorOffset.x, 2),
        y: roundTo(anchorPoint.y - centerLocal.y - rotatedAnchorOffset.y, 2),
    };
}

function getRotatedItemExtents(item) {
    const center = getItemCenter(item);
    const radians = ((item.rotationDeg || 0) * Math.PI) / 180;
    const corners = [
        { x: item.x, y: item.y },
        { x: item.x + item.widthM, y: item.y },
        { x: item.x + item.widthM, y: item.y + item.heightM },
        { x: item.x, y: item.y + item.heightM },
    ].map((point) => rotatePoint(point, center.x, center.y, radians));

    return {
        minX: Math.min(...corners.map((point) => point.x)),
        minY: Math.min(...corners.map((point) => point.y)),
        maxX: Math.max(...corners.map((point) => point.x)),
        maxY: Math.max(...corners.map((point) => point.y)),
    };
}

function getItemCenter(item) {
    return {
        x: item.x + item.widthM / 2,
        y: item.y + item.heightM / 2,
    };
}

function getLocalCorner(handle, widthM, heightM) {
    const corners = {
        nw: { x: 0, y: heightM },
        n: { x: widthM / 2, y: heightM },
        ne: { x: widthM, y: heightM },
        e: { x: widthM, y: heightM / 2 },
        se: { x: widthM, y: 0 },
        s: { x: widthM / 2, y: 0 },
        sw: { x: 0, y: 0 },
        w: { x: 0, y: heightM / 2 },
    };
    return corners[handle] || corners.se;
}

function getOppositeHandle(handle) {
    return {
        nw: 'se',
        n: 's',
        ne: 'sw',
        e: 'w',
        se: 'nw',
        s: 'n',
        sw: 'ne',
        w: 'e',
    }[handle] || 'se';
}

function getHandlePoint(item, handle) {
    const center = getItemCenter(item);
    const local = getLocalCorner(handle, item.widthM, item.heightM);
    const point = rotatePoint({ x: item.x + local.x, y: item.y + local.y }, center.x, center.y, ((item.rotationDeg || 0) * Math.PI) / 180);
    return {
        x: roundTo(point.x, 4),
        y: roundTo(point.y, 4),
    };
}

function rotatePoint(point, centerX, centerY, radians) {
    const translatedX = point.x - centerX;
    const translatedY = point.y - centerY;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return {
        x: centerX + translatedX * cos - translatedY * sin,
        y: centerY + translatedX * sin + translatedY * cos,
    };
}

function rotateVector(vector, radians) {
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return {
        x: vector.x * cos - vector.y * sin,
        y: vector.x * sin + vector.y * cos,
    };
}
function buildApiUrl(action, params = {}) {
    const url = new URL(appConfig.apiBase || 'api.php', window.location.href);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });
    return url.toString();
}

async function requestJson(url, options = {}) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.error || 'Falha na comunicacao com o servidor.');
    }
    return payload;
}

function parsePositiveNumber(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? roundTo(numeric, 2) : fallback;
}

function getDefaultView() {
    return {
        showDimensions: true,
        showNames: true,
    };
}

function normalizeView(view) {
    const defaults = getDefaultView();
    return {
        showDimensions: typeof view?.showDimensions === 'boolean' ? view.showDimensions : defaults.showDimensions,
        showNames: typeof view?.showNames === 'boolean' ? view.showNames : defaults.showNames,
    };
}

function normalizeRotation(value) {
    if (!Number.isFinite(value)) {
        return 0;
    }

    const normalized = ((value % 360) + 360) % 360;
    return normalized > 180 ? roundTo(normalized - 360, 2) : roundTo(normalized, 2);
}

function formatMeters(value) {
    return `${numberFormatter.format(Number(value || 0))} m`;
}

function formatProjectDate(value) {
    const date = new Date(value || '');
    if (Number.isNaN(date.getTime())) {
        return 'Data indisponivel';
    }
    return `Atualizado ${dateFormatter.format(date)}`;
}

function setStatus(message, tone = 'info') {
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = `status-box status-box--${tone}`;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function snapValue(value, step) {
    if (!step) {
        return value;
    }
    return Math.round(value / step) * step;
}

function roundTo(value, decimals) {
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function isEditableShortcutTarget(target) {
    return target instanceof HTMLElement
        && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
}

function versionedAssetUrl(url) {
    const cleanUrl = String(url || '').trim();
    if (!cleanUrl) {
        return '';
    }
    const version = String(appConfig.assetVersion || '').trim();
    if (!version) {
        return cleanUrl;
    }
    const separator = cleanUrl.includes('?') ? '&' : '?';
    return `${cleanUrl}${separator}v=${encodeURIComponent(version)}`;
}
