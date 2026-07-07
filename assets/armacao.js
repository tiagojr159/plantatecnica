(() => {
    const cfg = window.RIGGING_CONFIG || {};
    const el = {};
    const fmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const df = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    const CAMERA_BASE_DISTANCE = 12;
    const state = {
        components: [],
        map: new Map(),
        projects: [],
        items: [],
        selected: null,
        clipboard: null,
        drag: null,
        previewDrag: null,
        rotateDrag: null,
        resizeDrag: null,
        scale: Number(cfg.scalePxPerMeter || 54),
        snap: Number(cfg.snapStepM || 0.1),
        zCounter: 1,
        camera: { yaw: -34, pitch: 26, distance: CAMERA_BASE_DISTANCE, auto: false },
        project: emptyProject(),
    };

    document.addEventListener('DOMContentLoaded', () => {
        if (!document.getElementById('riggingWorkspace')) return;
        cache();
        bind();
        init().catch(handleError);
    });

    function emptyProject() {
        return {
            id: null,
            editor: 'rigging',
            name: '',
            createdAt: null,
            updatedAt: null,
            canvas: {
                widthM: Number(cfg.defaultCanvasWidthM || 20),
                heightM: Number(cfg.defaultCanvasHeightM || 12),
            },
            view: { showNames: true, showDimensions: true, showDepth: true },
        };
    }

    function cache() {
        [
            'riggingCatalog','riggingWorkspace','riggingPreview','riggingProjectName','riggingCanvasWidth','riggingCanvasHeight',
            'riggingToggleNames','riggingToggleDimensions','riggingWidthStat','riggingHeightStat','riggingDepthStat','riggingTotalItems',
            'riggingNewBtn','riggingSaveBtn','riggingApplyCanvas','riggingProjectList','riggingStatus','riggingSelectionEmpty','riggingSelectionForm',
            'riggingSelectedName','riggingSelectedWidth','riggingSelectedHeight','riggingSelectedDepth','riggingSelectedX','riggingSelectedY','riggingWidthLabel','riggingHeightLabel','riggingDepthLabel','riggingDimensionHint',
            'riggingSelectedZ','riggingSelectedMountMode','riggingZUp50','riggingZDown50','riggingSelectedRotationX','riggingSelectedRotationY','riggingSelectedRotationZ','riggingSelectedColor',
            'riggingDuplicateBtn','riggingDeleteBtn','riggingInvertBtn','riggingRotate30Btn','riggingViewIso','riggingViewFront','riggingViewSide','riggingViewTop',
            'riggingRotateLeftBtn','riggingRotateRightBtn','riggingLibraryToggle','riggingEditToggle','riggingLibraryDock','riggingEditDock','riggingZoomPreset','riggingPreviewWrap','riggingFullscreenBtn'
        ].forEach((id) => { el[id] = document.getElementById(id); });
    }

    function bind() {
        el.riggingCatalog.addEventListener('click', (event) => {
            const button = event.target.closest('[data-component-id]');
            if (button) addComponent(button.dataset.componentId || '');
        });
        el.riggingWorkspace.addEventListener('pointerdown', handlePointerDown);
        el.riggingWorkspace.addEventListener('click', (event) => {
            const node = event.target.closest('[data-item-id]');
            select(node ? node.dataset.itemId : null);
        });
        el.riggingPreview.addEventListener('pointerdown', handlePreviewPointerDown);
        el.riggingPreview.addEventListener('wheel', handlePreviewWheel, { passive: false });
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', releasePointerModes);
        window.addEventListener('pointercancel', releasePointerModes);
        el.riggingProjectList.addEventListener('click', (event) => {
            const node = event.target.closest('[data-project-id]');
            if (node) openProject(node.dataset.projectId || '');
        });
        el.riggingProjectName.addEventListener('input', () => { state.project.name = el.riggingProjectName.value.trim(); });
        el.riggingNewBtn.addEventListener('click', () => newProject(true));
        el.riggingSaveBtn.addEventListener('click', saveProject);
        el.riggingApplyCanvas.addEventListener('click', applyCanvas);
        el.riggingToggleNames.addEventListener('change', syncView);
        el.riggingToggleDimensions.addEventListener('change', syncView);
        ['riggingSelectedWidth','riggingSelectedHeight','riggingSelectedDepth','riggingSelectedX','riggingSelectedY','riggingSelectedZ','riggingSelectedRotationX','riggingSelectedRotationY','riggingSelectedRotationZ','riggingSelectedColor'].forEach((id) => {
            el[id].addEventListener('input', () => updateSelected(false));
            el[id].addEventListener('change', () => updateSelected(true));
            el[id].addEventListener('blur', () => updateSelected(true));
        });
        el.riggingSelectedMountMode.addEventListener('change', () => updateSelected(true));
        el.riggingDuplicateBtn.addEventListener('click', duplicateSelected);
        el.riggingDeleteBtn.addEventListener('click', deleteSelected);
        el.riggingInvertBtn.addEventListener('click', () => rotateSelectedBy(180));
        el.riggingRotate30Btn.addEventListener('click', () => rotateSelectedBy(30));
        el.riggingRotateLeftBtn.addEventListener('click', () => rotateSelectedBy(-15));
        el.riggingRotateRightBtn.addEventListener('click', () => rotateSelectedBy(15));
        el.riggingZUp50.addEventListener('click', () => nudgeSelectedZ(0.5));
        el.riggingZDown50.addEventListener('click', () => nudgeSelectedZ(-0.5));
        el.riggingViewIso.addEventListener('click', () => setCameraView('iso'));
        el.riggingViewFront.addEventListener('click', () => setCameraView('front'));
        el.riggingViewSide.addEventListener('click', () => setCameraView('side'));
        el.riggingViewTop.addEventListener('click', () => setCameraView('top'));
        el.riggingZoomPreset.addEventListener('change', applyZoomPreset);
        el.riggingFullscreenBtn.addEventListener('click', togglePreviewFullscreen);
        document.addEventListener('fullscreenchange', syncFullscreenUi);
        el.riggingLibraryToggle.addEventListener('click', () => toggleSidebar('library'));
        el.riggingEditToggle.addEventListener('click', () => toggleSidebar('edit'));
        el.riggingLibraryDock.addEventListener('click', () => showSidebar('library'));
        el.riggingEditDock.addEventListener('click', () => showSidebar('edit'));
        window.addEventListener('keydown', handleKeys);
    }

    function toggleSidebar(side) {
        const className = side === 'library' ? 'rigging-library-collapsed' : 'rigging-edit-collapsed';
        document.body.classList.toggle(className);
        syncSidebarState();
    }

    function showSidebar(side) {
        const className = side === 'library' ? 'rigging-library-collapsed' : 'rigging-edit-collapsed';
        document.body.classList.remove(className);
        syncSidebarState();
    }


    function clampZoomDistance(value) {
        return clamp(value, (CAMERA_BASE_DISTANCE * 100) / 1500, 200);
    }

    function zoomPercent() {
        return clamp(Math.round((CAMERA_BASE_DISTANCE / Math.max(0.001, state.camera.distance)) * 100), 10, 3000);
    }

    function syncZoomPreset() {
        const percent = zoomPercent();
        const allowed = new Set(['100', '200', '300', '800', '1500', '3000']);
        const exact = String(percent);
        el.riggingZoomPreset.value = allowed.has(exact) ? exact : 'custom';
    }

    function setZoomPercent(percent) {
        const numeric = clamp(Number(percent || 100), 10, 3000);
        state.camera.distance = clampZoomDistance((CAMERA_BASE_DISTANCE * 100) / numeric);
        syncZoomPreset();
        syncFullscreenUi();
    }

    function applyZoomPreset() {
        const value = String(el.riggingZoomPreset.value || 'custom');
        if (value === 'custom') return;
        setZoomPercent(Number(value));
        renderPreview();
    }

    function syncFullscreenUi() {
        const active = Boolean(document.fullscreenElement);
        if (!el.riggingFullscreenBtn) return;
        el.riggingFullscreenBtn.textContent = active ? 'Sair tela inteira' : 'Tela inteira';
        el.riggingFullscreenBtn.setAttribute('aria-pressed', String(active));
        requestAnimationFrame(() => renderPreview());
    }

    async function togglePreviewFullscreen() {
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
                return;
            }
            const target = el.riggingPreviewWrap || el.riggingPreview;
            if (target && target.requestFullscreen) {
                await target.requestFullscreen({ navigationUI: 'hide' });
            }
        } catch (error) {
            console.warn(error);
        }
    }
    function syncSidebarState() {
        const libraryCollapsed = document.body.classList.contains('rigging-library-collapsed');
        const editCollapsed = document.body.classList.contains('rigging-edit-collapsed');
        el.riggingLibraryToggle.setAttribute('aria-expanded', String(!libraryCollapsed));
        el.riggingEditToggle.setAttribute('aria-expanded', String(!editCollapsed));
        el.riggingLibraryDock.hidden = !libraryCollapsed;
        el.riggingEditDock.hidden = !editCollapsed;
        requestAnimationFrame(() => renderPreview());
    }
    async function init() {
        newProject(false);
        setStatus('Carregando componentes e projetos de armacao...', 'info');
        const [componentsPayload, projectsPayload] = await Promise.all([json(api('components')), json(api('projects'))]);
        state.components = (Array.isArray(componentsPayload.components) ? componentsPayload.components : []).map((component) => ({
            ...component,
            id: String(component.id || ''),
            name: String(component.name || 'Componente'),
            image: String(component.image || ''),
            widthM: round(Number(component.widthM || 1), 2),
            heightM: round(Number(component.heightM || 1), 2),
            depthM: round(Number(component.depthM || inferDepth(component.widthM, component.heightM)), 2),
        }));
        state.map = new Map(state.components.map((component) => [component.id, component]));
        state.projects = (Array.isArray(projectsPayload.projects) ? projectsPayload.projects : []).filter((project) => String(project.editor || '') === 'rigging');
        renderAll();
        syncSidebarState();
        syncZoomPreset();
        syncFullscreenUi();
        const queryProject = new URLSearchParams(window.location.search).get('project');
        if (queryProject) await openProject(queryProject);
        startLoop();
        setStatus('Editor 3D pronto. Escadas agora aparecem em degraus no preview.', 'success');
    }

    function newProject(showStatus) {
        state.project = emptyProject();
        state.items = [];
        state.selected = null;
        state.drag = null;
        state.previewDrag = null;
        state.rotateDrag = null;
        state.camera = { yaw: -34, pitch: 26, distance: CAMERA_BASE_DISTANCE, auto: false };
        state.zCounter = 1;
        syncInputs();
        renderAll();
        syncZoomPreset();
        syncFullscreenUi();
        if (showStatus) setStatus('Novo projeto de armacao criado.', 'info');
    }

    function syncInputs() {
        el.riggingProjectName.value = state.project.name;
        el.riggingCanvasWidth.value = String(state.project.canvas.widthM);
        el.riggingCanvasHeight.value = String(state.project.canvas.heightM);
        el.riggingToggleNames.checked = !!state.project.view.showNames;
        el.riggingToggleDimensions.checked = !!state.project.view.showDimensions;
    }

    function syncView() {
        state.project.view.showNames = el.riggingToggleNames.checked;
        state.project.view.showDimensions = el.riggingToggleDimensions.checked;
        renderWorkspace();
        renderPreview();
    }

    function renderAll() {
        renderCatalog();
        renderWorkspace();
        renderSelection();
        renderProjects();
        renderPreview();
        renderStats();
    }

    function renderCatalog() {
        el.riggingCatalog.innerHTML = '';
        if (!state.components.length) {
            el.riggingCatalog.innerHTML = '<div class="empty-state">Nenhum componente encontrado.</div>';
            return;
        }
        const fragment = document.createDocumentFragment();
        state.components.forEach((component) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'catalog-card';
            button.dataset.componentId = component.id;
            button.innerHTML = '<div class="catalog-thumb"><img src="' + component.image + '" alt="' + escapeHtml(component.name) + '"></div>'
                + '<div class="catalog-meta"><strong>' + escapeHtml(component.name) + '</strong><span>' + escapeHtml(component.category || 'Outros') + '</span>'
                + '<span>X ' + meters(component.widthM) + ' | Y ' + meters(component.heightM) + ' | Z ' + meters(component.depthM) + '</span>'
                + '<span class="muted-note">Clique para inserir na armacao 3D.</span></div>';
            fragment.appendChild(button);
        });
        el.riggingCatalog.appendChild(fragment);
    }

    function renderWorkspace() {
        const widthPx = Math.max(360, state.project.canvas.widthM * state.scale);
        const heightPx = Math.max(320, state.project.canvas.heightM * state.scale);
        el.riggingWorkspace.style.width = widthPx + 'px';
        el.riggingWorkspace.style.height = heightPx + 'px';
        el.riggingWorkspace.innerHTML = '';
        const fragment = document.createDocumentFragment();
        state.items.slice().sort((left, right) => left.zIndex - right.zIndex).forEach((item) => {
            const node = document.createElement('button');
            const footprint = footprintDimensions(item);
            node.type = 'button';
            node.className = 'canvas-item rigging-item' + (item.id === state.selected ? ' is-selected' : '');
            node.dataset.itemId = item.id;
            node.style.left = (item.x * state.scale) + 'px';
            node.style.bottom = (item.y * state.scale) + 'px';
            node.style.width = (footprint.widthM * state.scale) + 'px';
            node.style.height = (footprint.heightM * state.scale) + 'px';
            node.style.transform = 'rotate(' + (item.rotationZDeg || 0) + 'deg)';
            node.style.zIndex = String(item.zIndex);
            node.style.background = 'linear-gradient(135deg, ' + item.color + ' 0%, ' + shade(item.color, 1.18) + ' 100%)';
            node.innerHTML = (item.image ? '<img class="rigging-item__image" src="' + item.image + '" alt="' + escapeHtml(item.name) + '">' : '')
                + '<span class="rigging-item__surface"></span><span class="rigging-item__axis" aria-hidden="true"></span>'
                + (item.id === state.selected ? '<span class="rigging-item__delete-handle" data-delete-handle="1" title="Remover da area">x</span><span class="rigging-item__rotate-handle" data-rotate-handle="1" title="Arraste para girar"></span><span class="rigging-item__resize-handle rigging-item__resize-handle--top" data-resize-handle="height" title="Arraste para aumentar a altura"></span><span class="rigging-item__resize-handle rigging-item__resize-handle--right" data-resize-handle="width" title="Arraste para aumentar a largura"></span><span class="rigging-item__resize-handle rigging-item__resize-handle--corner" data-resize-handle="both" title="Arraste para aumentar largura e altura"></span>' : '')
                + (state.project.view.showNames ? '<span class="item-title">' + escapeHtml(item.name) + '</span>' : '')
                + (state.project.view.showDimensions ? '<span class="dimension-badge dimension-badge--width">' + mountModeLabel(item.mountMode) + ' ' + meters(footprint.widthM) + ' x ' + meters(footprint.heightM) + '</span><span class="dimension-badge dimension-badge--height">' + depthBadgeLabel(item) + '</span>' : '')
                + '<span class="rigging-item__elevation">Z ' + meters(item.z) + '</span>';
            fragment.appendChild(node);
        });
        el.riggingWorkspace.appendChild(fragment);
    }

    function renderSelection() {
        const current = selectedItem();
        const hasSelection = Boolean(current);
        el.riggingSelectionEmpty.hidden = hasSelection;
        el.riggingSelectionForm.hidden = !hasSelection;
        if (!current) return;
        el.riggingSelectedName.value = current.name;
        el.riggingSelectedWidth.value = inputValue(current.widthM);
        el.riggingSelectedHeight.value = inputValue(current.heightM);
        el.riggingSelectedDepth.value = inputValue(current.depthM);
        el.riggingSelectedX.value = inputValue(current.x);
        el.riggingSelectedY.value = inputValue(current.y);
        el.riggingSelectedZ.value = inputValue(current.z);
        el.riggingSelectedMountMode.value = normalizeMountMode(current.mountMode);
        updateDimensionLabels(current);
        el.riggingSelectedRotationX.value = String(current.rotationXDeg || 0);
        el.riggingSelectedRotationY.value = String(current.rotationYDeg || 0);
        el.riggingSelectedRotationZ.value = String(current.rotationZDeg || 0);
        el.riggingSelectedColor.value = normalizeColor(current.color);
    }

    function updateDimensionLabels(item) {
        const mode = normalizeMountMode(item?.mountMode);
        if (mode === 'wall_x') {
            el.riggingWidthLabel.textContent = 'Largura frontal (m)';
            el.riggingHeightLabel.textContent = 'Altura vertical (m)';
            el.riggingDepthLabel.textContent = 'Espessura (m)';
            el.riggingDimensionHint.textContent = 'Essa peca esta em pe na parede frontal. Na base 2D voce vai notar largura e espessura; a altura aparece principalmente no preview 3D.';
            return;
        }
        if (mode === 'wall_y') {
            el.riggingWidthLabel.textContent = 'Comprimento lateral (m)';
            el.riggingHeightLabel.textContent = 'Altura vertical (m)';
            el.riggingDepthLabel.textContent = 'Espessura (m)';
            el.riggingDimensionHint.textContent = 'Essa peca esta em pe na parede lateral. Na base 2D voce vai notar comprimento e espessura; a altura aparece principalmente no preview 3D.';
            return;
        }
        el.riggingWidthLabel.textContent = 'Largura X (m)';
        el.riggingHeightLabel.textContent = 'Altura Y (m)';
        el.riggingDepthLabel.textContent = 'Profundidade Z (m)';
        el.riggingDimensionHint.textContent = 'Essa peca esta apoiada no piso. Largura e altura mudam a base 2D; a profundidade aparece como volume no preview 3D.';
    }
    function depthBadgeLabel(item) {
        const ref = (String(item.componentId || '') + ' ' + String(item.name || '')).toLowerCase();
        if (ref.includes('grid') || ref.includes('barra') || ref.includes('ferro')) {
            const component = state.map.get(String(item.componentId || '')); if (component && Number(component.diameterMm || 0) > 0) { return 'Dia ' + Math.round(Number(component.diameterMm)) + ' mm'; } return 'Diam ' + meters(item.depthM);
        }
        const mode = normalizeMountMode(item.mountMode);
        return (mode === 'floor' ? 'Prof. ' : 'Esp. ') + meters(item.depthM);
    }
    function renderProjects() {
        el.riggingProjectList.innerHTML = '';
        if (!state.projects.length) {
            el.riggingProjectList.innerHTML = '<div class="empty-state">Nenhum projeto de armacao salvo.</div>';
            return;
        }
        const fragment = document.createDocumentFragment();
        state.projects.forEach((project) => {
            const currentStats = project.stats || {};
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'project-card' + (project.id === state.project.id ? ' is-active' : '');
            button.dataset.projectId = String(project.id || '');
            button.innerHTML = '<strong>' + escapeHtml(project.name || 'Projeto sem nome') + '</strong><span>' + escapeHtml(projectDate(project.updatedAt)) + '</span>'
                + '<div class="project-card__meta"><span>' + Number(project.itemCount || 0) + ' pecas</span><span>X ' + meters(currentStats.widthM || 0) + '</span><span>Y ' + meters(currentStats.heightM || 0) + '</span><span>Z ' + meters(currentStats.depthM || 0) + '</span></div>';
            fragment.appendChild(button);
        });
        el.riggingProjectList.appendChild(fragment);
    }

    function renderStats() {
        const currentStats = stats(state.items);
        el.riggingWidthStat.textContent = meters(currentStats.widthM);
        el.riggingHeightStat.textContent = meters(currentStats.heightM);
        el.riggingDepthStat.textContent = meters(currentStats.depthM);
        el.riggingTotalItems.textContent = String(state.items.length);
    }
    function addComponent(id) {
        const component = state.map.get(String(id));
        if (!component) return;
        const offset = state.items.length * 0.4;
        const next = clampItem({
            id: uid(),
            componentId: component.id,
            name: component.name,
            image: component.image || '',
            widthM: Number(component.widthM || 1),
            heightM: Number(component.heightM || 1),
            depthM: Number(component.depthM || inferDepth(component.widthM, component.heightM)),
            mountMode: defaultMountMode(component.id),
            x: 1 + offset,
            y: 1 + offset,
            z: 0,
            zIndex: state.zCounter++,
            rotationDeg: 0,
            rotationXDeg: 0,
            rotationYDeg: 0,
            rotationZDeg: 0,
            color: defaultColor(component.id),
        });
        state.items.push(next);
        state.selected = next.id;
        renderAll();
        setStatus('Componente ' + component.name + ' adicionado na armacao.', 'success');
    }

    function handlePointerDown(event) {
        const node = event.target.closest('[data-item-id]');
        if (!node) return;
        select(node.dataset.itemId || null);
        const current = selectedItem();
        if (!current) return;
        const deleteHandle = event.target.closest('[data-delete-handle]');
        if (deleteHandle) {
            deleteSelected();
            event.preventDefault();
            return;
        }
        const resizeHandle = event.target.closest('[data-resize-handle]');
        if (resizeHandle) {
            state.resizeDrag = {
                id: current.id,
                mode: resizeHandle.dataset.resizeHandle || 'height',
                startX: event.clientX,
                startY: event.clientY,
                startWidth: current.widthM,
                startHeight: current.heightM,
            };
            event.preventDefault();
            return;
        }
        const rotateHandle = event.target.closest('[data-rotate-handle]');
        if (rotateHandle) {
            state.rotateDrag = {
                id: current.id,
                startAngle: pointerAngle(event.clientX, event.clientY, current),
                startRotation: current.rotationZDeg || 0,
            };
            event.preventDefault();
            return;
        }
        if (event.shiftKey) {
            state.drag = { id: current.id, mode: 'z', startClientY: event.clientY, startZ: current.z };
            event.preventDefault();
            return;
        }
        const p = point(event.clientX, event.clientY);
        state.drag = { id: current.id, mode: 'xy', dx: p.x - current.x, dy: p.y - current.y };
    }

    function handlePointerMove(event) {
        if (state.previewDrag) {
            const deltaX = event.clientX - state.previewDrag.startX;
            const deltaY = event.clientY - state.previewDrag.startY;
            state.camera.auto = false;
            state.camera.yaw = state.previewDrag.startYaw + deltaX * 0.38;
            state.camera.pitch = clamp(state.previewDrag.startPitch - deltaY * 0.24, -65, 85);
            renderPreview();
            return;
        }
        if (state.resizeDrag) {
            const current = selectedItem();
            if (!current || current.id !== state.resizeDrag.id) return;
            const deltaX = (event.clientX - state.resizeDrag.startX) / state.scale;
            const deltaY = (state.resizeDrag.startY - event.clientY) / state.scale;
            if (state.resizeDrag.mode === 'width' || state.resizeDrag.mode === 'both') {
                setSemanticWidth(current, state.resizeDrag.startWidth + deltaX);
            }
            if (state.resizeDrag.mode === 'height' || state.resizeDrag.mode === 'both') {
                setSemanticHeight(current, state.resizeDrag.startHeight + deltaY);
            }
            clampItemInPlace(current);
            updateDimensionLabels(current);
            renderWorkspace();
            renderPreview();
            renderSelection();
            renderStats();
            return;
        }
        if (state.rotateDrag) {
            const current = selectedItem();
            if (!current || current.id !== state.rotateDrag.id) return;
            const angle = pointerAngle(event.clientX, event.clientY, current);
            current.rotationZDeg = normalizeRotation(state.rotateDrag.startRotation + (angle - state.rotateDrag.startAngle));
            current.rotationDeg = current.rotationZDeg;
            renderWorkspace();
            renderPreview();
            renderSelection();
            renderStats();
            return;
        }
        if (!state.drag) return;
        const current = selectedItem();
        if (!current || current.id !== state.drag.id) return;
        if (state.drag.mode === 'z') {
            const deltaM = (state.drag.startClientY - event.clientY) / state.scale;
            current.z = round(Math.max(0, snap(Number(state.drag.startZ || 0) + deltaM)), 2);
            clampItemInPlace(current);
            el.riggingSelectedZ.value = inputValue(current.z);
        } else {
            const p = point(event.clientX, event.clientY);
            current.x = p.x - state.drag.dx;
            current.y = p.y - state.drag.dy;
            clampItemInPlace(current);
        }
        renderWorkspace();
        renderPreview();
        renderSelection();
        renderStats();
    }

    function handlePreviewPointerDown(event) {
        state.previewDrag = {
            startX: event.clientX,
            startY: event.clientY,
            startYaw: state.camera.yaw,
            startPitch: state.camera.pitch,
        };
        state.camera.auto = false;
        el.riggingPreview.classList.add('is-orbiting');
        event.preventDefault();
    }

    function handlePreviewWheel(event) {
        event.preventDefault();
        state.camera.auto = false;
        state.camera.distance = clampZoomDistance(state.camera.distance + Math.sign(event.deltaY) * 1.2);
        syncZoomPreset();
        syncFullscreenUi();
        renderPreview();
    }

    function releasePointerModes() {
        state.drag = null;
        state.previewDrag = null;
        state.rotateDrag = null;
        state.resizeDrag = null;
        el.riggingPreview.classList.remove('is-orbiting');
    }

    function pointerAngle(clientX, clientY, item) {
        const p = point(clientX, clientY);
        const footprint = footprintDimensions(item);
        return Math.atan2(p.y - (item.y + footprint.heightM / 2), p.x - (item.x + footprint.widthM / 2)) * 180 / Math.PI;
    }

    function select(id) {
        state.selected = id;
        renderWorkspace();
        renderSelection();
        renderPreview();
    }

    function selectedItem() {
        return state.items.find((item) => item.id === state.selected) || null;
    }

    function updateSelected(syncForm) {
        const current = selectedItem();
        if (!current) return;
        current.widthM = numberValue(el.riggingSelectedWidth.value, current.widthM);
        current.heightM = numberValue(el.riggingSelectedHeight.value, current.heightM);
        current.depthM = numberValue(el.riggingSelectedDepth.value, current.depthM);
        current.x = numberValue(el.riggingSelectedX.value, current.x);
        current.y = numberValue(el.riggingSelectedY.value, current.y);
        current.z = numberValue(el.riggingSelectedZ.value, current.z);
        current.mountMode = normalizeMountMode(el.riggingSelectedMountMode.value || current.mountMode);
        current.rotationXDeg = normalizeRotation(numberValue(el.riggingSelectedRotationX.value, current.rotationXDeg));
        current.rotationYDeg = normalizeRotation(numberValue(el.riggingSelectedRotationY.value, current.rotationYDeg));
        current.rotationZDeg = normalizeRotation(numberValue(el.riggingSelectedRotationZ.value, current.rotationZDeg));
        current.rotationDeg = current.rotationZDeg;
        current.color = normalizeColor(el.riggingSelectedColor.value);
        clampItemInPlace(current);
        updateDimensionLabels(current);
        renderWorkspace();
        renderPreview();
        if (syncForm) renderSelection();
        renderStats();
    }


    function nudgeSelectedZ(delta) {
        const current = selectedItem();
        if (!current) return;
        current.z = round((Number(current.z || 0) + Number(delta || 0)), 2);
        clampItemInPlace(current);
        el.riggingSelectedZ.value = inputValue(current.z);
        renderWorkspace();
        renderSelection();
        renderPreview();
        renderStats();
    }
    function duplicateSelected() {
        const current = selectedItem();
        if (!current) return;
        const copy = clampItem({ ...current, id: uid(), x: current.x + 0.4, y: current.y + 0.4, z: current.z + 0.1, zIndex: state.zCounter++ });
        state.items.push(copy);
        state.selected = copy.id;
        renderAll();
    }

    function deleteSelected() {
        const current = selectedItem();
        if (!current) return;
        state.items = state.items.filter((item) => item.id !== current.id);
        state.selected = null;
        renderAll();
    }

    function rotateSelectedBy(delta) {
        const current = selectedItem();
        if (!current) return;
        current.rotationZDeg = normalizeRotation((current.rotationZDeg || 0) + delta);
        current.rotationDeg = current.rotationZDeg;
        renderWorkspace();
        renderSelection();
        renderPreview();
        renderStats();
    }

    function setCameraView(mode) {
        state.camera.auto = false;
        if (mode === 'front') {
            state.camera.yaw = 0;
            state.camera.pitch = 12;
            state.camera.distance = 8;
        } else if (mode === 'side') {
            state.camera.yaw = 90;
            state.camera.pitch = 12;
            state.camera.distance = 8;
        } else if (mode === 'top') {
            state.camera.yaw = 0;
            state.camera.pitch = 82;
            state.camera.distance = 7;
        } else {
            state.camera.yaw = -34;
            state.camera.pitch = 26;
            state.camera.distance = 8;
        }
        syncZoomPreset();
        syncFullscreenUi();
        renderPreview();
        setStatus('Camera ajustada para a vista ' + (mode === 'iso' ? 'isometrica' : mode === 'front' ? 'frontal' : mode === 'side' ? 'lateral' : 'superior') + '.', 'info');
    }

    function applyCanvas() {
        state.project.canvas.widthM = clamp(numberValue(el.riggingCanvasWidth.value, state.project.canvas.widthM), 2, 200);
        state.project.canvas.heightM = clamp(numberValue(el.riggingCanvasHeight.value, state.project.canvas.heightM), 2, 200);
        state.items.forEach(clampItemInPlace);
        syncInputs();
        renderAll();
    }

    async function saveProject() {
        const payload = {
            id: state.project.id,
            editor: 'rigging',
            name: state.project.name || el.riggingProjectName.value.trim() || 'Projeto de armacao sem nome',
            createdAt: state.project.createdAt,
            canvas: state.project.canvas,
            view: state.project.view,
            items: state.items.map((item) => ({ ...item, rotationDeg: item.rotationZDeg })),
            stats: stats(state.items),
        };
        setStatus('Salvando projeto de armacao...', 'info');
        const response = await json(api('save_project'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (response.project) hydrate(response.project);
        const projectsPayload = await json(api('projects'));
        state.projects = (Array.isArray(projectsPayload.projects) ? projectsPayload.projects : []).filter((project) => String(project.editor || '') === 'rigging');
        renderProjects();
        setStatus('Projeto de armacao salvo com sucesso.', 'success');
    }

    async function openProject(id) {
        setStatus('Abrindo projeto de armacao...', 'info');
        const response = await json(api('project', { id }));
        if (!response.project || String(response.project.editor || '') !== 'rigging') throw new Error('Esse projeto salvo pertence a outro editor.');
        hydrate(response.project);
        renderAll();
        setStatus('Projeto ' + (response.project.name || 'sem nome') + ' carregado.', 'success');
    }

    function hydrate(project) {
        state.project.id = project.id || null;
        state.project.name = String(project.name || '');
        state.project.createdAt = project.createdAt || null;
        state.project.updatedAt = project.updatedAt || null;
        state.project.canvas.widthM = clamp(numberValue(project.canvas && project.canvas.widthM, 20), 2, 200);
        state.project.canvas.heightM = clamp(numberValue(project.canvas && project.canvas.heightM, 12), 2, 200);
        state.project.view = {
            showNames: typeof project.view?.showNames === 'boolean' ? project.view.showNames : true,
            showDimensions: typeof project.view?.showDimensions === 'boolean' ? project.view.showDimensions : true,
            showDepth: typeof project.view?.showDepth === 'boolean' ? project.view.showDepth : true,
        };
        state.items = (Array.isArray(project.items) ? project.items : []).map((item) => clampItem({
            id: String(item.id || uid()),
            componentId: String(item.componentId || ''),
            name: String(item.name || 'Componente'),
            image: String(item.image || ''),
            widthM: numberValue(item.widthM, 1),
            heightM: numberValue(item.heightM, 1),
            depthM: numberValue(item.depthM, inferDepth(item.widthM, item.heightM)),
            mountMode: normalizeMountMode(item.mountMode || defaultMountMode(item.componentId)),
            x: numberValue(item.x, 0),
            y: numberValue(item.y, 0),
            z: clamp(numberValue(item.z, 0), 0, 100),
            zIndex: Number(item.zIndex || 1),
            rotationDeg: numberValue(item.rotationDeg, 0),
            rotationXDeg: numberValue(item.rotationXDeg, 0),
            rotationYDeg: numberValue(item.rotationYDeg, 0),
            rotationZDeg: numberValue(item.rotationZDeg, item.rotationDeg),
            color: normalizeColor(item.color || defaultColor(item.componentId)),
        }));
        state.selected = state.items[0] ? state.items[0].id : null;
        state.zCounter = Math.max(1, ...state.items.map((item) => Number(item.zIndex || 1))) + 1;
        syncInputs();
    }

    function handleKeys(event) {
        if (document.body.dataset.page !== 'armacao') return;
        const target = event.target;
        if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
        const current = selectedItem();
        const keyLower = String(event.key || '').toLowerCase();
        const hasCtrl = (event.ctrlKey || event.metaKey) && !event.altKey;
        if (hasCtrl && keyLower === 'c') {
            if (current) {
                state.clipboard = { ...current };
                setStatus('Peca copiada. Use Ctrl+V para colar.', 'info');
            }
            event.preventDefault();
            return;
        }
        if (hasCtrl && keyLower === 'v') {
            if (state.clipboard) {
                const base = state.clipboard;
                const offset = 0.4;
                const next = clampItem({
                    ...base,
                    id: uid(),
                    x: Number(base.x || 0) + offset,
                    y: Number(base.y || 0) + offset,
                    zIndex: state.zCounter++,
                });
                state.items.push(next);
                state.selected = next.id;
                renderAll();
                setStatus('Peca colada.', 'success');
            }
            event.preventDefault();
            return;
        }
        if (keyLower === 'a') {
            state.camera.auto = !state.camera.auto;
            setStatus(state.camera.auto ? 'Orbita automatica ativada.' : 'Orbita automatica pausada.', 'info');
            renderPreview();
            event.preventDefault();
            return;
        }
        let changed = false;
        if (current && (event.shiftKey || event.ctrlKey)) {
            const step = event.ctrlKey ? 0.5 : state.snap;
            if (event.key === 'ArrowLeft') { current.x -= step; changed = true; }
            if (event.key === 'ArrowRight') { current.x += step; changed = true; }
            if (event.key === 'ArrowUp') { current.y += step; changed = true; }
            if (event.key === 'ArrowDown') { current.y -= step; changed = true; }
        } else {
            if (event.key === 'ArrowLeft') { state.camera.auto = false; state.camera.yaw -= 6; renderPreview(); event.preventDefault(); return; }
            if (event.key === 'ArrowRight') { state.camera.auto = false; state.camera.yaw += 6; renderPreview(); event.preventDefault(); return; }
            if (event.key === 'ArrowUp') { state.camera.auto = false; state.camera.pitch = clamp(state.camera.pitch + 3, -65, 85); renderPreview(); event.preventDefault(); return; }
            if (event.key === 'ArrowDown') { state.camera.auto = false; state.camera.pitch = clamp(state.camera.pitch - 3, -65, 85); renderPreview(); event.preventDefault(); return; }
        }
        if (current) {
            const key = event.key.toLowerCase();
            if (event.key === 'PageUp') { current.z += event.ctrlKey ? 0.5 : state.snap; changed = true; }
            if (event.key === 'PageDown') { current.z -= event.ctrlKey ? 0.5 : state.snap; changed = true; }
            if (key === 'q') { current.rotationZDeg -= 5; changed = true; }
            if (key === 'e') { current.rotationZDeg += 5; changed = true; }
            if (key === 'r') { current.rotationXDeg += 5; changed = true; }
            if (key === 'f') { current.rotationXDeg -= 5; changed = true; }
            if (key === 't') { current.rotationYDeg += 5; changed = true; }
            if (key === 'g') { current.rotationYDeg -= 5; changed = true; }
            if (event.key === '[') { current.depthM -= 0.02; changed = true; }
            if (event.key === ']') { current.depthM += 0.02; changed = true; }
        }
        if (!changed) return;
        event.preventDefault();
        clampItemInPlace(current);
        renderWorkspace();
        renderSelection();
        renderPreview();
        renderStats();
    }
    function startLoop() {
        let last = 0;
        const tick = (timestamp) => {
            const delta = timestamp - last;
            last = timestamp;
            if (state.camera.auto && delta > 0) {
                state.camera.yaw += delta * 0.02;
                renderPreview();
            }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    function renderPreview() {
        const canvas = el.riggingPreview;
        const rect = canvas.getBoundingClientRect();
        const width = Math.max(640, Math.round(rect.width || canvas.width));
        const height = Math.max(420, Math.round(rect.height || canvas.height));
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
        drawScene(canvas);
    }

    function drawScene(canvas) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        if (!ctx) return;
        ctx.clearRect(0, 0, width, height);
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#0f172a');
        gradient.addColorStop(1, '#1e293b');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        drawGrid(ctx, width, height);

        const currentStats = stats(state.items);
        const bounds = sceneBounds(state.items);
        const baseWidthM = Math.max(1, Number(state.project && state.project.canvas ? state.project.canvas.widthM : 0) || 0);
        const baseHeightM = Math.max(1, Number(state.project && state.project.canvas ? state.project.canvas.heightM : 0) || 0);
        const baseRadius = Math.hypot(baseWidthM, baseHeightM) / 2;
        // Use the base center for X/Y so 2D placement matches 3D placement.
        // Keep Z centered on the scene so vertical framing stays comfortable.
        const center = { x: baseWidthM / 2, y: baseHeightM / 2, z: bounds.center.z };
        const radius = Math.max(bounds.radius, baseRadius, 4);
        const baseScale = Math.max(18, Math.min(width, height) / (radius * 3.1));
        const zoomScale = clamp(CAMERA_BASE_DISTANCE / Math.max(0.001, state.camera.distance), 0.65, 15);
        const scale = baseScale * zoomScale;

        // Draw the base outline on the floor (z=0) so the reference plane is visible.
        const floorZ = 0;
        const baseCorners = [
            projectPoint({ x: 0, y: 0, z: floorZ }, center, width, height, scale),
            projectPoint({ x: baseWidthM, y: 0, z: floorZ }, center, width, height, scale),
            projectPoint({ x: baseWidthM, y: baseHeightM, z: floorZ }, center, width, height, scale),
            projectPoint({ x: 0, y: baseHeightM, z: floorZ }, center, width, height, scale),
        ];
        ctx.save();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(baseCorners[0].x, baseCorners[0].y);
        ctx.lineTo(baseCorners[1].x, baseCorners[1].y);
        ctx.lineTo(baseCorners[2].x, baseCorners[2].y);
        ctx.lineTo(baseCorners[3].x, baseCorners[3].y);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
        const faces = [];
        const labels = [];

        state.items.forEach((item) => {
            buildMeshes(item).forEach((mesh) => {
                const vertices = mesh.vertices.map((point) => projectPoint(point, center, width, height, scale));
                mesh.faces.forEach((face) => {
                    const points = face.map((index) => vertices[index]);
                    faces.push({
                        points,
                        depth: points.reduce((sum, point) => sum + point.d, 0) / points.length,
                        fill: shade(item.color, mesh.shade || 0.92),
                        stroke: item.id === state.selected ? '#f8fafc' : 'rgba(226,232,240,0.32)',
                        lineWidth: item.id === state.selected ? 2.2 : 1,
                    });
                });
            });
            labels.push({
                name: item.name,
                point: projectPoint({ x: item.x + item.widthM / 2, y: item.y + item.heightM / 2, z: item.z + item.depthM + 0.12 }, center, width, height, scale),
            });
        });

        faces.sort((left, right) => left.depth - right.depth);
        faces.forEach((face) => {
            ctx.beginPath();
            face.points.forEach((point, index) => {
                if (index === 0) ctx.moveTo(point.x, point.y);
                else ctx.lineTo(point.x, point.y);
            });
            ctx.closePath();
            ctx.fillStyle = face.fill;
            ctx.fill();
            ctx.strokeStyle = face.stroke;
            ctx.lineWidth = face.lineWidth;
            ctx.stroke();
        });

        if (state.project.view.showNames) {
            ctx.font = '600 12px Segoe UI';
            ctx.textAlign = 'center';
            labels.forEach(({ name, point }) => {
                const widthText = ctx.measureText(name).width + 16;
                ctx.fillStyle = 'rgba(15,23,42,0.8)';
                ctx.fillRect(point.x - widthText / 2, point.y - 20, widthText, 18);
                ctx.fillStyle = '#f8fafc';
                ctx.fillText(name, point.x, point.y - 7);
            });
        }

        if (state.project.view.showDimensions) {
            ctx.fillStyle = 'rgba(226,232,240,0.9)';
            ctx.font = '12px Segoe UI';
            ctx.textAlign = 'left';
            ctx.fillText('Vista ' + viewLabel() + ' | yaw ' + Math.round(state.camera.yaw) + ' deg | pitch ' + Math.round(state.camera.pitch) + ' deg | zoom ' + zoomPercent() + '% | pecas ' + state.items.length, 18, 26);
            ctx.fillText('Estrutura ' + meters(bounds.widthM || currentStats.widthM) + ' x ' + meters(bounds.heightM || currentStats.heightM) + ' x ' + meters(bounds.depthM || currentStats.depthM), 18, 44);
        }

        drawOrientationGizmo(ctx, width, height);
    }

    function sceneBounds(items) {
        if (!items.length) {
            return {
                center: { x: 0, y: 0, z: 0.5 },
                radius: 4,
                widthM: 0,
                heightM: 0,
                depthM: 0,
            };
        }
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let minZ = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        let maxZ = Number.NEGATIVE_INFINITY;
        const vertices = [];
        items.forEach((item) => {
            buildMeshes(item).forEach((mesh) => {
                mesh.vertices.forEach((vertex) => {
                    vertices.push(vertex);
                    minX = Math.min(minX, vertex.x);
                    minY = Math.min(minY, vertex.y);
                    minZ = Math.min(minZ, vertex.z);
                    maxX = Math.max(maxX, vertex.x);
                    maxY = Math.max(maxY, vertex.y);
                    maxZ = Math.max(maxZ, vertex.z);
                });
            });
        });
        const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 };
        const radius = vertices.reduce((maxRadius, vertex) => {
            const distance = Math.hypot(vertex.x - center.x, vertex.y - center.y, vertex.z - center.z);
            return Math.max(maxRadius, distance);
        }, 2);
        return {
            center,
            radius,
            widthM: round(Math.max(0, maxX - minX), 2),
            heightM: round(Math.max(0, maxY - minY), 2),
            depthM: round(Math.max(0, maxZ - minZ), 2),
        };
    }


    function viewLabel() {
        const pitch = Number(state.camera.pitch || 0);
        const yaw = normalizeRotation(Number(state.camera.yaw || 0));
        if (pitch > 65) return 'Topo';
        if (pitch < -35) return 'Baixo';
        const toNearest = (target) => Math.min(Math.abs(yaw - target), 360 - Math.abs(yaw - target));
        if (toNearest(0) <= 25) return 'Frente';
        if (toNearest(180) <= 25) return 'Tras';
        if (toNearest(90) <= 25 || toNearest(270) <= 25) return 'Lateral';
        return 'Angulo';
    }

    function drawOrientationGizmo(ctx, width, height) {
        const origin = { x: width - 72, y: height - 72 };
        const size = 42;
        ctx.save();
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.strokeStyle = 'rgba(226, 232, 240, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(origin.x - 58, origin.y - 58, 116, 116, 14);
        ctx.fill();
        ctx.stroke();
        ctx.globalAlpha = 1;

        const projectDir = (vec) => {
            const yaw = radians(state.camera.yaw);
            const pitch = radians(state.camera.pitch);
            const yawRotated = { x: vec.x * Math.cos(yaw) - vec.y * Math.sin(yaw), y: vec.x * Math.sin(yaw) + vec.y * Math.cos(yaw), z: vec.z };
            const pitchRotated = { x: yawRotated.x, y: yawRotated.y * Math.cos(pitch) - yawRotated.z * Math.sin(pitch), z: yawRotated.y * Math.sin(pitch) + yawRotated.z * Math.cos(pitch) };
            return { x: pitchRotated.x, y: -pitchRotated.z };
        };

        const axes = [
            { key: 'X', vec: { x: 1, y: 0, z: 0 }, color: '#ef4444' },
            { key: 'Y', vec: { x: 0, y: 1, z: 0 }, color: '#22c55e' },
            { key: 'Z', vec: { x: 0, y: 0, z: 1 }, color: '#3b82f6' },
        ];

        ctx.font = '700 11px Segoe UI';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        axes.forEach((axis) => {
            const d = projectDir(axis.vec);
            const end = { x: origin.x + d.x * size, y: origin.y + d.y * size };
            ctx.strokeStyle = axis.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(origin.x, origin.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            ctx.fillStyle = axis.color;
            ctx.beginPath();
            ctx.arc(end.x, end.y, 4.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#e2e8f0';
            ctx.fillText(axis.key, end.x, end.y - 10);
        });

        ctx.fillStyle = 'rgba(226, 232, 240, 0.92)';
        ctx.font = '700 12px Segoe UI';
        ctx.textAlign = 'left';
        ctx.fillText('Vista: ' + viewLabel(), origin.x - 50, origin.y + 50);
        ctx.restore();
    }
    function drawGrid(ctx, width, height) {
        ctx.strokeStyle = 'rgba(148,163,184,0.14)';
        for (let x = 0; x <= width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = 0; y <= height; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(226,232,240,0.2)';
        ctx.beginPath();
        ctx.moveTo(0, height * 0.7 + 0.5);
        ctx.lineTo(width, height * 0.7 + 0.5);
        ctx.stroke();
    }

    function buildMeshes(item) {
        const shape = componentShape(item);
        if (shape === 'frame') return frameMeshes(item);
        if (shape === 'angle') return angleMeshes(item);
        return isStair(item) && normalizeMountMode(item.mountMode) === 'floor' ? stairMeshes(item) : [cuboid(item, 0.92)];
    }

    function componentShape(item) {
        const component = state.map.get(String(item.componentId || ''));
        return String(component?.shape || '').toLowerCase().trim();
    }

    function isStair(item) {
        const ref = (String(item.componentId || '') + ' ' + String(item.name || '')).toLowerCase().trim();
        if (ref.includes('base')) return false;
        return ref.startsWith('escada') || ref.includes(' escada');
    }

    function stairMeshes(item) {
        const steps = Math.max(3, Math.min(6, Math.round(item.heightM / 0.22) || 4));
        const stepHeight = item.heightM / steps;
        const stepWidth = item.widthM / steps;
        const meshes = [];
        for (let index = 0; index < steps; index += 1) {
            meshes.push(cuboid({
                x: item.x + stepWidth * index,
                y: item.y,
                z: item.z,
                widthM: stepWidth,
                heightM: stepHeight * (index + 1),
                depthM: item.depthM,
                mountMode: 'floor',
                rotationXDeg: item.rotationXDeg,
                rotationYDeg: item.rotationYDeg,
                rotationZDeg: item.rotationZDeg,
            }, 0.82 + (index / steps) * 0.14));
        }
        return meshes;
    }

    function cuboid(item, shadeFactor) {
        const box = boxDimensions(item);
        const center = { x: box.x + box.widthM / 2, y: box.y + box.heightM / 2, z: box.z + box.depthM / 2 };
        const vertices = [
            { x: box.x, y: box.y, z: box.z },
            { x: box.x + box.widthM, y: box.y, z: box.z },
            { x: box.x + box.widthM, y: box.y + box.heightM, z: box.z },
            { x: box.x, y: box.y + box.heightM, z: box.z },
            { x: box.x, y: box.y, z: box.z + box.depthM },
            { x: box.x + box.widthM, y: box.y, z: box.z + box.depthM },
            { x: box.x + box.widthM, y: box.y + box.heightM, z: box.z + box.depthM },
            { x: box.x, y: box.y + box.heightM, z: box.z + box.depthM },
        ].map((point) => rotate3d(point, center, item.rotationXDeg, item.rotationYDeg, item.rotationZDeg));
        return { vertices, faces: [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]], shade: shadeFactor || 0.92 };
    }

    function cuboidBox(box, rotationCenter, rx, ry, rz, shadeFactor) {
        const center = rotationCenter || { x: box.x + box.widthM / 2, y: box.y + box.heightM / 2, z: box.z + box.depthM / 2 };
        const vertices = [
            { x: box.x, y: box.y, z: box.z },
            { x: box.x + box.widthM, y: box.y, z: box.z },
            { x: box.x + box.widthM, y: box.y + box.heightM, z: box.z },
            { x: box.x, y: box.y + box.heightM, z: box.z },
            { x: box.x, y: box.y, z: box.z + box.depthM },
            { x: box.x + box.widthM, y: box.y, z: box.z + box.depthM },
            { x: box.x + box.widthM, y: box.y + box.heightM, z: box.z + box.depthM },
            { x: box.x, y: box.y + box.heightM, z: box.z + box.depthM },
        ].map((point) => rotate3d(point, center, rx, ry, rz));
        return { vertices, faces: [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]], shade: shadeFactor || 0.92 };
    }

    function frameMeshes(item) {
        const t = clamp(Number(item.depthM || 0.06), 0.02, Math.max(0.02, Math.min(item.widthM, item.heightM) / 2 - 0.01));
        const rx = Number(item.rotationXDeg || 0);
        const ry = Number(item.rotationYDeg || 0);
        const rz = Number(item.rotationZDeg || 0);
        const rotationCenter = { x: item.x + item.widthM / 2, y: item.y + item.heightM / 2, z: item.z + t / 2 };

        const usableH = Math.max(0, item.heightM - 2 * t);
        const meshes = [
            cuboidBox({ x: item.x, y: item.y, z: item.z, widthM: item.widthM, heightM: t, depthM: t }, rotationCenter, rx, ry, rz, 0.9),
            cuboidBox({ x: item.x, y: item.y + item.heightM - t, z: item.z, widthM: item.widthM, heightM: t, depthM: t }, rotationCenter, rx, ry, rz, 0.94),
            cuboidBox({ x: item.x, y: item.y + t, z: item.z, widthM: t, heightM: usableH, depthM: t }, rotationCenter, rx, ry, rz, 0.86),
            cuboidBox({ x: item.x + item.widthM - t, y: item.y + t, z: item.z, widthM: t, heightM: usableH, depthM: t }, rotationCenter, rx, ry, rz, 0.88),
        ];
        return meshes;
    }

    function angleMeshes(item) {
        const t = clamp(Number(item.depthM || 0.06), 0.02, Math.max(0.02, Math.min(item.widthM, item.heightM) - 0.01));
        const rx = Number(item.rotationXDeg || 0);
        const ry = Number(item.rotationYDeg || 0);
        const rz = Number(item.rotationZDeg || 0);
        const rotationCenter = { x: item.x + item.widthM / 2, y: item.y + item.heightM / 2, z: item.z + t / 2 };

        return [
            cuboidBox({ x: item.x, y: item.y, z: item.z, widthM: item.widthM, heightM: t, depthM: t }, rotationCenter, rx, ry, rz, 0.9),
            cuboidBox({ x: item.x, y: item.y, z: item.z, widthM: t, heightM: item.heightM, depthM: t }, rotationCenter, rx, ry, rz, 0.86),
        ];
    }
    function projectPoint(point, center, width, height, scale) {
        const yaw = radians(state.camera.yaw);
        const pitch = radians(state.camera.pitch);
        const translated = { x: point.x - center.x, y: point.y - center.y, z: point.z - center.z };
        const yawRotated = { x: translated.x * Math.cos(yaw) - translated.y * Math.sin(yaw), y: translated.x * Math.sin(yaw) + translated.y * Math.cos(yaw), z: translated.z };
        const pitchRotated = { x: yawRotated.x, y: yawRotated.y * Math.cos(pitch) - yawRotated.z * Math.sin(pitch), z: yawRotated.y * Math.sin(pitch) + yawRotated.z * Math.cos(pitch) };
        const perspective = Math.max(0.22, state.camera.distance / (state.camera.distance + pitchRotated.y + 18));
        return { x: width / 2 + pitchRotated.x * scale * perspective, y: height * 0.7 - pitchRotated.z * scale * perspective, d: pitchRotated.y };
    }

    function rotate3d(point, center, rx, ry, rz) {
        let translated = { x: point.x - center.x, y: point.y - center.y, z: point.z - center.z };
        translated = rotateX(translated, radians(rx));
        translated = rotateY(translated, radians(ry));
        translated = rotateZ(translated, radians(rz));
        return { x: translated.x + center.x, y: translated.y + center.y, z: translated.z + center.z };
    }

    function rotateX(point, angle) { return { x: point.x, y: point.y * Math.cos(angle) - point.z * Math.sin(angle), z: point.y * Math.sin(angle) + point.z * Math.cos(angle) }; }
    function rotateY(point, angle) { return { x: point.x * Math.cos(angle) + point.z * Math.sin(angle), y: point.y, z: -point.x * Math.sin(angle) + point.z * Math.cos(angle) }; }
    function rotateZ(point, angle) { return { x: point.x * Math.cos(angle) - point.y * Math.sin(angle), y: point.x * Math.sin(angle) + point.y * Math.cos(angle), z: point.z }; }
    function stats(items) {
        if (!items.length) return { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0, widthM: 0, heightM: 0, depthM: 0 };
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let minZ = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        let maxZ = Number.NEGATIVE_INFINITY;
        items.forEach((item) => {
            buildMeshes(item).forEach((mesh) => {
                mesh.vertices.forEach((vertex) => {
                    minX = Math.min(minX, vertex.x);
                    minY = Math.min(minY, vertex.y);
                    minZ = Math.min(minZ, vertex.z);
                    maxX = Math.max(maxX, vertex.x);
                    maxY = Math.max(maxY, vertex.y);
                    maxZ = Math.max(maxZ, vertex.z);
                });
            });
        });
        return { minX: round(minX, 2), minY: round(minY, 2), minZ: round(minZ, 2), maxX: round(maxX, 2), maxY: round(maxY, 2), maxZ: round(maxZ, 2), widthM: round(Math.max(0, maxX - minX), 2), heightM: round(Math.max(0, maxY - minY), 2), depthM: round(Math.max(0, maxZ - minZ), 2) };
    }

    function point(clientX, clientY) {
        const rect = el.riggingWorkspace.getBoundingClientRect();
        return { x: round(clamp(clientX - rect.left, 0, rect.width) / state.scale, 4), y: round(clamp(rect.bottom - clientY, 0, rect.height) / state.scale, 4) };
    }

    function clampItem(item) { const next = { ...item }; clampItemInPlace(next); return next; }

    function clampItemInPlace(item) {
        item.widthM = round(clamp(item.widthM, 0.05, state.project.canvas.widthM), 2);
        item.heightM = round(clamp(item.heightM, 0.05, state.project.canvas.heightM), 2);
        item.depthM = round(clamp(item.depthM, 0.02, 20), 2);
        item.mountMode = normalizeMountMode(item.mountMode || defaultMountMode(item.componentId));
        const footprint = footprintDimensions(item);
        item.x = round(clamp(snap(item.x), 0, Math.max(0, state.project.canvas.widthM - footprint.widthM)), 2);
        item.y = round(clamp(snap(item.y), 0, Math.max(0, state.project.canvas.heightM - footprint.heightM)), 2);
        item.z = round(Math.max(0, item.z), 2);
        item.rotationXDeg = normalizeRotation(item.rotationXDeg || 0);
        item.rotationYDeg = normalizeRotation(item.rotationYDeg || 0);
        item.rotationZDeg = normalizeRotation(item.rotationZDeg || item.rotationDeg || 0);
        item.rotationDeg = item.rotationZDeg;
        item.color = normalizeColor(item.color || '#3F4B5B');
    }

    function footprintDimensions(item) {
        const mountMode = normalizeMountMode(item.mountMode || defaultMountMode(item.componentId));
        if (mountMode === 'wall_x') {
            return { widthM: round(item.widthM, 2), heightM: round(item.depthM, 2) };
        }
        if (mountMode === 'wall_y') {
            return { widthM: round(item.depthM, 2), heightM: round(item.widthM, 2) };
        }
        return { widthM: round(item.widthM, 2), heightM: round(item.heightM, 2) };
    }

    function boxDimensions(item) {
        const mountMode = normalizeMountMode(item.mountMode || defaultMountMode(item.componentId));
        if (mountMode === 'wall_x') {
            return { x: item.x, y: item.y, z: item.z, widthM: item.widthM, heightM: item.depthM, depthM: item.heightM };
        }
        if (mountMode === 'wall_y') {
            return { x: item.x, y: item.y, z: item.z, widthM: item.depthM, heightM: item.widthM, depthM: item.heightM };
        }
        return { x: item.x, y: item.y, z: item.z, widthM: item.widthM, heightM: item.heightM, depthM: item.depthM };
    }

    function normalizeMountMode(value) {
        const mode = String(value || '').toLowerCase();
        return mode === 'wall_x' || mode === 'wall_y' ? mode : 'floor';
    }

    function defaultMountMode(id) {
        const ref = String(id || '').toLowerCase();
        return ref.includes('fechamento') ? 'wall_x' : 'floor';
    }

    function mountModeLabel(value) {
        const mode = normalizeMountMode(value);
        if (mode === 'wall_x') return 'Frontal';
        if (mode === 'wall_y') return 'Lateral';
        return 'Piso';
    }

    function api(action, params = {}) {
        const url = new URL(cfg.apiBase || 'api.php', location.href);
        url.searchParams.set('action', action);
        Object.entries(params).forEach(([key, value]) => { url.searchParams.set(key, value); });
        return url.toString();
    }

    async function json(url, options = {}) {
        const response = await fetch(url, options);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Falha na comunicacao com o servidor.');
        return payload;
    }

    function setSemanticWidth(item, value) {
        item.widthM = round(Math.max(0.05, value), 2);
    }

    function setSemanticHeight(item, value) {
        item.heightM = round(Math.max(0.05, value), 2);
    }
    function handleError(error) { console.error(error); setStatus(error.message || 'Nao foi possivel iniciar o editor de armacao.', 'error'); }
    function setStatus(message, tone) { el.riggingStatus.textContent = message; el.riggingStatus.className = 'status-box status-box--' + tone; }

    function defaultColor(id) {
        const ref = String(id || '').toLowerCase();
        if (ref.includes('grid')) return '#2F3A48';
        if (ref.includes('piso')) return '#C8A88F';
        if (ref.includes('escada')) return '#A45C44';
        if (ref.includes('fechamento')) return '#1693D1';
        return '#4C5E73';
    }

    function inferDepth(widthM, heightM) { return round(Math.max(0.02, Math.min(Math.min(Number(widthM || 1), Number(heightM || 1)) * 0.12, 0.35)), 2); }
    function uid() { return 'rig_' + Date.now() + '_' + Math.random().toString(16).slice(2, 8); }
    function numberValue(value, fallback) { const numeric = Number(String(value).replace(',', '.')); return Number.isFinite(numeric) ? numeric : fallback; }
    function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }
    function round(value, decimals) { const factor = 10 ** decimals; return Math.round((Number(value || 0) + Number.EPSILON) * factor) / factor; }
    function radians(value) { return Number(value || 0) * Math.PI / 180; }
    function snap(value) { return round(Math.round(value / state.snap) * state.snap, 2); }
    function normalizeRotation(value) { return round((((Number(value || 0) % 360) + 360) % 360), 2); }
    function normalizeColor(value) { const color = String(value || '').trim().toUpperCase(); return /^#[0-9A-F]{6}$/.test(color) ? color : '#3F4B5B'; }
    function shade(color, factor) {
        const hex = normalizeColor(color).slice(1);
        const red = clamp(Math.round(parseInt(hex.slice(0, 2), 16) * factor), 0, 255);
        const green = clamp(Math.round(parseInt(hex.slice(2, 4), 16) * factor), 0, 255);
        const blue = clamp(Math.round(parseInt(hex.slice(4, 6), 16) * factor), 0, 255);
        return 'rgb(' + red + ', ' + green + ', ' + blue + ')';
    }
    function meters(value) { return fmt.format(Number(value || 0)) + ' m'; }
    function inputValue(value) { return String(round(value, 2)); }
    function projectDate(value) { const date = new Date(value || ''); return Number.isNaN(date.getTime()) ? 'Data indisponivel' : 'Atualizado ' + df.format(date); }
    function escapeHtml(value) {
        return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
    }
})();





































