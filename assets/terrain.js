(() => {
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const config = window.TERRAIN_CONFIG || {};
    const numberFormatter = new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
    });

    const state = {
        components: getTerrainComponents(),
        projects: [],
        items: [],
        selectedItemId: null,
        dragState: null,
        skipNextWorkspaceClick: 0,
        minSizeM: 0.1,
        project: createDefaultProject(),
        canvas: {
            widthM: parseNumber(config.defaultCanvasWidthM, 40),
            heightM: parseNumber(config.defaultCanvasHeightM, 20),
        },
        scalePxPerMeter: parseNumber(config.scalePxPerMeter, 52),
        snapStepM: parseNumber(config.snapStepM, 0.1),
        zCounter: 1,
    };

    const elements = {};

    document.addEventListener('DOMContentLoaded', () => {
        initializeTerrainEditor().catch((error) => {
            console.error(error);
            if (elements.status) {
                setStatus(error.message || 'Nao foi possivel iniciar o editor do terreno.', 'error');
            }
        });
    });

    async function initializeTerrainEditor() {
        if (!document.getElementById('terrainWorkspace')) {
            return;
        }

        cacheElements();
        bindEvents();
        renderCatalog();
        createNewTerrainDrawing(false);
        setStatus('Carregando projetos do terreno...', 'info');
        await loadProjects();
        renderProjects();

        const pendingProject = new URLSearchParams(window.location.search).get('project');
        if (pendingProject) {
            await openSavedProject(pendingProject);
            return;
        }

        renderWorkspace();
        renderSelection();
        setStatus('Editor do terreno pronto. Clique ou arraste um componente para a area central.', 'success');
    }

    function cacheElements() {
        elements.catalog = document.getElementById('terrainCatalog');
        elements.board = document.getElementById('terrainBoard');
        elements.workspace = document.getElementById('terrainWorkspace');
        elements.workspaceScroll = document.querySelector('.terrain-workspace-scroll');
        elements.projectName = document.getElementById('terrainProjectName');
        elements.newBtn = document.getElementById('terrainNewBtn');
        elements.saveBtn = document.getElementById('terrainSaveBtn');
        elements.canvasWidth = document.getElementById('terrainCanvasWidth');
        elements.canvasHeight = document.getElementById('terrainCanvasHeight');
        elements.expandWidth10 = document.getElementById('terrainExpandWidth10');
        elements.expandWidth25 = document.getElementById('terrainExpandWidth25');
        elements.applyCanvas = document.getElementById('terrainApplyCanvas');
        elements.toggleDimensions = document.getElementById('terrainToggleDimensions');
        elements.toggleNames = document.getElementById('terrainToggleNames');
        elements.assembledWidth = document.getElementById('terrainAssembledWidth');
        elements.assembledHeight = document.getElementById('terrainAssembledHeight');
        elements.totalItems = document.getElementById('terrainTotalItems');
        elements.projectList = document.getElementById('terrainProjectList');
        elements.selectionEmpty = document.getElementById('terrainSelectionEmpty');
        elements.selectionForm = document.getElementById('terrainSelectionForm');
        elements.selectedType = document.getElementById('terrainSelectedType');
        elements.selectedLabel = document.getElementById('terrainSelectedLabel');
        elements.selectedWidth = document.getElementById('terrainSelectedWidth');
        elements.selectedHeight = document.getElementById('terrainSelectedHeight');
        elements.selectedX = document.getElementById('terrainSelectedX');
        elements.selectedY = document.getElementById('terrainSelectedY');
        elements.selectedRotation = document.getElementById('terrainSelectedRotation');
        elements.duplicateItem = document.getElementById('terrainDuplicateItem');
        elements.deleteItem = document.getElementById('terrainDeleteItem');
        elements.status = document.getElementById('terrainStatus');
    }

    function bindEvents() {
        elements.catalog.addEventListener('click', handleCatalogClick);
        elements.catalog.addEventListener('dragstart', handleCatalogDragStart);
        elements.board.addEventListener('dragover', (event) => {
            event.preventDefault();
            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'copy';
            }
        });
        elements.board.addEventListener('drop', handleBoardDrop);
        elements.workspace.addEventListener('pointerdown', handlePointerDown);
        elements.workspace.addEventListener('click', handleWorkspaceClick);
        elements.projectList.addEventListener('click', handleProjectListClick);
        elements.newBtn.addEventListener('click', () => createNewTerrainDrawing(true));
        elements.saveBtn.addEventListener('click', saveCurrentProject);
        elements.applyCanvas.addEventListener('click', applyCanvasSize);
        elements.expandWidth10.addEventListener('click', () => expandTerrainWidth(10));
        elements.expandWidth25.addEventListener('click', () => expandTerrainWidth(25));
        elements.toggleDimensions.addEventListener('change', handleViewOptionsChange);
        elements.toggleNames.addEventListener('change', handleViewOptionsChange);
        elements.projectName.addEventListener('input', () => {
            state.project.name = elements.projectName.value.trim();
        });
        elements.canvasWidth.addEventListener('keydown', handleCanvasKeydown);
        elements.canvasHeight.addEventListener('keydown', handleCanvasKeydown);
        elements.selectedLabel.addEventListener('input', () => updateSelectedItemFromInputs(false));
        [elements.selectedWidth, elements.selectedHeight, elements.selectedX, elements.selectedY, elements.selectedRotation].forEach((input) => {
            input.addEventListener('input', () => updateSelectedItemFromInputs(false));
            input.addEventListener('change', () => updateSelectedItemFromInputs(true));
            input.addEventListener('blur', () => updateSelectedItemFromInputs(true));
        });
        elements.duplicateItem.addEventListener('click', duplicateSelectedItem);
        elements.deleteItem.addEventListener('click', deleteSelectedItem);
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('keydown', handleKeyboardShortcuts);
    }

    function handleCatalogClick(event) {
        const card = event.target.closest('[data-component-id]');
        if (!card) {
            return;
        }
        addComponent(card.dataset.componentId || '');
    }

    function handleCatalogDragStart(event) {
        const card = event.target.closest('[data-component-id]');
        if (!card || !event.dataTransfer) {
            return;
        }
        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData('text/plain', card.dataset.componentId || '');
    }

    function handleBoardDrop(event) {
        event.preventDefault();
        const componentId = event.dataTransfer ? event.dataTransfer.getData('text/plain') : '';
        if (!componentId) {
            return;
        }
        const point = convertClientToCanvasPoint(event.clientX, event.clientY);
        addComponent(componentId, point.xM, point.yM, true);
    }

    function handlePointerDown(event) {
        if (event.button !== 0) {
            return;
        }

        const itemElement = event.target.closest('[data-item-id]');
        if (!itemElement) {
            return;
        }

        const item = getItemById(itemElement.getAttribute('data-item-id'));
        if (!item) {
            return;
        }

        selectItem(item.id, true);
        state.skipNextWorkspaceClick = Date.now() + 250;

        const resizeHandle = event.target.closest('[data-resize-handle]');
        if (resizeHandle) {
            state.dragState = createResizeDragState(item, resizeHandle.getAttribute('data-resize-handle'));
            event.preventDefault();
            return;
        }

        const rotateHandle = event.target.closest('[data-rotate-handle]');
        if (rotateHandle) {
            state.dragState = { mode: 'rotate', itemId: item.id };
            event.preventDefault();
            return;
        }

        const point = convertClientToCanvasPoint(event.clientX, event.clientY);
        state.dragState = {
            mode: 'move',
            itemId: item.id,
            offsetX: point.xM - item.xM,
            offsetY: point.yM - item.yM,
        };

        renderWorkspace();
        renderSelection();
        event.preventDefault();
    }

    function handlePointerMove(event) {
        if (!state.dragState) {
            return;
        }

        const item = getItemById(state.dragState.itemId);
        if (!item) {
            state.dragState = null;
            return;
        }

        if (state.dragState.mode === 'rotate') {
            applyRotationFromPointer(item, event.clientX, event.clientY);
        } else if (state.dragState.mode === 'resize') {
            applyResizeFromPointer(item, event.clientX, event.clientY);
        } else {
            const point = convertClientToCanvasPoint(event.clientX, event.clientY);
            const position = clampItemPosition(item, point.xM - state.dragState.offsetX, point.yM - state.dragState.offsetY);
            item.xM = position.xM;
            item.yM = position.yM;
        }

        renderWorkspace();
        renderSelection();
    }

    function handlePointerUp() {
        if (!state.dragState) {
            return;
        }
        const mode = state.dragState.mode;
        state.dragState = null;
        setStatus(mode === 'resize' ? 'Tamanho do elemento atualizado.' : mode === 'rotate' ? 'Rotacao do elemento atualizada.' : 'Elemento reposicionado na planta do terreno.', 'info');
    }

    function handleWorkspaceClick(event) {
        if (state.skipNextWorkspaceClick && Date.now() <= state.skipNextWorkspaceClick) {
            state.skipNextWorkspaceClick = 0;
            return;
        }
        state.skipNextWorkspaceClick = 0;

        const itemElement = event.target.closest('[data-item-id]');
        if (itemElement) {
            const itemId = itemElement.getAttribute('data-item-id');
            if (itemId && itemId !== state.selectedItemId) {
                selectItem(itemId, false);
                renderWorkspace();
                renderSelection();
            }
            return;
        }

        if (!state.selectedItemId) {
            return;
        }

        state.selectedItemId = null;
        renderWorkspace();
        renderSelection();
        setStatus('Selecao limpa. Escolha outro componente para editar.', 'info');
    }

    function handleProjectListClick(event) {
        const card = event.target.closest('[data-project-id]');
        if (!card) {
            return;
        }
        openSavedProject(card.dataset.projectId || '');
    }

    function handleKeyboardShortcuts(event) {
        if (isTypingTarget(event.target)) {
            return;
        }
        const item = getSelectedItem();
        if (!item) {
            return;
        }
        if (event.key === 'Delete' || event.key === 'Backspace') {
            event.preventDefault();
            deleteSelectedItem();
            return;
        }
        const step = event.shiftKey ? 0.5 : state.snapStepM;
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            nudgeSelectedItem(-step, 0);
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            nudgeSelectedItem(step, 0);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            nudgeSelectedItem(0, -step);
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            nudgeSelectedItem(0, step);
        }
    }

    function handleCanvasKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            applyCanvasSize();
        }
    }

    function handleViewOptionsChange() {
        state.project.view = normalizeView({
            showDimensions: elements.toggleDimensions.checked,
            showNames: elements.toggleNames.checked,
        });
        renderWorkspace();
        setStatus('Opcoes de legenda atualizadas.', 'info');
    }

    async function loadProjects() {
        const payload = await requestJson(buildApiUrl('projects'));
        const projects = Array.isArray(payload.projects) ? payload.projects : [];
        state.projects = projects.filter((project) => String(project.editor || '') === 'terrain');
        renderProjects();
    }

    function renderProjects() {
        elements.projectList.innerHTML = '';
        if (state.projects.length === 0) {
            elements.projectList.innerHTML = '<div class="empty-state">Nenhum projeto do terreno salvo ainda.</div>';
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
                <strong>${escapeHtml(project.name || 'Projeto sem nome')}</strong>
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

    async function saveCurrentProject() {
        try {
            setStatus('Salvando projeto do terreno em JSON...', 'info');
            const bounds = calculateAssemblyBounds();
            const payload = {
                editor: 'terrain',
                id: state.project.id,
                name: state.project.name || 'Projeto do terreno sem nome',
                createdAt: state.project.createdAt,
                canvas: {
                    widthM: state.canvas.widthM,
                    heightM: state.canvas.heightM,
                },
                view: state.project.view,
                items: state.items.map((item) => ({
                    id: item.id,
                    componentId: item.type,
                    name: item.label,
                    image: '',
                    widthM: item.widthM,
                    heightM: item.heightM,
                    x: item.xM,
                    y: item.yM,
                    zIndex: item.zIndex,
                    rotationDeg: item.rotationDeg,
                })),
                stats: bounds ? {
                    minX: bounds.minX,
                    minY: bounds.minY,
                    maxX: bounds.maxX,
                    maxY: bounds.maxY,
                    widthM: bounds.width,
                    heightM: bounds.height,
                } : {
                    minX: 0,
                    minY: 0,
                    maxX: 0,
                    maxY: 0,
                    widthM: 0,
                    heightM: 0,
                },
            };

            const response = await requestJson(buildApiUrl('save_project'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const project = response.project || {};
            state.project.id = String(project.id || state.project.id || '');
            state.project.createdAt = String(project.createdAt || state.project.createdAt || '');
            state.project.updatedAt = String(project.updatedAt || '');
            state.project.name = String(project.name || state.project.name || 'Projeto do terreno sem nome');
            syncProjectInputs();
            await loadProjects();
            setStatus('Projeto do terreno salvo com sucesso.', 'success');
        } catch (error) {
            console.error(error);
            setStatus(error.message || 'Nao foi possivel salvar o projeto do terreno.', 'error');
        }
    }

    async function openSavedProject(projectId) {
        if (!projectId) {
            return;
        }

        try {
            setStatus('Abrindo projeto do terreno...', 'info');
            const payload = await requestJson(buildApiUrl('project', { id: projectId }));
            const project = payload.project || {};
            if (String(project.editor || '') !== 'terrain') {
                throw new Error('Esse projeto salvo pertence a outro editor.');
            }

            state.project = {
                id: String(project.id || projectId),
                name: String(project.name || 'Projeto do terreno sem nome'),
                createdAt: String(project.createdAt || ''),
                updatedAt: String(project.updatedAt || ''),
                view: normalizeView(project.view),
            };
            state.canvas.widthM = parseNumber(project.canvas && project.canvas.widthM, parseNumber(config.defaultCanvasWidthM, 40));
            state.canvas.heightM = parseNumber(project.canvas && project.canvas.heightM, parseNumber(config.defaultCanvasHeightM, 20));
            state.items = (Array.isArray(project.items) ? project.items : []).map(sanitizeLoadedItem).filter(Boolean);
            state.items.forEach((item) => {
                const position = clampItemPosition(item, item.xM, item.yM);
                item.xM = position.xM;
                item.yM = position.yM;
            });
            state.selectedItemId = null;
            state.dragState = null;
            state.zCounter = state.items.reduce((highest, item) => Math.max(highest, Number(item.zIndex || 1)), 1) + 1;
            syncProjectInputs();
            renderWorkspace();
            renderSelection();
            renderProjects();
            setStatus(`Projeto ${state.project.name} carregado.`, 'success');
        } catch (error) {
            console.error(error);
            setStatus(error.message || 'Nao foi possivel abrir o projeto do terreno.', 'error');
        }
    }

    function sanitizeLoadedItem(item) {
        if (!item || typeof item !== 'object') {
            return null;
        }
        const widthM = roundNumber(Number(item.widthM || 0), 2);
        const heightM = roundNumber(Number(item.heightM || 0), 2);
        if (!(widthM > 0) || !(heightM > 0)) {
            return null;
        }
        return {
            id: String(item.id || createId()),
            type: String(item.componentId || 'stage'),
            label: String(item.name || getDefaultLabel(String(item.componentId || 'stage'))),
            widthM,
            heightM,
            xM: roundNumber(Math.max(0, Number(item.x || 0)), 2),
            yM: roundNumber(Math.max(0, Number(item.y || 0)), 2),
            rotationDeg: normalizeRotation(Number(item.rotationDeg || 0)),
            zIndex: Math.max(1, Number(item.zIndex || 1)),
        };
    }

    function createNewTerrainDrawing(showStatus = true) {
        if (showStatus && state.items.length > 0) {
            const confirmed = window.confirm('Deseja limpar a planta do terreno atual e comecar um novo desenho?');
            if (!confirmed) {
                return;
            }
        }

        state.project = createDefaultProject();
        state.items = [];
        state.selectedItemId = null;
        state.dragState = null;
        state.zCounter = 1;
        state.canvas.widthM = parseNumber(config.defaultCanvasWidthM, 40);
        state.canvas.heightM = parseNumber(config.defaultCanvasHeightM, 20);
        syncProjectInputs();
        renderWorkspace();
        renderSelection();
        renderProjects();
        updateMetrics(null);

        if (showStatus) {
            setStatus('Novo desenho do terreno iniciado.', 'success');
        }
    }

    function applyCanvasSize() {
        state.canvas.widthM = clampNumber(parseNumber(elements.canvasWidth.value, state.canvas.widthM), 5, 400);
        state.canvas.heightM = clampNumber(parseNumber(elements.canvasHeight.value, state.canvas.heightM), 5, 200);
        state.items.forEach((item) => {
            const position = clampItemPosition(item, item.xM, item.yM);
            item.xM = position.xM;
            item.yM = position.yM;
        });
        syncCanvasInputs();
        renderWorkspace();
        renderSelection();
        setStatus('Area do terreno atualizada.', 'success');
    }

    function expandTerrainWidth(amountM) {
        state.canvas.widthM = roundNumber(state.canvas.widthM + amountM, 2);
        syncCanvasInputs();
        renderWorkspace();
        renderSelection();
        if (elements.workspaceScroll) {
            window.requestAnimationFrame(() => {
                elements.workspaceScroll.scrollLeft = elements.workspaceScroll.scrollWidth;
            });
        }
        setStatus(`Area horizontal ampliada para ${formatMeters(state.canvas.widthM)}.`, 'success');
    }

    function renderCatalog() {
        elements.catalog.innerHTML = '';
        const fragment = document.createDocumentFragment();
        state.components.forEach((component) => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'catalog-card terrain-catalog-card';
            card.draggable = true;
            card.dataset.componentId = component.id;
            card.innerHTML = `
                <span class="catalog-thumb terrain-catalog-thumb">${buildPreview(component)}</span>
                <span class="catalog-meta">
                    <strong>${escapeHtml(component.name)}</strong>
                    <span>${escapeHtml(component.category)}</span>
                    <span>${formatMeters(component.widthM)} x ${formatMeters(component.heightM)}</span>
                    <span class="muted-note">Clique para inserir ou arraste para a planta.</span>
                </span>
            `;
            fragment.appendChild(card);
        });
        elements.catalog.appendChild(fragment);
    }

    function renderWorkspace() {
        const widthPx = Math.max(520, toPx(state.canvas.widthM));
        const heightPx = Math.max(360, toPx(state.canvas.heightM));
        const view = normalizeView(state.project.view);
        const bounds = calculateAssemblyBounds();

        elements.board.style.width = `${widthPx}px`;
        elements.board.style.height = `${heightPx}px`;
        elements.workspace.setAttribute('width', String(widthPx));
        elements.workspace.setAttribute('height', String(heightPx));
        elements.workspace.setAttribute('viewBox', `0 0 ${widthPx} ${heightPx}`);
        elements.workspace.replaceChildren();

        const fragment = document.createDocumentFragment();
        if (view.showDimensions && bounds) {
            fragment.appendChild(createOverallBounds(bounds));
        }
        state.items.slice().sort((left, right) => left.zIndex - right.zIndex).forEach((item) => {
            fragment.appendChild(createItemGroup(item, view));
        });
        elements.workspace.appendChild(fragment);
        updateMetrics(bounds);
    }

    function createItemGroup(item, view) {
        const widthPx = toPx(item.widthM);
        const heightPx = toPx(item.heightM);
        const isSelected = item.id === state.selectedItemId;
        const group = svgElement('g', {
            class: isSelected ? 'terrain-item is-selected' : 'terrain-item',
            'data-item-id': item.id,
            transform: `translate(${toPx(item.xM)} ${toPx(item.yM)}) rotate(${item.rotationDeg} ${widthPx / 2} ${heightPx / 2})`,
        });

        if (isSelected) {
            group.appendChild(svgElement('rect', {
                x: -8,
                y: -8,
                width: widthPx + 16,
                height: heightPx + 16,
                rx: 12,
                ry: 12,
                class: 'terrain-selection-outline',
            }));
            group.appendChild(createResizeHandles(widthPx, heightPx));
            group.appendChild(createRotateHandle(widthPx));
        }

        if (item.type === 'stage') {
            drawStage(group, widthPx, heightPx);
        } else if (item.type === 'stair') {
            drawStair(group, widthPx, heightPx);
        } else if (item.type === 'ramp') {
            drawRamp(group, widthPx, heightPx);
        } else if (item.type === 'landing') {
            drawLanding(group, widthPx, heightPx);
        } else {
            drawWall(group, widthPx, heightPx);
        }

        if (view.showNames) {
            group.appendChild(svgText(item.label || getDefaultLabel(item.type), {
                x: widthPx / 2,
                y: -18,
                class: 'terrain-label',
            }));
        }
        if (view.showDimensions) {
            group.appendChild(createDimensions(item, widthPx, heightPx));
        }

        return group;
    }

    function drawStage(group, widthPx, heightPx) {
        group.appendChild(svgElement('rect', { x: 0, y: 0, width: widthPx, height: heightPx, rx: 4, ry: 4, class: 'terrain-shape-base' }));
    }

    function drawStair(group, widthPx, heightPx) {
        const stepCount = clampNumber(Math.round(heightPx / 18), 4, 7);
        const stepHeight = heightPx / stepCount;
        group.appendChild(svgElement('rect', { x: 0, y: 0, width: widthPx, height: heightPx, rx: 4, ry: 4, class: 'terrain-shape-base terrain-shape-fill-muted' }));
        group.appendChild(svgElement('line', { x1: widthPx * 0.78, y1: 0, x2: widthPx * 0.78, y2: heightPx, class: 'terrain-shape-line' }));
        for (let index = 1; index < stepCount; index += 1) {
            const y = stepHeight * index;
            group.appendChild(svgElement('line', { x1: 0, y1: y, x2: widthPx, y2: y, class: 'terrain-shape-line' }));
        }
    }

    function drawRamp(group, widthPx, heightPx) {
        const bandY = heightPx * 0.48;
        const arrowY = heightPx * 0.74;
        group.appendChild(svgElement('rect', { x: 0, y: 0, width: widthPx, height: heightPx, rx: 4, ry: 4, class: 'terrain-shape-base' }));
        group.appendChild(svgElement('line', { x1: 0, y1: bandY, x2: widthPx, y2: bandY, class: 'terrain-shape-line' }));
        group.appendChild(svgText('INC. 30%', { x: widthPx / 2, y: heightPx * 0.26, class: 'terrain-inner-text', 'font-size': clampNumber(widthPx * 0.085, 8, 12) }));
        group.appendChild(svgElement('line', { x1: widthPx * 0.18, y1: arrowY, x2: widthPx * 0.68, y2: arrowY, class: 'terrain-shape-line' }));
        group.appendChild(svgElement('polyline', { points: `${widthPx * 0.57},${arrowY - heightPx * 0.12} ${widthPx * 0.73},${arrowY} ${widthPx * 0.57},${arrowY + heightPx * 0.12}`, class: 'terrain-shape-line' }));
    }

    function drawLanding(group, widthPx, heightPx) {
        group.appendChild(svgElement('rect', { x: 0, y: 0, width: widthPx, height: heightPx, rx: 4, ry: 4, class: 'terrain-shape-base terrain-shape-fill-muted' }));
        group.appendChild(svgElement('line', { x1: widthPx / 3, y1: 0, x2: widthPx / 3, y2: heightPx, class: 'terrain-shape-line' }));
        group.appendChild(svgElement('line', { x1: (widthPx / 3) * 2, y1: 0, x2: (widthPx / 3) * 2, y2: heightPx, class: 'terrain-shape-line' }));
    }

    function drawWall(group, widthPx, heightPx) {
        group.appendChild(svgElement('rect', { x: 0, y: 0, width: widthPx, height: heightPx, rx: 3, ry: 3, class: 'terrain-wall-base' }));
        const patternCount = Math.max(2, Math.round(widthPx / 26));
        for (let index = 1; index < patternCount; index += 1) {
            const x = (widthPx / patternCount) * index;
            group.appendChild(svgElement('line', { x1: x, y1: 0, x2: x - 10, y2: heightPx, class: 'terrain-wall-line' }));
        }
    }

    function createResizeHandles(widthPx, heightPx) {
        const group = svgElement('g', { class: 'terrain-controls' });
        const handleSize = 12;
        const points = { nw: [0, 0], ne: [widthPx, 0], se: [widthPx, heightPx], sw: [0, heightPx] };
        Object.entries(points).forEach(([handle, point]) => {
            group.appendChild(svgElement('rect', {
                x: point[0] - handleSize / 2,
                y: point[1] - handleSize / 2,
                width: handleSize,
                height: handleSize,
                rx: 3,
                ry: 3,
                class: `terrain-resize-handle terrain-resize-handle--${handle}`,
                'data-resize-handle': handle,
            }));
        });
        return group;
    }

    function createRotateHandle(widthPx) {
        const group = svgElement('g', { class: 'terrain-controls' });
        const handleX = widthPx / 2;
        const handleY = -28;
        group.appendChild(svgElement('line', { x1: handleX, y1: 0, x2: handleX, y2: handleY + 8, class: 'terrain-rotate-link' }));
        group.appendChild(svgElement('circle', { cx: handleX, cy: handleY, r: 8, class: 'terrain-rotate-handle', 'data-rotate-handle': 'true' }));
        return group;
    }

    function createDimensions(item, widthPx, heightPx) {
        const group = svgElement('g');
        const offset = 14;
        const tick = 7;
        const verticalX = widthPx + offset;
        group.appendChild(svgElement('line', { x1: 0, y1: heightPx, x2: 0, y2: heightPx + offset, class: 'terrain-dimension-line' }));
        group.appendChild(svgElement('line', { x1: widthPx, y1: heightPx, x2: widthPx, y2: heightPx + offset, class: 'terrain-dimension-line' }));
        group.appendChild(svgElement('line', { x1: 0, y1: heightPx + offset, x2: widthPx, y2: heightPx + offset, class: 'terrain-dimension-line' }));
        group.appendChild(svgElement('line', { x1: 0, y1: heightPx + offset - tick, x2: 0, y2: heightPx + offset + tick, class: 'terrain-dimension-line' }));
        group.appendChild(svgElement('line', { x1: widthPx, y1: heightPx + offset - tick, x2: widthPx, y2: heightPx + offset + tick, class: 'terrain-dimension-line' }));
        group.appendChild(svgText(formatMeters(item.widthM), { x: widthPx / 2, y: heightPx + offset + 2, class: 'terrain-dimension-text' }));
        group.appendChild(svgElement('line', { x1: widthPx, y1: 0, x2: verticalX, y2: 0, class: 'terrain-dimension-line' }));
        group.appendChild(svgElement('line', { x1: widthPx, y1: heightPx, x2: verticalX, y2: heightPx, class: 'terrain-dimension-line' }));
        group.appendChild(svgElement('line', { x1: verticalX, y1: 0, x2: verticalX, y2: heightPx, class: 'terrain-dimension-line' }));
        group.appendChild(svgText(formatMeters(item.heightM), { x: verticalX + 16, y: heightPx / 2, class: 'terrain-dimension-text', transform: `rotate(90 ${verticalX + 16} ${heightPx / 2})` }));
        return group;
    }

    function createOverallBounds(bounds) {
        const group = svgElement('g');
        const minXPx = toPx(bounds.minX);
        const minYPx = toPx(bounds.minY);
        const maxXPx = toPx(bounds.maxX);
        const maxYPx = toPx(bounds.maxY);
        const widthPx = maxXPx - minXPx;
        const heightPx = maxYPx - minYPx;
        group.appendChild(svgElement('rect', { x: minXPx, y: minYPx, width: widthPx, height: heightPx, rx: 10, ry: 10, class: 'terrain-overall-boundary' }));
        group.appendChild(svgText('AREA MONTADA', { x: minXPx + 8, y: minYPx > 20 ? minYPx - 24 : minYPx + 28, class: 'terrain-overall-caption', 'text-anchor': 'start' }));
        group.appendChild(svgText(formatMeters(bounds.width), { x: minXPx + widthPx / 2, y: minYPx > 24 ? minYPx - 12 : minYPx + 16, class: 'terrain-overall-text' }));
        group.appendChild(svgText(formatMeters(bounds.height), { x: maxXPx + 18, y: minYPx + heightPx / 2, class: 'terrain-overall-text', transform: `rotate(90 ${maxXPx + 18} ${minYPx + heightPx / 2})` }));
        return group;
    }

    function addComponent(componentId, xM, yM, useDropPoint = false) {
        const component = getComponent(componentId);
        if (!component) {
            return;
        }
        const offset = 0.8 + state.items.length * 0.5;
        const item = createItem(component, useDropPoint ? xM - component.widthM / 2 : offset, useDropPoint ? yM - component.heightM / 2 : offset);
        state.items.push(item);
        selectItem(item.id, false);
        renderWorkspace();
        renderSelection();
        setStatus(`${component.name} inserido na planta do terreno.`, 'success');
    }

    function createItem(component, xM, yM) {
        const item = {
            id: createId(),
            type: component.id,
            label: component.defaultLabel,
            widthM: roundNumber(component.widthM, 2),
            heightM: roundNumber(component.heightM, 2),
            xM: roundNumber(xM, 2),
            yM: roundNumber(yM, 2),
            rotationDeg: 0,
            zIndex: state.zCounter++,
        };
        const position = clampItemPosition(item, item.xM, item.yM);
        item.xM = position.xM;
        item.yM = position.yM;
        return item;
    }

    function selectItem(itemId, bringToFront) {
        state.selectedItemId = itemId;
        const item = getItemById(itemId);
        if (item && bringToFront) {
            item.zIndex = state.zCounter++;
        }
    }

    function createResizeDragState(item, handle) {
        return {
            mode: 'resize',
            itemId: item.id,
            handle,
            anchorHandle: getOppositeHandle(handle),
            anchorWorld: getHandleWorldPoint(item, getOppositeHandle(handle)),
            rotationDeg: item.rotationDeg,
        };
    }

    function applyRotationFromPointer(item, clientX, clientY) {
        const point = convertClientToCanvasPoint(clientX, clientY, false);
        const center = getItemCenter(item);
        const angleDeg = (Math.atan2(point.yM - center.yM, point.xM - center.xM) * 180) / Math.PI + 90;
        item.rotationDeg = normalizeRotation(angleDeg);
    }

    function applyResizeFromPointer(item, clientX, clientY) {
        const point = convertClientToCanvasPoint(clientX, clientY, false);
        const dragState = state.dragState;
        const angleRad = (dragState.rotationDeg * Math.PI) / 180;
        const deltaWorld = {
            x: point.xM - dragState.anchorWorld.xM,
            y: point.yM - dragState.anchorWorld.yM,
        };
        const deltaLocal = rotateVector(deltaWorld, -angleRad);
        const candidate = buildResizeCandidate(item, dragState.handle, dragState.anchorHandle, dragState.anchorWorld, deltaLocal);
        const extents = getItemExtents(candidate);
        if (extents.minX < 0 || extents.minY < 0 || extents.maxX > state.canvas.widthM || extents.maxY > state.canvas.heightM) {
            const position = clampItemPosition(candidate, candidate.xM, candidate.yM);
            candidate.xM = position.xM;
            candidate.yM = position.yM;
        }
        item.widthM = candidate.widthM;
        item.heightM = candidate.heightM;
        item.xM = candidate.xM;
        item.yM = candidate.yM;
    }

    function buildResizeCandidate(item, handle, anchorHandle, anchorWorld, deltaLocal) {
        let widthM = item.widthM;
        let heightM = item.heightM;
        if (handle === 'se') {
            widthM = clampNumber(deltaLocal.x, state.minSizeM, state.canvas.widthM);
            heightM = clampNumber(deltaLocal.y, state.minSizeM, state.canvas.heightM);
        } else if (handle === 'sw') {
            widthM = clampNumber(-deltaLocal.x, state.minSizeM, state.canvas.widthM);
            heightM = clampNumber(deltaLocal.y, state.minSizeM, state.canvas.heightM);
        } else if (handle === 'ne') {
            widthM = clampNumber(deltaLocal.x, state.minSizeM, state.canvas.widthM);
            heightM = clampNumber(-deltaLocal.y, state.minSizeM, state.canvas.heightM);
        } else {
            widthM = clampNumber(-deltaLocal.x, state.minSizeM, state.canvas.widthM);
            heightM = clampNumber(-deltaLocal.y, state.minSizeM, state.canvas.heightM);
        }
        widthM = snapValue(widthM);
        heightM = snapValue(heightM);
        const anchorLocal = getCornerLocalPoint(anchorHandle, widthM, heightM);
        const centerLocal = { x: widthM / 2, y: heightM / 2 };
        const rotatedAnchorOffset = rotateVector({ x: anchorLocal.x - centerLocal.x, y: anchorLocal.y - centerLocal.y }, (item.rotationDeg * Math.PI) / 180);
        return {
            ...item,
            widthM,
            heightM,
            xM: roundNumber(anchorWorld.xM - centerLocal.x - rotatedAnchorOffset.x, 2),
            yM: roundNumber(anchorWorld.yM - centerLocal.y - rotatedAnchorOffset.y, 2),
        };
    }

    function updateSelectedItemFromInputs(syncInputs) {
        const item = getSelectedItem();
        if (!item) {
            return;
        }
        item.label = elements.selectedLabel.value.trim() || getDefaultLabel(item.type);
        item.widthM = clampNumber(parseNumber(elements.selectedWidth.value, item.widthM), state.minSizeM, 200);
        item.heightM = clampNumber(parseNumber(elements.selectedHeight.value, item.heightM), state.minSizeM, 200);
        item.rotationDeg = normalizeRotation(parseNumber(elements.selectedRotation.value, item.rotationDeg));
        const position = clampItemPosition(item, parseNumber(elements.selectedX.value, item.xM), parseNumber(elements.selectedY.value, item.yM));
        item.xM = position.xM;
        item.yM = position.yM;
        renderWorkspace();
        if (syncInputs) {
            renderSelection();
        }
    }

    function renderSelection() {
        const item = getSelectedItem();
        elements.selectionForm.hidden = !item;
        elements.selectionEmpty.hidden = Boolean(item);
        if (!item) {
            return;
        }
        elements.selectedType.value = getComponent(item.type)?.name || item.type;
        elements.selectedLabel.value = item.label;
        elements.selectedWidth.value = formatInputNumber(item.widthM);
        elements.selectedHeight.value = formatInputNumber(item.heightM);
        elements.selectedX.value = formatInputNumber(item.xM);
        elements.selectedY.value = formatInputNumber(item.yM);
        elements.selectedRotation.value = formatInputNumber(item.rotationDeg);
    }

    function duplicateSelectedItem() {
        const item = getSelectedItem();
        if (!item) {
            return;
        }
        const duplicate = { ...item, id: createId(), xM: roundNumber(item.xM + 0.8, 2), yM: roundNumber(item.yM + 0.8, 2), zIndex: state.zCounter++ };
        const position = clampItemPosition(duplicate, duplicate.xM, duplicate.yM);
        duplicate.xM = position.xM;
        duplicate.yM = position.yM;
        state.items.push(duplicate);
        selectItem(duplicate.id, false);
        renderWorkspace();
        renderSelection();
        setStatus('Elemento duplicado no terreno.', 'success');
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
        setStatus('Elemento removido do desenho.', 'warning');
    }

    function nudgeSelectedItem(deltaXM, deltaYM) {
        const item = getSelectedItem();
        if (!item) {
            return;
        }
        const position = clampItemPosition(item, item.xM + deltaXM, item.yM + deltaYM);
        item.xM = position.xM;
        item.yM = position.yM;
        renderWorkspace();
        renderSelection();
    }

    function updateMetrics(bounds) {
        elements.assembledWidth.textContent = bounds ? formatMeters(bounds.width) : '0,00 m';
        elements.assembledHeight.textContent = bounds ? formatMeters(bounds.height) : '0,00 m';
        elements.totalItems.textContent = String(state.items.length);
    }

    function syncProjectInputs() {
        elements.projectName.value = state.project.name;
        syncCanvasInputs();
        syncViewInputs();
    }

    function syncCanvasInputs() {
        elements.canvasWidth.value = formatInputNumber(state.canvas.widthM);
        elements.canvasHeight.value = formatInputNumber(state.canvas.heightM);
    }

    function syncViewInputs() {
        const view = normalizeView(state.project.view);
        elements.toggleDimensions.checked = view.showDimensions;
        elements.toggleNames.checked = view.showNames;
    }

    function clampItemPosition(item, xM, yM) {
        let nextX = snapValue(xM);
        let nextY = snapValue(yM);
        let candidate = { ...item, xM: nextX, yM: nextY };
        let extents = getItemExtents(candidate);
        if (extents.minX < 0) {
            nextX += -extents.minX;
        }
        if (extents.maxX > state.canvas.widthM) {
            nextX -= extents.maxX - state.canvas.widthM;
        }
        if (extents.minY < 0) {
            nextY += -extents.minY;
        }
        if (extents.maxY > state.canvas.heightM) {
            nextY -= extents.maxY - state.canvas.heightM;
        }
        return { xM: roundNumber(snapValue(nextX), 2), yM: roundNumber(snapValue(nextY), 2) };
    }

    function calculateAssemblyBounds() {
        if (state.items.length === 0) {
            return null;
        }
        const seed = { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY };
        const bounds = state.items.reduce((result, item) => {
            const extents = getItemExtents(item);
            result.minX = Math.min(result.minX, extents.minX);
            result.minY = Math.min(result.minY, extents.minY);
            result.maxX = Math.max(result.maxX, extents.maxX);
            result.maxY = Math.max(result.maxY, extents.maxY);
            return result;
        }, seed);
        return { ...bounds, width: roundNumber(bounds.maxX - bounds.minX, 2), height: roundNumber(bounds.maxY - bounds.minY, 2) };
    }

    function getItemExtents(item) {
        const center = getItemCenter(item);
        const radians = (item.rotationDeg * Math.PI) / 180;
        const corners = [
            { x: item.xM, y: item.yM },
            { x: item.xM + item.widthM, y: item.yM },
            { x: item.xM + item.widthM, y: item.yM + item.heightM },
            { x: item.xM, y: item.yM + item.heightM },
        ].map((point) => rotatePoint(point, center.xM, center.yM, radians));
        return {
            minX: Math.min(...corners.map((point) => point.x)),
            minY: Math.min(...corners.map((point) => point.y)),
            maxX: Math.max(...corners.map((point) => point.x)),
            maxY: Math.max(...corners.map((point) => point.y)),
        };
    }

    function rotatePoint(point, centerX, centerY, radians) {
        const translatedX = point.x - centerX;
        const translatedY = point.y - centerY;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        return { x: centerX + translatedX * cos - translatedY * sin, y: centerY + translatedX * sin + translatedY * cos };
    }

    function rotateVector(vector, radians) {
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        return { x: vector.x * cos - vector.y * sin, y: vector.x * sin + vector.y * cos };
    }

    function getItemCenter(item) {
        return { xM: item.xM + item.widthM / 2, yM: item.yM + item.heightM / 2 };
    }

    function getCornerLocalPoint(handle, widthM, heightM) {
        const points = { nw: { x: 0, y: 0 }, ne: { x: widthM, y: 0 }, se: { x: widthM, y: heightM }, sw: { x: 0, y: heightM } };
        return points[handle] || points.se;
    }

    function getOppositeHandle(handle) {
        return { nw: 'se', ne: 'sw', se: 'nw', sw: 'ne' }[handle] || 'nw';
    }

    function getHandleWorldPoint(item, handle) {
        const center = getItemCenter(item);
        const corner = getCornerLocalPoint(handle, item.widthM, item.heightM);
        const rotatedPoint = rotatePoint({ x: item.xM + corner.x, y: item.yM + corner.y }, center.xM, center.yM, (item.rotationDeg * Math.PI) / 180);
        return { xM: roundNumber(rotatedPoint.x, 4), yM: roundNumber(rotatedPoint.y, 4) };
    }

    function convertClientToCanvasPoint(clientX, clientY, snapToGrid = true) {
        const rect = elements.workspace.getBoundingClientRect();
        const rawXM = clampNumber(clientX - rect.left, 0, rect.width) / state.scalePxPerMeter;
        const rawYM = clampNumber(clientY - rect.top, 0, rect.height) / state.scalePxPerMeter;
        return { xM: snapToGrid ? snapValue(rawXM) : roundNumber(rawXM, 4), yM: snapToGrid ? snapValue(rawYM) : roundNumber(rawYM, 4) };
    }

    function getSelectedItem() {
        return getItemById(state.selectedItemId);
    }

    function getItemById(itemId) {
        return state.items.find((item) => item.id === itemId) || null;
    }

    function getComponent(componentId) {
        return state.components.find((component) => component.id === componentId) || null;
    }

    function getDefaultLabel(componentId) {
        return getComponent(componentId)?.defaultLabel || 'ELEMENTO';
    }

    function getTerrainComponents() {
        return [
            { id: 'stage', name: 'Retangulo de palco', defaultLabel: 'PALCO', widthM: 10, heightM: 6, category: 'Estruturas' },
            { id: 'stair', name: 'Escada', defaultLabel: 'ESCADA', widthM: 1.8, heightM: 2, category: 'Acessos' },
            { id: 'ramp', name: 'Rampa 30%', defaultLabel: 'RAMPA 30%', widthM: 4, heightM: 1.8, category: 'Acessos' },
            { id: 'landing', name: 'Patamar', defaultLabel: 'PATAMAR', widthM: 1.4, heightM: 1, category: 'Acessos' },
            { id: 'wall_2m', name: 'Parede 2 m', defaultLabel: 'PAREDE 2 m', widthM: 2, heightM: 0.2, category: 'Fechamentos' },
            { id: 'wall_3m', name: 'Parede 3 m', defaultLabel: 'PAREDE 3 m', widthM: 3, heightM: 0.2, category: 'Fechamentos' },
        ];
    }

    function buildPreview(component) {
        if (component.id === 'stage') {
            return '<svg viewBox="0 0 120 80" class="terrain-preview" aria-hidden="true"><rect x="14" y="18" width="92" height="44" rx="3" ry="3" class="terrain-preview__outline"></rect><text x="60" y="13" class="terrain-preview__text">PALCO</text></svg>';
        }
        if (component.id === 'stair') {
            return '<svg viewBox="0 0 120 80" class="terrain-preview" aria-hidden="true"><rect x="36" y="10" width="48" height="58" rx="3" ry="3" class="terrain-preview__outline"></rect><line x1="71" y1="10" x2="71" y2="68" class="terrain-preview__line"></line><line x1="36" y1="19" x2="84" y2="19" class="terrain-preview__line"></line><line x1="36" y1="28" x2="84" y2="28" class="terrain-preview__line"></line><line x1="36" y1="37" x2="84" y2="37" class="terrain-preview__line"></line><line x1="36" y1="46" x2="84" y2="46" class="terrain-preview__line"></line><line x1="36" y1="55" x2="84" y2="55" class="terrain-preview__line"></line><text x="60" y="76" class="terrain-preview__text terrain-preview__text--small">ESCADA</text></svg>';
        }
        if (component.id === 'ramp') {
            return '<svg viewBox="0 0 120 80" class="terrain-preview" aria-hidden="true"><rect x="12" y="20" width="96" height="40" rx="3" ry="3" class="terrain-preview__outline"></rect><line x1="12" y1="40" x2="108" y2="40" class="terrain-preview__line"></line><line x1="26" y1="50" x2="76" y2="50" class="terrain-preview__line"></line><polyline points="65,42 83,50 65,58" class="terrain-preview__arrow"></polyline><text x="60" y="32" class="terrain-preview__text terrain-preview__text--small">INC. 30%</text></svg>';
        }
        if (component.id === 'landing') {
            return '<svg viewBox="0 0 120 80" class="terrain-preview" aria-hidden="true"><rect x="20" y="26" width="80" height="28" rx="3" ry="3" class="terrain-preview__outline"></rect><line x1="47" y1="26" x2="47" y2="54" class="terrain-preview__line"></line><line x1="73" y1="26" x2="73" y2="54" class="terrain-preview__line"></line><text x="60" y="20" class="terrain-preview__text terrain-preview__text--small">PATAMAR</text></svg>';
        }
        return `<svg viewBox="0 0 120 80" class="terrain-preview" aria-hidden="true"><rect x="14" y="33" width="92" height="12" rx="3" ry="3" class="terrain-preview__wall"></rect><text x="60" y="24" class="terrain-preview__text terrain-preview__text--small">${escapeHtml(component.defaultLabel)}</text></svg>`;
    }

    function createDefaultProject() {
        return { id: '', name: '', createdAt: '', updatedAt: '', view: normalizeView({ showDimensions: true, showNames: true }) };
    }

    function normalizeView(view) {
        return {
            showDimensions: view && view.showDimensions !== false,
            showNames: view && view.showNames !== false,
        };
    }

    function setStatus(message, tone) {
        elements.status.textContent = message;
        elements.status.className = `status-box status-box--${tone}`;
    }

    function buildApiUrl(action, params = {}) {
        const url = new URL(config.apiBase || 'api.php', window.location.href);
        url.searchParams.set('action', action);
        Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
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

    function formatMeters(value) {
        return `${numberFormatter.format(Number(value || 0))} m`;
    }

    function formatInputNumber(value) {
        return roundNumber(Number(value || 0), 2).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
    }

    function formatProjectDate(value) {
        const date = new Date(value || '');
        return Number.isNaN(date.getTime()) ? 'Data indisponivel' : `Atualizado ${dateFormatter.format(date)}`;
    }

    function parseNumber(value, fallback) {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
        const normalized = String(value ?? '').trim().replace(',', '.');
        if (!normalized) {
            return fallback;
        }
        const parsed = Number.parseFloat(normalized);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    function roundNumber(value, digits = 2) {
        const factor = 10 ** digits;
        return Math.round(Number(value || 0) * factor) / factor;
    }

    function clampNumber(value, minimum, maximum) {
        return Math.min(Math.max(Number(value || 0), minimum), maximum);
    }

    function snapValue(value) {
        return roundNumber(Math.round(Number(value || 0) / state.snapStepM) * state.snapStepM, 2);
    }

    function normalizeRotation(value) {
        if (!Number.isFinite(value)) {
            return 0;
        }
        const normalized = ((value % 360) + 360) % 360;
        return normalized > 180 ? roundNumber(normalized - 360, 2) : roundNumber(normalized, 2);
    }

    function toPx(valueM) {
        return roundNumber(Number(valueM || 0) * state.scalePxPerMeter, 3);
    }

    function createId() {
        return `terrain-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    }

    function isTypingTarget(target) {
        return target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function svgElement(tagName, attributes) {
        const element = document.createElementNS(SVG_NS, tagName);
        Object.entries(attributes || {}).forEach(([key, value]) => element.setAttribute(key, String(value)));
        return element;
    }

    function svgText(value, attributes) {
        const element = svgElement('text', attributes);
        element.textContent = value;
        return element;
    }
})();
