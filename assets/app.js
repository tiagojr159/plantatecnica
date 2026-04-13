const appConfig = window.APP_CONFIG || {};

const state = {
    components: [],
    componentsById: new Map(),
    projects: [],
    items: [],
    selectedItemId: null,
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
    elements.duplicateItemBtn.addEventListener('click', duplicateSelectedItem);
    elements.deleteItemBtn.addEventListener('click', deleteSelectedItem);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopDraggingItem);
    window.addEventListener('keydown', handleKeyboardShortcuts);
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
        image: String(component.image || ''),
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
                <img src="${component.image}" alt="${escapeHtml(component.name)}">
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
        const isSelected = item.id === state.selectedItemId;
        const isDragging = state.dragState && state.dragState.itemId === item.id;
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
        node.innerHTML =             `<img src="${item.image}" alt="${escapeHtml(item.name)}">            ${showNames ? `<span class="item-title">${escapeHtml(item.name)}</span>` : ''}            ${showDimensions ? `<span class="dimension-badge dimension-badge--height">A ${formatMeters(item.heightM)}</span><span class="dimension-badge dimension-badge--width">L ${formatMeters(item.widthM)}</span>` : ''}            ${isSelected ? createCanvasControls() : ''}`;
        fragment.appendChild(node);
    });

    elements.workspace.appendChild(fragment);
    updateMetrics(bounds);
}

function createCanvasControls() {
    return [
        'nw',
        'n',
        'ne',
        'e',
        'se',
        's',
        'sw',
        'w',
    ].map((handle) => '<span class=\"canvas-resize-handle canvas-resize-handle--' + handle + '\" data-resize-handle=\"' + handle + '\"></span>').join('')
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
    const item = getSelectedItem();
    const hasSelection = Boolean(item);
    elements.selectionEmpty.hidden = hasSelection;
    elements.selectionForm.hidden = !hasSelection;

    if (!item) {
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
    const itemNode = event.target.closest('[data-item-id]');
    if (!itemNode) {
        return;
    }

    const item = state.items.find((entry) => entry.id === itemNode.dataset.itemId);
    if (!item) {
        return;
    }

    state.selectedItemId = item.id;
    item.zIndex = ++state.zCounter;
    state.skipNextWorkspaceClick = Date.now() + 250;

    const resizeHandle = event.target.closest('[data-resize-handle]');
    if (resizeHandle) {
        state.dragState = createResizeDragState(item, resizeHandle.dataset.resizeHandle || 'se');
        renderWorkspace();
        renderSelection();
        event.preventDefault();
        return;
    }

    const rotateHandle = event.target.closest('[data-rotate-handle]');
    if (rotateHandle) {
        state.dragState = {
            mode: 'rotate',
            itemId: item.id,
        };
        renderWorkspace();
        renderSelection();
        event.preventDefault();
        return;
    }

    const pointerPoint = convertPointerToCanvasPoint(event.clientX, event.clientY);
    state.dragState = {
        mode: 'move',
        itemId: item.id,
        offsetX: pointerPoint.x - item.x,
        offsetY: pointerPoint.y - item.y,
    };
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
        state.selectedItemId = null;
        renderWorkspace();
        renderSelection();
        return;
    }

    state.selectedItemId = itemNode.dataset.itemId || null;
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

    state.dragState = null;
    renderWorkspace();
    renderSelection();
}

function handleKeyboardShortcuts(event) {
    const activeTag = document.activeElement ? document.activeElement.tagName : '';
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
        return;
    }

    if ((event.key === 'Delete' || event.key === 'Backspace') && state.selectedItemId) {
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
    state.selectedItemId = item.id;
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
    const item = getSelectedItem();
    if (!item) {
        return;
    }

    const duplicate = {
        ...item,
        id: `item_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
        rotationDeg: item.rotationDeg || 0,
        zIndex: state.zCounter + 1,
    };
    const position = clampAndSnapItem(duplicate, item.x + 0.3, item.y + 0.3);
    duplicate.x = position.x;
    duplicate.y = position.y;
    state.items.push(duplicate);
    state.selectedItemId = duplicate.id;
    renderWorkspace();
    renderSelection();
    setStatus(`Copia de ${item.name} criada.`, 'success');
}

function deleteSelectedItem() {
    const item = getSelectedItem();
    if (!item) {
        return;
    }

    state.items = state.items.filter((entry) => entry.id !== item.id);
    state.selectedItemId = null;
    renderWorkspace();
    renderSelection();
    setStatus(`Peca ${item.name} removida da planta.`, 'info');
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
        image: String(item.image || ''),
        widthM,
        heightM,
        x: roundTo(Math.max(0, Number(item.x || 0)), 2),
        y: roundTo(Math.max(0, Number(item.y || 0)), 2),
        zIndex: Math.max(1, Number(item.zIndex || 1)),
        rotationDeg: normalizeRotation(Number(item.rotationDeg || 0)),
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
        heightM = clamp(-deltaLocal.y, state.minSizeM, state.project.canvas.heightM);
    }
    if (handle.includes('s')) {
        heightM = clamp(deltaLocal.y, state.minSizeM, state.project.canvas.heightM);
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
















