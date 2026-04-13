(() => {
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const config = window.PDF_EXPORT_CONFIG || {};
    const numberFormatter = new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
    });

    const state = {
        projects: [],
        projectCache: new Map(),
    };

    const elements = {};

    document.addEventListener('DOMContentLoaded', () => {
        if (!document.getElementById('pdfSheet')) {
            return;
        }

        cacheElements();
        bindEvents();
        initializeExportPage().catch((error) => {
            console.error(error);
            setStatus(error.message || 'Nao foi possivel preparar a pagina de exportacao.', 'error');
        });
    });

    function cacheElements() {
        elements.technicalProject = document.getElementById('pdfTechnicalProject');
        elements.terrainProject = document.getElementById('pdfTerrainProject');
        elements.riggingProject = document.getElementById('pdfRiggingProject');
        elements.title = document.getElementById('pdfTitle');
        elements.subtitle = document.getElementById('pdfSubtitle');
        elements.event = document.getElementById('pdfEvent');
        elements.location = document.getElementById('pdfLocation');
        elements.responsible = document.getElementById('pdfResponsible');
        elements.notes = document.getElementById('pdfNotes');
        elements.logoUrl = document.getElementById('pdfLogoUrl');
        elements.generateBtn = document.getElementById('pdfGenerateBtn');
        elements.printBtn = document.getElementById('pdfPrintBtn');
        elements.status = document.getElementById('pdfStatus');
        elements.sheet = document.getElementById('pdfSheet');
        elements.titleBlock = elements.sheet ? elements.sheet.querySelector('.export-sheet__titleblock') : null;
        elements.emptyState = document.getElementById('pdfEmptyState');
        elements.technicalSection = document.getElementById('pdfTechnicalSection');
        elements.terrainSection = document.getElementById('pdfTerrainSection');
        elements.technicalCanvas = document.getElementById('pdfTechnicalCanvas');
        elements.terrainCanvas = document.getElementById('pdfTerrainCanvas');
        elements.terrainSvg = document.getElementById('pdfTerrainSvg');
        elements.technicalMeta = document.getElementById('pdfTechnicalMeta');
        elements.terrainMeta = document.getElementById('pdfTerrainMeta');
        elements.riggingSection = document.getElementById('pdfRiggingSection');
        elements.riggingCanvasWrap = document.getElementById('pdfRiggingCanvasWrap');
        elements.riggingCanvas = document.getElementById('pdfRiggingCanvas');
        elements.riggingMeta = document.getElementById('pdfRiggingMeta');
        elements.logoPreview = document.getElementById('pdfLogoPreview');
        elements.previewTitle = document.getElementById('pdfPreviewTitle');
        elements.previewSubtitle = document.getElementById('pdfPreviewSubtitle');
        elements.previewEvent = document.getElementById('pdfPreviewEvent');
        elements.previewLocation = document.getElementById('pdfPreviewLocation');
        elements.previewResponsible = document.getElementById('pdfPreviewResponsible');
        elements.previewDate = document.getElementById('pdfPreviewDate');
        elements.previewNotes = document.getElementById('pdfPreviewNotes');
        elements.previewCount = document.getElementById('pdfPreviewCount');
    }

    function bindEvents() {
        [elements.title, elements.subtitle, elements.event, elements.location, elements.responsible, elements.notes, elements.logoUrl].forEach((field) => {
            field.addEventListener('input', syncTitleBlockPreview);
        });

        elements.logoPreview.addEventListener('error', () => {
            elements.logoPreview.hidden = true;
            elements.logoPreview.removeAttribute('src');
        });
        elements.technicalProject.addEventListener('change', () => generateSheet().catch(handleError));
        elements.terrainProject.addEventListener('change', () => generateSheet().catch(handleError));
        elements.riggingProject.addEventListener('change', () => generateSheet().catch(handleError));
        elements.generateBtn.addEventListener('click', () => generateSheet().catch(handleError));
        elements.printBtn.addEventListener('click', async () => {
            try {
                const ready = await generateSheet();
                if (!ready) {
                    return;
                }

                await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
                await waitForImages(elements.sheet);
                const cleanupPrintPages = preparePrintPages();
                window.addEventListener('afterprint', cleanupPrintPages, { once: true });
                const previousTitle = document.title;
                document.title = buildPrintTitle();
                window.print();
                cleanupPrintPages();
                window.setTimeout(() => {
                    document.title = previousTitle;
                }, 600);
            } catch (error) {
                handleError(error);
            }
        });
    }

    async function initializeExportPage() {
        syncTitleBlockPreview();
        setStatus('Carregando projetos salvos...', 'info');
        const payload = await requestJson(buildApiUrl('projects'));
        state.projects = Array.isArray(payload.projects) ? payload.projects : [];
        populateProjectSelects();
        applyQueryParams();
        await generateSheet();
    }

    function populateProjectSelects() {
        const technicalProjects = state.projects.filter((project) => {
            const editor = String(project.editor || 'technical');
            return editor !== 'terrain' && editor !== 'rigging';
        });
        const terrainProjects = state.projects.filter((project) => String(project.editor || '') === 'terrain');
        const riggingProjects = state.projects.filter((project) => String(project.editor || '') === 'rigging');
        fillProjectSelect(elements.technicalProject, technicalProjects, 'Nao incluir planta tecnica');
        fillProjectSelect(elements.terrainProject, terrainProjects, 'Nao incluir planta do terreno');
        fillProjectSelect(elements.riggingProject, riggingProjects, 'Nao incluir planta de armacao');
    }

    function fillProjectSelect(select, projects, emptyLabel) {
        select.innerHTML = '';
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = emptyLabel;
        select.appendChild(emptyOption);

        projects.forEach((project) => {
            const option = document.createElement('option');
            option.value = String(project.id || '');
            option.textContent = String(project.name || 'Projeto sem nome');
            select.appendChild(option);
        });
    }

    function applyQueryParams() {
        const params = new URLSearchParams(window.location.search);
        const technicalId = params.get('technical');
        const terrainId = params.get('terrain');
        const riggingId = params.get('rigging');
        if (technicalId) {
            elements.technicalProject.value = technicalId;
        }
        if (terrainId) {
            elements.terrainProject.value = terrainId;
        }
        if (riggingId) {
            elements.riggingProject.value = riggingId;
        }
    }

    async function generateSheet() {
        syncTitleBlockPreview();
        const technicalId = elements.technicalProject.value;
        const terrainId = elements.terrainProject.value;
        const riggingId = elements.riggingProject.value;

        if (!technicalId && !terrainId && !riggingId) {
            showEmptySheet();
            setStatus('Escolha pelo menos uma planta para montar a prancha.', 'warning');
            return false;
        }

        setStatus('Montando a prancha do PDF...', 'info');
        const [technicalProject, terrainProject, riggingProject] = await Promise.all([
            technicalId ? loadProject(technicalId) : Promise.resolve(null),
            terrainId ? loadProject(terrainId) : Promise.resolve(null),
            riggingId ? loadProject(riggingId) : Promise.resolve(null),
        ]);

        renderTechnicalSection(technicalProject);
        renderTerrainSection(terrainProject);
        renderRiggingSection(riggingProject);
        updateSheetMode(Boolean(technicalProject), Boolean(terrainProject), Boolean(riggingProject));
        setStatus('Prancha pronta. Agora voce pode imprimir e escolher Salvar em PDF.', 'success');
        return true;
    }

    async function loadProject(projectId) {
        if (state.projectCache.has(projectId)) {
            return state.projectCache.get(projectId);
        }

        const payload = await requestJson(buildApiUrl('project', { id: projectId }));
        const project = payload.project || null;
        if (project) {
            state.projectCache.set(projectId, project);
        }
        return project;
    }

    function showEmptySheet() {
        elements.technicalSection.hidden = true;
        elements.terrainSection.hidden = true;
        elements.riggingSection.hidden = true;
        elements.emptyState.hidden = false;
        elements.technicalCanvas.innerHTML = '';
        elements.terrainSvg.replaceChildren();
        const riggingContext = elements.riggingCanvas.getContext('2d');
        if (riggingContext) {
            riggingContext.clearRect(0, 0, elements.riggingCanvas.width, elements.riggingCanvas.height);
        }
        elements.terrainCanvas.querySelectorAll('.export-empty-state--inline').forEach((node) => node.remove());
        elements.riggingCanvasWrap.querySelectorAll('.export-empty-state--inline').forEach((node) => node.remove());
        elements.technicalMeta.textContent = '';
        elements.terrainMeta.textContent = '';
        elements.riggingMeta.textContent = '';
        updateSheetMode(false, false, false);
    }

    function updateSheetMode(hasTechnical, hasTerrain, hasRigging) {
        const plantCount = Number(hasTechnical) + Number(hasTerrain) + Number(hasRigging);
        elements.emptyState.hidden = plantCount > 0;
        elements.sheet.classList.toggle('export-sheet--empty', plantCount === 0);
        elements.sheet.classList.toggle('export-sheet--single', plantCount === 1);
        elements.sheet.classList.toggle('export-sheet--dual', plantCount === 2);
        elements.sheet.classList.toggle('export-sheet--triple', plantCount >= 3);
        elements.previewCount.textContent = plantCount === 1 ? '1 planta na prancha' : plantCount > 1 ? (plantCount + ' plantas na prancha') : '0 plantas';
    }

    function renderTechnicalSection(project) {
        elements.technicalCanvas.innerHTML = '';
        if (!project) {
            elements.technicalSection.hidden = true;
            elements.technicalMeta.textContent = '';
            return;
        }

        elements.technicalSection.hidden = false;
        const items = Array.isArray(project.items) ? project.items.filter((item) => Number(item.widthM) > 0 && Number(item.heightM) > 0) : [];
        const view = normalizeView(project.view);
        const bounds = calculateBounds(items);
        const sourceWidthM = Math.max(bounds.widthM || Number(project.canvas?.widthM || 0), 6);
        const sourceHeightM = Math.max(bounds.heightM || Number(project.canvas?.heightM || 0), 4);
        const paddingM = 0.8;
        const availableWidth = Math.max((elements.technicalCanvas.clientWidth || 860) - 24, 420);
        const availableHeight = Math.max((elements.technicalCanvas.clientHeight || 320) - 24, 220);
        const scale = Math.max(16, Math.min(availableWidth / (sourceWidthM + paddingM * 2), availableHeight / (sourceHeightM + paddingM * 2)));
        const sceneWidth = Math.max(320, Math.round((sourceWidthM + paddingM * 2) * scale));
        const sceneHeight = Math.max(200, Math.round((sourceHeightM + paddingM * 2) * scale));
        const offsetX = bounds.widthM > 0 ? bounds.minX - paddingM : -paddingM;
        const offsetY = bounds.heightM > 0 ? bounds.minY - paddingM : -paddingM;

        const scene = document.createElement('div');
        scene.className = 'export-scene export-scene--technical';
        scene.style.width = `${sceneWidth}px`;
        scene.style.height = `${sceneHeight}px`;

        if (view.showDimensions && bounds.widthM > 0 && bounds.heightM > 0) {
            const overlay = document.createElement('div');
            overlay.className = 'structure-bounds export-structure-bounds';
            overlay.style.left = `${(bounds.minX - offsetX) * scale}px`;
            overlay.style.bottom = `${(bounds.minY - offsetY) * scale}px`;
            overlay.style.width = `${bounds.widthM * scale}px`;
            overlay.style.height = `${bounds.heightM * scale}px`;
            overlay.innerHTML = `<span class="structure-bounds__label">${formatMeters(bounds.widthM)}</span><span class="structure-bounds__label--height">${formatMeters(bounds.heightM)}</span>`;
            scene.appendChild(overlay);
        }

        items.slice().sort((left, right) => Number(left.zIndex || 0) - Number(right.zIndex || 0)).forEach((item) => {
            const node = document.createElement('div');
            node.className = 'export-tech-item';
            node.style.left = `${(Number(item.x || 0) - offsetX) * scale}px`;
            node.style.bottom = `${(Number(item.y || 0) - offsetY) * scale}px`;
            node.style.width = `${Number(item.widthM || 0) * scale}px`;
            node.style.height = `${Number(item.heightM || 0) * scale}px`;
            node.style.transform = `rotate(${Number(item.rotationDeg || 0)}deg)`;
            node.innerHTML = `<img src="${escapeHtml(String(item.image || ''))}" alt="${escapeHtml(String(item.name || 'Componente'))}">`
                + (view.showNames ? `<span class="item-title">${escapeHtml(String(item.name || 'Componente'))}</span>` : '')
                + (view.showDimensions ? `<span class="dimension-badge dimension-badge--height">A ${formatMeters(Number(item.heightM || 0))}</span><span class="dimension-badge dimension-badge--width">L ${formatMeters(Number(item.widthM || 0))}</span>` : '');
            scene.appendChild(node);
        });

        if (items.length === 0) {
            scene.appendChild(createEmptyNote('A planta tecnica selecionada nao tem pecas salvas.'));
        }

        elements.technicalCanvas.appendChild(scene);
        const stats = project.stats || bounds;
        elements.technicalMeta.textContent = `${project.name || 'Projeto sem nome'} | ${items.length} pecas | ${formatMeters(Number(stats.widthM || 0))} x ${formatMeters(Number(stats.heightM || 0))}`;
    }

    function renderTerrainSection(project) {
        elements.terrainSvg.replaceChildren();
        elements.terrainCanvas.querySelectorAll('.export-empty-state--inline').forEach((node) => node.remove());
        if (!project) {
            elements.terrainSection.hidden = true;
            elements.terrainMeta.textContent = '';
            return;
        }

        elements.terrainSection.hidden = false;
        const items = Array.isArray(project.items) ? project.items.filter((item) => Number(item.widthM) > 0 && Number(item.heightM) > 0) : [];
        const view = normalizeView(project.view);
        const bounds = calculateBounds(items);
        const sourceWidthM = Math.max(bounds.widthM || Number(project.canvas?.widthM || 0), 6);
        const sourceHeightM = Math.max(bounds.heightM || Number(project.canvas?.heightM || 0), 4);
        const paddingM = 0.8;
        const availableWidth = Math.max((elements.terrainCanvas.clientWidth || 860) - 24, 420);
        const availableHeight = Math.max((elements.terrainCanvas.clientHeight || 320) - 24, 220);
        const scale = Math.max(16, Math.min(availableWidth / (sourceWidthM + paddingM * 2), availableHeight / (sourceHeightM + paddingM * 2)));
        const sceneWidth = Math.max(320, Math.round((sourceWidthM + paddingM * 2) * scale));
        const sceneHeight = Math.max(200, Math.round((sourceHeightM + paddingM * 2) * scale));
        const offsetX = bounds.widthM > 0 ? bounds.minX - paddingM : -paddingM;
        const offsetY = bounds.heightM > 0 ? bounds.minY - paddingM : -paddingM;

        elements.terrainSvg.setAttribute('viewBox', `0 0 ${sceneWidth} ${sceneHeight}`);
        elements.terrainSvg.setAttribute('width', String(sceneWidth));
        elements.terrainSvg.setAttribute('height', String(sceneHeight));

        if (view.showDimensions && bounds.widthM > 0 && bounds.heightM > 0) {
            elements.terrainSvg.appendChild(createTerrainOverallBounds(bounds, offsetX, offsetY, scale));
        }

        items.slice().sort((left, right) => Number(left.zIndex || 0) - Number(right.zIndex || 0)).forEach((item) => {
            elements.terrainSvg.appendChild(createTerrainItemGroup(item, view, offsetX, offsetY, scale));
        });

        if (items.length === 0) {
            elements.terrainCanvas.appendChild(createEmptyNote('A planta do terreno selecionada nao tem elementos salvos.'));
        }

        const stats = project.stats || bounds;
        elements.terrainMeta.textContent = `${project.name || 'Projeto sem nome'} | ${items.length} itens | ${formatMeters(Number(stats.widthM || 0))} x ${formatMeters(Number(stats.heightM || 0))}`;
    }

    function createTerrainItemGroup(item, view, offsetX, offsetY, scale) {
        const widthPx = Number(item.widthM || 0) * scale;
        const heightPx = Number(item.heightM || 0) * scale;
        const xPx = (Number(item.x || item.xM || 0) - offsetX) * scale;
        const yPx = (Number(item.y || item.yM || 0) - offsetY) * scale;
        const rotationDeg = Number(item.rotationDeg || 0);
        const label = String(item.label || item.name || getTerrainDefaultLabel(String(item.componentId || item.type || 'stage')));
        const type = String(item.componentId || item.type || 'stage');
        const group = svgElement('g', {
            transform: `translate(${xPx} ${yPx}) rotate(${rotationDeg} ${widthPx / 2} ${heightPx / 2})`,
        });

        if (type === 'stage') {
            drawTerrainStage(group, widthPx, heightPx);
        } else if (type === 'stair') {
            drawTerrainStair(group, widthPx, heightPx);
        } else if (type === 'ramp') {
            drawTerrainRamp(group, widthPx, heightPx);
        } else if (type === 'landing') {
            drawTerrainLanding(group, widthPx, heightPx);
        } else {
            drawTerrainWall(group, widthPx, heightPx);
        }

        if (view.showNames) {
            group.appendChild(svgText(label, {
                x: widthPx / 2,
                y: -14,
                class: 'terrain-label export-terrain-label',
            }));
        }

        if (view.showDimensions) {
            group.appendChild(createTerrainDimensions(item, widthPx, heightPx));
        }

        return group;
    }

    function drawTerrainStage(group, widthPx, heightPx) {
        group.appendChild(svgElement('rect', { x: 0, y: 0, width: widthPx, height: heightPx, rx: 4, ry: 4, class: 'terrain-shape-base' }));
    }

    function drawTerrainStair(group, widthPx, heightPx) {
        const stepCount = clampNumber(Math.round(heightPx / 18), 4, 7);
        const stepHeight = heightPx / stepCount;
        group.appendChild(svgElement('rect', { x: 0, y: 0, width: widthPx, height: heightPx, rx: 4, ry: 4, class: 'terrain-shape-base terrain-shape-fill-muted' }));
        group.appendChild(svgElement('line', { x1: widthPx * 0.78, y1: 0, x2: widthPx * 0.78, y2: heightPx, class: 'terrain-shape-line' }));
        for (let index = 1; index < stepCount; index += 1) {
            const y = stepHeight * index;
            group.appendChild(svgElement('line', { x1: 0, y1: y, x2: widthPx, y2: y, class: 'terrain-shape-line' }));
        }
    }

    function drawTerrainRamp(group, widthPx, heightPx) {
        const bandY = heightPx * 0.48;
        const arrowY = heightPx * 0.74;
        group.appendChild(svgElement('rect', { x: 0, y: 0, width: widthPx, height: heightPx, rx: 4, ry: 4, class: 'terrain-shape-base' }));
        group.appendChild(svgElement('line', { x1: 0, y1: bandY, x2: widthPx, y2: bandY, class: 'terrain-shape-line' }));
        group.appendChild(svgText('INC. 30%', { x: widthPx / 2, y: heightPx * 0.26, class: 'terrain-inner-text', 'font-size': clampNumber(widthPx * 0.085, 8, 12) }));
        group.appendChild(svgElement('line', { x1: widthPx * 0.18, y1: arrowY, x2: widthPx * 0.68, y2: arrowY, class: 'terrain-shape-line' }));
        group.appendChild(svgElement('polyline', { points: `${widthPx * 0.57},${arrowY - heightPx * 0.12} ${widthPx * 0.73},${arrowY} ${widthPx * 0.57},${arrowY + heightPx * 0.12}`, class: 'terrain-shape-line' }));
    }

    function drawTerrainLanding(group, widthPx, heightPx) {
        group.appendChild(svgElement('rect', { x: 0, y: 0, width: widthPx, height: heightPx, rx: 4, ry: 4, class: 'terrain-shape-base terrain-shape-fill-muted' }));
        group.appendChild(svgElement('line', { x1: widthPx / 3, y1: 0, x2: widthPx / 3, y2: heightPx, class: 'terrain-shape-line' }));
        group.appendChild(svgElement('line', { x1: (widthPx / 3) * 2, y1: 0, x2: (widthPx / 3) * 2, y2: heightPx, class: 'terrain-shape-line' }));
    }

    function drawTerrainWall(group, widthPx, heightPx) {
        group.appendChild(svgElement('rect', { x: 0, y: 0, width: widthPx, height: heightPx, rx: 3, ry: 3, class: 'terrain-wall-base' }));
        const patternCount = Math.max(2, Math.round(widthPx / 26));
        for (let index = 1; index < patternCount; index += 1) {
            const x = (widthPx / patternCount) * index;
            group.appendChild(svgElement('line', { x1: x, y1: 0, x2: x - 10, y2: heightPx, class: 'terrain-wall-line' }));
        }
    }

    function createTerrainDimensions(item, widthPx, heightPx) {
        const group = svgElement('g');
        const offset = 14;
        const tick = 7;
        const verticalX = widthPx + offset;
        group.appendChild(svgElement('line', { x1: 0, y1: heightPx, x2: 0, y2: heightPx + offset, class: 'terrain-dimension-line' }));
        group.appendChild(svgElement('line', { x1: widthPx, y1: heightPx, x2: widthPx, y2: heightPx + offset, class: 'terrain-dimension-line' }));
        group.appendChild(svgElement('line', { x1: 0, y1: heightPx + offset, x2: widthPx, y2: heightPx + offset, class: 'terrain-dimension-line' }));
        group.appendChild(svgElement('line', { x1: 0, y1: heightPx + offset - tick, x2: 0, y2: heightPx + offset + tick, class: 'terrain-dimension-line' }));
        group.appendChild(svgElement('line', { x1: widthPx, y1: heightPx + offset - tick, x2: widthPx, y2: heightPx + offset + tick, class: 'terrain-dimension-line' }));
        group.appendChild(svgText(formatMeters(Number(item.widthM || 0)), { x: widthPx / 2, y: heightPx + offset + 2, class: 'terrain-dimension-text' }));
        group.appendChild(svgElement('line', { x1: widthPx, y1: 0, x2: verticalX, y2: 0, class: 'terrain-dimension-line' }));
        group.appendChild(svgElement('line', { x1: widthPx, y1: heightPx, x2: verticalX, y2: heightPx, class: 'terrain-dimension-line' }));
        group.appendChild(svgElement('line', { x1: verticalX, y1: 0, x2: verticalX, y2: heightPx, class: 'terrain-dimension-line' }));
        group.appendChild(svgText(formatMeters(Number(item.heightM || 0)), { x: verticalX + 16, y: heightPx / 2, class: 'terrain-dimension-text', transform: `rotate(90 ${verticalX + 16} ${heightPx / 2})` }));
        return group;
    }

    function createTerrainOverallBounds(bounds, offsetX, offsetY, scale) {
        const minXPx = (bounds.minX - offsetX) * scale;
        const minYPx = (bounds.minY - offsetY) * scale;
        const widthPx = bounds.widthM * scale;
        const heightPx = bounds.heightM * scale;
        const group = svgElement('g');
        group.appendChild(svgElement('rect', { x: minXPx, y: minYPx, width: widthPx, height: heightPx, rx: 10, ry: 10, class: 'terrain-overall-boundary' }));
        group.appendChild(svgText('AREA MONTADA', { x: minXPx + 8, y: minYPx > 20 ? minYPx - 24 : minYPx + 28, class: 'terrain-overall-caption', 'text-anchor': 'start' }));
        group.appendChild(svgText(formatMeters(bounds.widthM), { x: minXPx + widthPx / 2, y: minYPx > 24 ? minYPx - 12 : minYPx + 16, class: 'terrain-overall-text' }));
        group.appendChild(svgText(formatMeters(bounds.heightM), { x: minXPx + widthPx + 18, y: minYPx + heightPx / 2, class: 'terrain-overall-text', transform: `rotate(90 ${minXPx + widthPx + 18} ${minYPx + heightPx / 2})` }));
        return group;
    }

    function renderRiggingSection(project) {
        elements.riggingCanvasWrap.querySelectorAll('.export-empty-state--inline').forEach((node) => node.remove());
        if (!project) {
            elements.riggingSection.hidden = true;
            elements.riggingMeta.textContent = '';
            return;
        }

        elements.riggingSection.hidden = false;
        const items = Array.isArray(project.items) ? project.items.filter((item) => Number(item.widthM) > 0 && Number(item.heightM) > 0) : [];
        const stats = project.stats || calculateBounds(items);
        drawRiggingExport(elements.riggingCanvas, items, project);
        if (items.length === 0) {
            elements.riggingCanvasWrap.appendChild(createEmptyNote('A planta de armacao selecionada nao tem pecas salvas.'));
        }
        elements.riggingMeta.textContent = (project.name || 'Projeto sem nome') + ' | ' + items.length + ' pecas | ' + formatMeters(Number(stats.widthM || 0)) + ' x ' + formatMeters(Number(stats.heightM || 0)) + ' x ' + formatMeters(Number(stats.depthM || 0));
    }

    function drawRiggingExport(canvas, items, project) {
        const width = Math.max(640, canvas.clientWidth || 900);
        const height = Math.max(220, canvas.clientHeight || 320);
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return;
        }

        ctx.clearRect(0, 0, width, height);
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#0f172a');
        gradient.addColorStop(1, '#1e293b');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
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

        const stats = calculateRiggingBounds(items);
        const center = {
            x: stats.minX + stats.widthM / 2,
            y: stats.minY + stats.heightM / 2,
            z: stats.minZ + Math.max(0.5, stats.depthM / 2),
        };
        const scale = Math.max(18, Math.min(width / Math.max(stats.widthM + 6, 10), height / Math.max(stats.heightM + stats.depthM + 8, 10)) * 2.1);
        const camera = { yaw: -36, pitch: 26, distance: 28 };
        const faces = [];
        const labels = [];
        const view = normalizeView(project.view);

        items.forEach((item) => {
            const box = buildRiggingCuboid(item);
            const verts = box.vertices.map((point) => projectRiggingPoint(point, center, camera, width, height, scale));
            box.faces.forEach((face) => {
                const points = face.map((index) => verts[index]);
                faces.push({
                    points,
                    depth: points.reduce((sum, point) => sum + point.depth, 0) / points.length,
                    fill: shadeColorValue(item.color || '#4C5E73', 0.9),
                });
            });
            labels.push({
                name: String(item.name || 'Componente'),
                point: projectRiggingPoint(buildRiggingLabelPoint(item), center, camera, width, height, scale),
            });
        });

        faces.sort((left, right) => left.depth - right.depth);
        faces.forEach((face) => {
            ctx.beginPath();
            face.points.forEach((point, index) => {
                if (index === 0) {
                    ctx.moveTo(point.x, point.y);
                } else {
                    ctx.lineTo(point.x, point.y);
                }
            });
            ctx.closePath();
            ctx.fillStyle = face.fill;
            ctx.fill();
            ctx.strokeStyle = 'rgba(226, 232, 240, 0.38)';
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        if (view.showNames) {
            ctx.font = '600 11px Segoe UI';
            ctx.textAlign = 'center';
            labels.forEach(({ name, point }) => {
                const boxWidth = ctx.measureText(name).width + 14;
                ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
                ctx.fillRect(point.x - boxWidth / 2, point.y - 18, boxWidth, 16);
                ctx.fillStyle = '#f8fafc';
                ctx.fillText(name, point.x, point.y - 6);
            });
        }

        ctx.fillStyle = 'rgba(226, 232, 240, 0.92)';
        ctx.font = '12px Segoe UI';
        ctx.textAlign = 'left';
        ctx.fillText('Armacao 3D ' + formatMeters(Number(stats.widthM || 0)) + ' x ' + formatMeters(Number(stats.heightM || 0)) + ' x ' + formatMeters(Number(stats.depthM || 0)), 16, 24);
    }

    function normalizeRiggingMountMode(value) {
        const mode = String(value || '').toLowerCase();
        return mode === 'wall_x' || mode === 'wall_y' ? mode : 'floor';
    }

    function riggingBoxDimensions(item) {
        const widthM = Number(item.widthM || 0);
        const heightM = Number(item.heightM || 0);
        const depthM = Number(item.depthM || 0);
        const mountMode = normalizeRiggingMountMode(item.mountMode);
        if (mountMode === 'wall_x') {
            return { x: Number(item.x || 0), y: Number(item.y || 0), z: Number(item.z || 0), widthM, heightM: depthM, depthM: heightM };
        }
        if (mountMode === 'wall_y') {
            return { x: Number(item.x || 0), y: Number(item.y || 0), z: Number(item.z || 0), widthM: depthM, heightM: widthM, depthM: heightM };
        }
        return { x: Number(item.x || 0), y: Number(item.y || 0), z: Number(item.z || 0), widthM, heightM, depthM };
    }

    function buildRiggingLabelPoint(item) {
        const box = riggingBoxDimensions(item);
        return { x: box.x + box.widthM / 2, y: box.y + box.heightM / 2, z: box.z + box.depthM + 0.12 };
    }

    function buildRiggingCuboid(item) {
        const box = riggingBoxDimensions(item);
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
        ].map((point) => rotateRiggingPoint(point, center, Number(item.rotationXDeg || 0), Number(item.rotationYDeg || 0), Number(item.rotationZDeg || item.rotationDeg || 0)));

        return {
            vertices,
            faces: [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]],
        };
    }

    function rotateRiggingPoint(point, center, rotationXDeg, rotationYDeg, rotationZDeg) {
        let next = { x: point.x - center.x, y: point.y - center.y, z: point.z - center.z };
        next = rotateRiggingAroundX(next, (rotationXDeg * Math.PI) / 180);
        next = rotateRiggingAroundY(next, (rotationYDeg * Math.PI) / 180);
        next = rotateRiggingAroundZ(next, (rotationZDeg * Math.PI) / 180);
        return { x: next.x + center.x, y: next.y + center.y, z: next.z + center.z };
    }

    function rotateRiggingAroundX(point, radians) {
        return { x: point.x, y: point.y * Math.cos(radians) - point.z * Math.sin(radians), z: point.y * Math.sin(radians) + point.z * Math.cos(radians) };
    }

    function rotateRiggingAroundY(point, radians) {
        return { x: point.x * Math.cos(radians) + point.z * Math.sin(radians), y: point.y, z: -point.x * Math.sin(radians) + point.z * Math.cos(radians) };
    }

    function rotateRiggingAroundZ(point, radians) {
        return { x: point.x * Math.cos(radians) - point.y * Math.sin(radians), y: point.x * Math.sin(radians) + point.y * Math.cos(radians), z: point.z };
    }

    function projectRiggingPoint(point, center, camera, width, height, scale) {
        const translated = { x: point.x - center.x, y: point.y - center.y, z: point.z - center.z };
        const yaw = (camera.yaw * Math.PI) / 180;
        const pitch = (camera.pitch * Math.PI) / 180;
        const yawRotated = { x: translated.x * Math.cos(yaw) - translated.y * Math.sin(yaw), y: translated.x * Math.sin(yaw) + translated.y * Math.cos(yaw), z: translated.z };
        const pitchRotated = { x: yawRotated.x, y: yawRotated.y * Math.cos(pitch) - yawRotated.z * Math.sin(pitch), z: yawRotated.y * Math.sin(pitch) + yawRotated.z * Math.cos(pitch) };
        const perspective = camera.distance / (camera.distance + pitchRotated.y + 18);
        return { x: width / 2 + pitchRotated.x * scale * perspective, y: height * 0.72 - pitchRotated.z * scale * perspective, depth: pitchRotated.y };
    }

    function calculateRiggingBounds(items) {
        if (!Array.isArray(items) || items.length === 0) {
            return { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0, widthM: 0, heightM: 0, depthM: 0 };
        }
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let minZ = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        let maxZ = Number.NEGATIVE_INFINITY;
        items.forEach((item) => {
            const box = buildRiggingCuboid(item);
            box.vertices.forEach((vertex) => {
                minX = Math.min(minX, vertex.x);
                minY = Math.min(minY, vertex.y);
                minZ = Math.min(minZ, vertex.z);
                maxX = Math.max(maxX, vertex.x);
                maxY = Math.max(maxY, vertex.y);
                maxZ = Math.max(maxZ, vertex.z);
            });
        });
        return { minX, minY, minZ, maxX, maxY, maxZ, widthM: roundTo(Math.max(0, maxX - minX), 2), heightM: roundTo(Math.max(0, maxY - minY), 2), depthM: roundTo(Math.max(0, maxZ - minZ), 2) };
    }

    function shadeColorValue(color, factor) {
        const value = String(color || '#4C5E73').replace('#', '').padStart(6, '0').slice(0, 6);
        const red = clampNumber(Math.round(parseInt(value.slice(0, 2), 16) * factor), 0, 255);
        const green = clampNumber(Math.round(parseInt(value.slice(2, 4), 16) * factor), 0, 255);
        const blue = clampNumber(Math.round(parseInt(value.slice(4, 6), 16) * factor), 0, 255);
        return 'rgb(' + red + ', ' + green + ', ' + blue + ')';
    }
    function syncTitleBlockPreview() {
        const title = cleanText(elements.title.value) || 'PLANTA DE MONTAGEM';
        const subtitle = cleanText(elements.subtitle.value) || 'Selecione as plantas e preencha as informacoes da prancha.';
        elements.previewTitle.textContent = title.toUpperCase();
        elements.previewSubtitle.textContent = subtitle;
        elements.previewEvent.textContent = cleanText(elements.event.value) || '-';
        elements.previewLocation.textContent = cleanText(elements.location.value) || '-';
        elements.previewResponsible.textContent = cleanText(elements.responsible.value) || '-';
        elements.previewDate.textContent = dateFormatter.format(new Date());
        elements.previewNotes.textContent = cleanText(elements.notes.value) || '-';

        const logoUrl = cleanText(elements.logoUrl.value);
        if (logoUrl) {
            elements.logoPreview.hidden = false;
            elements.logoPreview.src = logoUrl;
        } else {
            elements.logoPreview.hidden = true;
            elements.logoPreview.removeAttribute('src');
        }
    }

    function createEmptyNote(message) {
        const note = document.createElement('div');
        note.className = 'export-empty-state export-empty-state--inline';
        note.textContent = message;
        return note;
    }

    function calculateBounds(items) {
        if (!Array.isArray(items) || items.length === 0) {
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
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        items.forEach((item) => {
            const extents = getRotatedBounds(item);
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

    function getRotatedBounds(item) {
        const x = Number(item.x ?? item.xM ?? 0);
        const y = Number(item.y ?? item.yM ?? 0);
        const width = Number(item.widthM || 0);
        const height = Number(item.heightM || 0);
        const center = { x: x + width / 2, y: y + height / 2 };
        const radians = (Number(item.rotationDeg || 0) * Math.PI) / 180;
        const corners = [
            { x, y },
            { x: x + width, y },
            { x: x + width, y: y + height },
            { x, y: y + height },
        ].map((point) => rotatePoint(point, center.x, center.y, radians));

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
        return {
            x: centerX + translatedX * cos - translatedY * sin,
            y: centerY + translatedX * sin + translatedY * cos,
        };
    }

    function normalizeView(view) {
        return {
            showDimensions: typeof view?.showDimensions === 'boolean' ? view.showDimensions : true,
            showNames: typeof view?.showNames === 'boolean' ? view.showNames : true,
        };
    }

    function getTerrainDefaultLabel(type) {
        return {
            stage: 'PALCO',
            stair: 'ESCADA',
            ramp: 'RAMPA 30%',
            landing: 'PATAMAR',
            wall_2m: 'PAREDE 2 m',
            wall_3m: 'PAREDE 3 m',
        }[type] || 'ELEMENTO';
    }

    function svgElement(name, attributes = {}) {
        const element = document.createElementNS(SVG_NS, name);
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, String(value));
        });
        return element;
    }

    function svgText(content, attributes = {}) {
        const element = svgElement('text', attributes);
        element.textContent = content;
        return element;
    }

    function waitForImages(container) {
        const images = Array.from(container.querySelectorAll('img')).filter((image) => image.getAttribute('src'));
        if (images.length === 0) {
            return Promise.resolve();
        }

        return Promise.all(images.map((image) => {
            if (image.complete) {
                return Promise.resolve();
            }

            return new Promise((resolve) => {
                image.addEventListener('load', resolve, { once: true });
                image.addEventListener('error', resolve, { once: true });
            });
        }));
    }

    function buildPrintTitle() {
        const baseTitle = cleanText(elements.title.value) || 'prancha-grid-builder';
        return baseTitle
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .toLowerCase() || 'prancha-grid-builder';
    }
    function preparePrintPages() {
        const pages = document.createElement('div');
        pages.className = 'export-print-pages';

        const defs = [
            { section: elements.technicalSection, name: 'technical' },
            { section: elements.terrainSection, name: 'terrain' },
            { section: elements.riggingSection, name: 'rigging' },
        ];

        const active = defs.filter((def) => def.section && !def.section.hidden);
        if (active.length === 0) {
            return () => {};
        }

        active.forEach((def) => {
            const page = document.createElement('div');
            page.className = 'export-print-page';

            const sheet = document.createElement('div');
            sheet.className = 'export-sheet export-sheet--single export-sheet--print';

            const canvasColumn = document.createElement('div');
            canvasColumn.className = 'export-sheet__canvas';

            const clone = def.section.cloneNode(true);
            clone.hidden = false;
            clone.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));

            if (def.name === 'rigging') {
                const cloneCanvas = clone.querySelector('canvas');
                const sourceCanvas = elements.riggingCanvas;
                if (cloneCanvas && sourceCanvas) {
                    cloneCanvas.width = sourceCanvas.width;
                    cloneCanvas.height = sourceCanvas.height;
                    const ctx = cloneCanvas.getContext('2d');
                    if (ctx) ctx.drawImage(sourceCanvas, 0, 0);
                }
            }

            canvasColumn.appendChild(clone);
            sheet.appendChild(canvasColumn);
            if (elements.titleBlock) {
                sheet.appendChild(elements.titleBlock.cloneNode(true));
            }
            page.appendChild(sheet);
            pages.appendChild(page);
        });

        document.body.classList.add('is-export-printing');
        document.body.appendChild(pages);
        if (elements.sheet) {
            elements.sheet.dataset.printHidden = '1';
            elements.sheet.style.display = 'none';
        }

        return () => {
            pages.remove();
            document.body.classList.remove('is-export-printing');
            if (elements.sheet && elements.sheet.dataset.printHidden) {
                elements.sheet.style.display = '';
                delete elements.sheet.dataset.printHidden;
            }
        };
    }

    function buildApiUrl(action, params = {}) {
        const url = new URL(config.apiBase || 'api.php', window.location.href);
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

    function setStatus(message, tone = 'info') {
        elements.status.textContent = message;
        elements.status.className = `status-box status-box--${tone}`;
    }

    function handleError(error) {
        console.error(error);
        setStatus(error.message || 'Nao foi possivel gerar a prancha.', 'error');
    }

    function formatMeters(value) {
        return `${numberFormatter.format(Number(value || 0))} m`;
    }

    function cleanText(value) {
        return String(value || '').trim();
    }

    function roundTo(value, decimals) {
        const factor = 10 ** decimals;
        return Math.round((value + Number.EPSILON) * factor) / factor;
    }

    function clampNumber(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }
})();












