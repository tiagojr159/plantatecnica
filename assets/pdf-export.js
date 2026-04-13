(() => {
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const config = window.PDF_EXPORT_CONFIG || {};
    const numberFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

    const state = {
        projects: [],
        projectCache: new Map(),
    };

    const el = {};

    document.addEventListener('DOMContentLoaded', () => {
        if (!document.getElementById('pdfSheet')) return;
        cache();
        bind();
        init().catch(handleError);
    });

    function cache() {
        el.technicalProject = document.getElementById('pdfTechnicalProject');
        el.terrainProject = document.getElementById('pdfTerrainProject');
        el.riggingProject = document.getElementById('pdfRiggingProject');
        el.rigging3dProject = document.getElementById('pdfRigging3dProject');

        el.title = document.getElementById('pdfTitle');
        el.subtitle = document.getElementById('pdfSubtitle');
        el.event = document.getElementById('pdfEvent');
        el.location = document.getElementById('pdfLocation');
        el.responsible = document.getElementById('pdfResponsible');
        el.notes = document.getElementById('pdfNotes');
        el.logoUrl = document.getElementById('pdfLogoUrl');

        el.generateBtn = document.getElementById('pdfGenerateBtn');
        el.printBtn = document.getElementById('pdfPrintBtn');
        el.status = document.getElementById('pdfStatus');

        el.sheet = document.getElementById('pdfSheet');
        el.titleBlock = el.sheet ? el.sheet.querySelector('.export-sheet__titleblock') : null;
        el.emptyState = document.getElementById('pdfEmptyState');

        el.technicalSection = document.getElementById('pdfTechnicalSection');
        el.terrainSection = document.getElementById('pdfTerrainSection');
        el.riggingSection = document.getElementById('pdfRiggingSection');
        el.rigging3dSection = document.getElementById('pdfRigging3dSection');

        el.technicalCanvas = document.getElementById('pdfTechnicalCanvas');
        el.terrainCanvas = document.getElementById('pdfTerrainCanvas');
        el.terrainSvg = document.getElementById('pdfTerrainSvg');

        el.riggingCanvasWrap = document.getElementById('pdfRiggingCanvasWrap');
        el.riggingCanvas = document.getElementById('pdfRiggingCanvas');
        el.rigging3dCanvasWrap = document.getElementById('pdfRigging3dCanvasWrap');
        el.rigging3dCanvas = document.getElementById('pdfRigging3dCanvas');

        el.technicalMeta = document.getElementById('pdfTechnicalMeta');
        el.terrainMeta = document.getElementById('pdfTerrainMeta');
        el.riggingMeta = document.getElementById('pdfRiggingMeta');
        el.rigging3dMeta = document.getElementById('pdfRigging3dMeta');

        el.logoPreview = document.getElementById('pdfLogoPreview');
        el.previewTitle = document.getElementById('pdfPreviewTitle');
        el.previewSubtitle = document.getElementById('pdfPreviewSubtitle');
        el.previewEvent = document.getElementById('pdfPreviewEvent');
        el.previewLocation = document.getElementById('pdfPreviewLocation');
        el.previewResponsible = document.getElementById('pdfPreviewResponsible');
        el.previewDate = document.getElementById('pdfPreviewDate');
        el.previewNotes = document.getElementById('pdfPreviewNotes');
        el.previewCount = document.getElementById('pdfPreviewCount');
    }

    function bind() {
        [el.title, el.subtitle, el.event, el.location, el.responsible, el.notes, el.logoUrl].forEach((node) => {
            if (node) node.addEventListener('input', syncTitleBlock);
        });

        if (el.logoPreview) {
            el.logoPreview.addEventListener('error', () => {
                el.logoPreview.hidden = true;
                el.logoPreview.removeAttribute('src');
            });
        }

        [el.technicalProject, el.terrainProject, el.riggingProject, el.rigging3dProject].forEach((select) => {
            if (select) select.addEventListener('change', () => generateSheet().catch(handleError));
        });

        if (el.generateBtn) el.generateBtn.addEventListener('click', () => generateSheet().catch(handleError));
        if (el.printBtn) {
            el.printBtn.addEventListener('click', async () => {
                try {
                    const ready = await generateSheet();
                    if (!ready) return;

                    await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
                    const cleanup = preparePrintPages();
                    window.addEventListener('afterprint', cleanup, { once: true });

                    const previousTitle = document.title;
                    document.title = buildPrintTitle();
                    window.print();
                    cleanup();
                    window.setTimeout(() => { document.title = previousTitle; }, 600);
                } catch (error) {
                    handleError(error);
                }
            });
        }
    }

    async function init() {
        syncTitleBlock();
        setStatus('Carregando projetos salvos...', 'info');
        const payload = await requestJson(buildApiUrl('projects'));
        state.projects = Array.isArray(payload.projects) ? payload.projects : [];
        populateSelects();
        applyQueryParams();
        await generateSheet();
    }

    function populateSelects() {
        const technicalProjects = state.projects.filter((p) => {
            const editor = String(p.editor || 'technical');
            return editor !== 'terrain' && editor !== 'rigging' && editor !== 'rigging2';
        });
        const terrainProjects = state.projects.filter((p) => String(p.editor || '') === 'terrain');
        const riggingProjects = state.projects.filter((p) => String(p.editor || '') === 'rigging');
        const rigging3dProjects = state.projects.filter((p) => String(p.editor || '') === 'rigging2');

        fillSelect(el.technicalProject, technicalProjects, 'Nao incluir planta tecnica');
        fillSelect(el.terrainProject, terrainProjects, 'Nao incluir planta do terreno');
        fillSelect(el.riggingProject, riggingProjects, 'Nao incluir planta de armacao');
        fillSelect(el.rigging3dProject, rigging3dProjects, 'Nao incluir planta de amarracao 3D');
    }

    function fillSelect(select, projects, emptyLabel) {
        if (!select) return;
        select.innerHTML = '';
        const empty = document.createElement('option');
        empty.value = '';
        empty.textContent = emptyLabel;
        select.appendChild(empty);

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
        const rigging3dId = params.get('rigging3d');
        if (technicalId) el.technicalProject.value = technicalId;
        if (terrainId) el.terrainProject.value = terrainId;
        if (riggingId) el.riggingProject.value = riggingId;
        if (rigging3dId) el.rigging3dProject.value = rigging3dId;
    }

    async function generateSheet() {
        syncTitleBlock();
        const technicalId = el.technicalProject.value;
        const terrainId = el.terrainProject.value;
        const riggingId = el.riggingProject.value;
        const rigging3dId = el.rigging3dProject.value;

        if (!technicalId && !terrainId && !riggingId && !rigging3dId) {
            showEmpty();
            setStatus('Escolha pelo menos uma planta para montar a prancha.', 'warning');
            return false;
        }

        setStatus('Montando a prancha do PDF...', 'info');
        const [technicalProject, terrainProject, riggingProject, rigging3dProject] = await Promise.all([
            technicalId ? loadProject(technicalId) : Promise.resolve(null),
            terrainId ? loadProject(terrainId) : Promise.resolve(null),
            riggingId ? loadProject(riggingId) : Promise.resolve(null),
            rigging3dId ? loadProject(rigging3dId) : Promise.resolve(null),
        ]);

        renderTechnical(technicalProject);
        renderTerrain(terrainProject);
        renderRigging(el.riggingSection, el.riggingCanvasWrap, el.riggingCanvas, el.riggingMeta, riggingProject, 'A planta de armacao selecionada nao tem pecas salvas.');
        renderRigging(el.rigging3dSection, el.rigging3dCanvasWrap, el.rigging3dCanvas, el.rigging3dMeta, rigging3dProject, 'A planta de amarracao 3D selecionada nao tem pecas salvas.');

        updateSheetMode(Boolean(technicalProject), Boolean(terrainProject), Boolean(riggingProject), Boolean(rigging3dProject));
        setStatus('Prancha pronta. Agora voce pode imprimir e escolher Salvar em PDF.', 'success');
        return true;
    }

    async function loadProject(projectId) {
        if (state.projectCache.has(projectId)) return state.projectCache.get(projectId);
        const payload = await requestJson(buildApiUrl('project', { id: projectId }));
        const project = payload.project || null;
        if (project) state.projectCache.set(projectId, project);
        return project;
    }

    function showEmpty() {
        el.technicalSection.hidden = true;
        el.terrainSection.hidden = true;
        el.riggingSection.hidden = true;
        el.rigging3dSection.hidden = true;
        el.emptyState.hidden = false;

        el.technicalCanvas.innerHTML = '';
        el.terrainSvg.replaceChildren();
        clearCanvas(el.riggingCanvas);
        clearCanvas(el.rigging3dCanvas);

        el.terrainCanvas.querySelectorAll('.export-empty-state--inline').forEach((n) => n.remove());
        el.riggingCanvasWrap.querySelectorAll('.export-empty-state--inline').forEach((n) => n.remove());
        el.rigging3dCanvasWrap.querySelectorAll('.export-empty-state--inline').forEach((n) => n.remove());

        el.technicalMeta.textContent = '';
        el.terrainMeta.textContent = '';
        el.riggingMeta.textContent = '';
        el.rigging3dMeta.textContent = '';
        updateSheetMode(false, false, false, false);
    }

    function updateSheetMode(hasTechnical, hasTerrain, hasRigging, hasRigging3d) {
        const count = Number(hasTechnical) + Number(hasTerrain) + Number(hasRigging) + Number(hasRigging3d);
        el.emptyState.hidden = count > 0;
        el.sheet.classList.toggle('export-sheet--empty', count === 0);
        el.sheet.classList.toggle('export-sheet--single', count === 1);
        el.sheet.classList.toggle('export-sheet--dual', count === 2);
        el.sheet.classList.toggle('export-sheet--triple', count >= 3);
        el.previewCount.textContent = count === 1 ? '1 planta na prancha' : count > 1 ? (count + ' plantas na prancha') : '0 plantas';
    }

    function renderTechnical(project) {
        el.technicalCanvas.innerHTML = '';
        if (!project) {
            el.technicalSection.hidden = true;
            el.technicalMeta.textContent = '';
            return;
        }

        el.technicalSection.hidden = false;
        const items = Array.isArray(project.items) ? project.items : [];
        const bounds = calculateBounds(items);
        const widthM = Math.max(bounds.widthM || Number(project.canvas?.widthM || 0), 6);
        const heightM = Math.max(bounds.heightM || Number(project.canvas?.heightM || 0), 4);
        const paddingM = 0.8;
        const availableWidth = Math.max((el.technicalCanvas.clientWidth || 860) - 24, 420);
        const availableHeight = Math.max((el.technicalCanvas.clientHeight || 320) - 24, 220);
        const scale = Math.max(14, Math.min(availableWidth / (widthM + paddingM * 2), availableHeight / (heightM + paddingM * 2)));

        const scene = document.createElement('div');
        scene.className = 'export-scene export-scene--technical';
        scene.style.position = 'relative';
        scene.style.width = Math.round((widthM + paddingM * 2) * scale) + 'px';
        scene.style.height = Math.round((heightM + paddingM * 2) * scale) + 'px';

        const offsetX = (bounds.widthM > 0 ? bounds.minX : 0) - paddingM;
        const offsetY = (bounds.heightM > 0 ? bounds.minY : 0) - paddingM;

        items.filter((it) => Number(it.widthM) > 0 && Number(it.heightM) > 0).forEach((it) => {
            const node = document.createElement('div');
            node.style.position = 'absolute';
            node.style.left = Math.round((Number(it.x || 0) - offsetX) * scale) + 'px';
            node.style.top = Math.round((heightM + paddingM * 2 - (Number(it.y || 0) - offsetY) - Number(it.heightM || 0)) * scale) + 'px';
            node.style.width = Math.round(Number(it.widthM || 0) * scale) + 'px';
            node.style.height = Math.round(Number(it.heightM || 0) * scale) + 'px';
            node.style.borderRadius = '10px';
            node.style.background = 'rgba(37,99,235,0.10)';
            node.style.border = '1px solid rgba(37,99,235,0.35)';
            if (it.image) {
                const img = document.createElement('img');
                img.src = String(it.image);
                img.alt = String(it.name || '');
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'fill';
                img.style.opacity = '0.9';
                node.appendChild(img);
            }
            scene.appendChild(node);
        });

        el.technicalCanvas.appendChild(scene);
        el.technicalMeta.textContent = (project.name || 'Projeto sem nome') + ' | ' + items.length + ' pecas | ' + formatMeters(bounds.widthM) + ' x ' + formatMeters(bounds.heightM);
    }

    function renderTerrain(project) {
        el.terrainSvg.replaceChildren();
        el.terrainCanvas.querySelectorAll('.export-empty-state--inline').forEach((n) => n.remove());
        if (!project) {
            el.terrainSection.hidden = true;
            el.terrainMeta.textContent = '';
            return;
        }

        el.terrainSection.hidden = false;
        const items = Array.isArray(project.items) ? project.items : [];
        const bounds = calculateBounds(items);
        const width = Math.max(bounds.widthM || Number(project.canvas?.widthM || 0), 6);
        const height = Math.max(bounds.heightM || Number(project.canvas?.heightM || 0), 4);

        const viewW = Math.max(640, el.terrainCanvas.clientWidth || 900);
        const viewH = Math.max(220, el.terrainCanvas.clientHeight || 320);
        el.terrainSvg.setAttribute('viewBox', `0 0 ${viewW} ${viewH}`);

        const padding = 30;
        const scale = Math.max(10, Math.min((viewW - padding * 2) / width, (viewH - padding * 2) / height));
        const offsetX = (bounds.widthM > 0 ? bounds.minX : 0);
        const offsetY = (bounds.heightM > 0 ? bounds.minY : 0);

        const group = svg('g');
        items.filter((it) => Number(it.widthM) > 0 && Number(it.heightM) > 0).forEach((it) => {
            const x = padding + (Number(it.x || 0) - offsetX) * scale;
            const y = padding + (Number(it.y || 0) - offsetY) * scale;
            const w = Number(it.widthM || 0) * scale;
            const h = Number(it.heightM || 0) * scale;
            const rect = svg('rect', { x, y, width: w, height: h, rx: 10, ry: 10, fill: 'rgba(59,130,246,0.08)', stroke: 'rgba(59,130,246,0.35)' });
            group.appendChild(rect);
        });
        el.terrainSvg.appendChild(group);
        el.terrainMeta.textContent = (project.name || 'Projeto sem nome') + ' | ' + items.length + ' itens | ' + formatMeters(bounds.widthM) + ' x ' + formatMeters(bounds.heightM);
    }

    function renderRigging(section, wrap, canvas, meta, project, emptyMessage) {
        wrap.querySelectorAll('.export-empty-state--inline').forEach((n) => n.remove());
        if (!project) {
            section.hidden = true;
            meta.textContent = '';
            clearCanvas(canvas);
            return;
        }

        section.hidden = false;
        const items = Array.isArray(project.items) ? project.items.filter((it) => Number(it.widthM) > 0 && Number(it.heightM) > 0) : [];
        const stats = project.stats || calculateRiggingBounds(items);
        drawRiggingExport(canvas, items);
        if (items.length === 0) wrap.appendChild(emptyInline(emptyMessage));
        meta.textContent = (project.name || 'Projeto sem nome') + ' | ' + items.length + ' pecas | ' + formatMeters(Number(stats.widthM || 0)) + ' x ' + formatMeters(Number(stats.heightM || 0)) + ' x ' + formatMeters(Number(stats.depthM || 0));
    }

    function drawRiggingExport(canvas, items) {
        const width = Math.max(640, canvas.clientWidth || 900);
        const height = Math.max(220, canvas.clientHeight || 320);
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

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

        const bounds = calculateRiggingBounds(items);
        const center = bounds.radius > 0 ? bounds.center : { x: 0, y: 0, z: 0.5 };
        const radius = Math.max(bounds.radius, 4);
        const baseScale = Math.max(18, Math.min(width, height) / (radius * 3.1));

        const camera = { yaw: -34, pitch: 26, distance: 8 };
        const scale = baseScale;

        const faces = [];
        const labels = [];

        items.forEach((item) => {
            const cuboid = buildRiggingCuboid(item);
            const vertices = cuboid.vertices.map((p) => projectRiggingPoint(p, center, camera, width, height, scale));
            cuboid.faces.forEach((face) => {
                const points = face.map((idx) => vertices[idx]);
                faces.push({
                    points,
                    depth: points.reduce((sum, pt) => sum + pt.depth, 0) / points.length,
                    fill: 'rgba(226,232,240,0.12)',
                    stroke: 'rgba(226,232,240,0.30)',
                });
            });
            const lp = buildRiggingLabelPoint(item);
            labels.push({ name: String(item.name || ''), point: projectRiggingPoint(lp, center, camera, width, height, scale) });
        });

        faces.sort((a, b) => a.depth - b.depth);
        faces.forEach((face) => {
            ctx.beginPath();
            face.points.forEach((pt, idx) => {
                if (idx === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
            });
            ctx.closePath();
            ctx.fillStyle = face.fill;
            ctx.fill();
            ctx.strokeStyle = face.stroke;
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        ctx.font = '600 12px Segoe UI';
        ctx.textAlign = 'center';
        labels.forEach(({ name, point }) => {
            if (!name) return;
            const w = ctx.measureText(name).width + 16;
            ctx.fillStyle = 'rgba(15,23,42,0.8)';
            ctx.fillRect(point.x - w / 2, point.y - 20, w, 18);
            ctx.fillStyle = '#f8fafc';
            ctx.fillText(name, point.x, point.y - 7);
        });

        ctx.fillStyle = 'rgba(226, 232, 240, 0.92)';
        ctx.font = '12px Segoe UI';
        ctx.textAlign = 'left';
        ctx.fillText('Armacao 3D ' + formatMeters(bounds.widthM) + ' x ' + formatMeters(bounds.heightM) + ' x ' + formatMeters(bounds.depthM), 16, 24);
    }

    function buildRiggingLabelPoint(item) {
        const box = riggingBox(item);
        return { x: box.x + box.widthM / 2, y: box.y + box.heightM / 2, z: box.z + box.depthM + 0.12 };
    }

    function buildRiggingCuboid(item) {
        const box = riggingBox(item);
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
        ].map((p) => rotatePoint(p, center, Number(item.rotationXDeg || 0), Number(item.rotationYDeg || 0), Number(item.rotationZDeg || item.rotationDeg || 0)));
        return { vertices, faces: [[0,1,2,3],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]] };
    }

    function rotatePoint(point, center, rxDeg, ryDeg, rzDeg) {
        let p = { x: point.x - center.x, y: point.y - center.y, z: point.z - center.z };
        const rx = (rxDeg * Math.PI) / 180;
        const ry = (ryDeg * Math.PI) / 180;
        const rz = (rzDeg * Math.PI) / 180;
        p = { x: p.x, y: p.y * Math.cos(rx) - p.z * Math.sin(rx), z: p.y * Math.sin(rx) + p.z * Math.cos(rx) };
        p = { x: p.x * Math.cos(ry) + p.z * Math.sin(ry), y: p.y, z: -p.x * Math.sin(ry) + p.z * Math.cos(ry) };
        p = { x: p.x * Math.cos(rz) - p.y * Math.sin(rz), y: p.x * Math.sin(rz) + p.y * Math.cos(rz), z: p.z };
        return { x: p.x + center.x, y: p.y + center.y, z: p.z + center.z };
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

    function riggingBox(item) {
        const widthM = Number(item.widthM || 0);
        const heightM = Number(item.heightM || 0);
        const depthM = Number(item.depthM || 0);
        return { x: Number(item.x || 0), y: Number(item.y || 0), z: Number(item.z || 0), widthM, heightM, depthM };
    }

    function calculateRiggingBounds(items) {
        if (!Array.isArray(items) || items.length === 0) {
            return { center: { x: 0, y: 0, z: 0.5 }, radius: 0, widthM: 0, heightM: 0, depthM: 0 };
        }
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let minZ = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        let maxZ = Number.NEGATIVE_INFINITY;
        const vertices = [];
        items.forEach((item) => {
            const cuboid = buildRiggingCuboid(item);
            cuboid.vertices.forEach((v) => {
                vertices.push(v);
                minX = Math.min(minX, v.x);
                minY = Math.min(minY, v.y);
                minZ = Math.min(minZ, v.z);
                maxX = Math.max(maxX, v.x);
                maxY = Math.max(maxY, v.y);
                maxZ = Math.max(maxZ, v.z);
            });
        });
        const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 };
        const radius = vertices.reduce((m, v) => Math.max(m, Math.hypot(v.x - center.x, v.y - center.y, v.z - center.z)), 2);
        return { center, radius, widthM: roundTo(Math.max(0, maxX - minX), 2), heightM: roundTo(Math.max(0, maxY - minY), 2), depthM: roundTo(Math.max(0, maxZ - minZ), 2) };
    }

    function calculateBounds(items) {
        if (!Array.isArray(items) || items.length === 0) {
            return { minX: 0, minY: 0, maxX: 0, maxY: 0, widthM: 0, heightM: 0, depthM: 0 };
        }
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        items.forEach((item) => {
            const x = Number(item.x || 0);
            const y = Number(item.y || 0);
            const w = Number(item.widthM || 0);
            const h = Number(item.heightM || 0);
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + w);
            maxY = Math.max(maxY, y + h);
        });
        return { minX, minY, maxX, maxY, widthM: roundTo(Math.max(0, maxX - minX), 2), heightM: roundTo(Math.max(0, maxY - minY), 2), depthM: 0 };
    }

    function preparePrintPages() {
        const pages = document.createElement('div');
        pages.className = 'export-print-pages';

        const defs = [
            { section: el.technicalSection, name: 'technical' },
            { section: el.terrainSection, name: 'terrain' },
            { section: el.riggingSection, name: 'rigging' },
            { section: el.rigging3dSection, name: 'rigging3d' },
        ];

        const active = defs.filter((d) => d.section && !d.section.hidden);
        if (active.length === 0) return () => {};

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

            if (def.name === 'rigging') copyCanvas(clone, el.riggingCanvas);
            if (def.name === 'rigging3d') copyCanvas(clone, el.rigging3dCanvas);

            canvasColumn.appendChild(clone);
            sheet.appendChild(canvasColumn);
            if (el.titleBlock) sheet.appendChild(el.titleBlock.cloneNode(true));

            page.appendChild(sheet);
            pages.appendChild(page);
        });

        document.body.classList.add('is-export-printing');
        document.body.appendChild(pages);
        if (el.sheet) {
            el.sheet.dataset.printHidden = '1';
            el.sheet.style.display = 'none';
        }

        return () => {
            pages.remove();
            document.body.classList.remove('is-export-printing');
            if (el.sheet && el.sheet.dataset.printHidden) {
                el.sheet.style.display = '';
                delete el.sheet.dataset.printHidden;
            }
        };
    }

    function copyCanvas(cloneSection, sourceCanvas) {
        const cloneCanvas = cloneSection.querySelector('canvas');
        if (!cloneCanvas || !sourceCanvas) return;
        cloneCanvas.width = sourceCanvas.width;
        cloneCanvas.height = sourceCanvas.height;
        const ctx = cloneCanvas.getContext('2d');
        if (ctx) ctx.drawImage(sourceCanvas, 0, 0);
    }

    function emptyInline(message) {
        const node = document.createElement('div');
        node.className = 'export-empty-state export-empty-state--inline';
        node.textContent = message;
        return node;
    }

    function clearCanvas(canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
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
        if (!response.ok) throw new Error(payload.error || 'Falha na comunicacao com o servidor.');
        return payload;
    }

    function svg(tag, attrs = {}) {
        const node = document.createElementNS(SVG_NS, tag);
        Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
        return node;
    }

    function setStatus(message, tone = 'info') {
        el.status.textContent = message;
        el.status.className = `status-box status-box--${tone}`;
    }

    function handleError(error) {
        console.error(error);
        setStatus(error && error.message ? String(error.message) : 'Nao foi possivel gerar a prancha.', 'error');
    }

    function syncTitleBlock() {
        const title = clean(el.title.value) || 'PLANTA DE MONTAGEM';
        const subtitle = clean(el.subtitle.value) || 'Selecione as plantas e preencha as informacoes da prancha.';
        el.previewTitle.textContent = title.toUpperCase();
        el.previewSubtitle.textContent = subtitle;
        el.previewEvent.textContent = clean(el.event.value) || '-';
        el.previewLocation.textContent = clean(el.location.value) || '-';
        el.previewResponsible.textContent = clean(el.responsible.value) || '-';
        el.previewNotes.textContent = clean(el.notes.value) || '-';
        el.previewDate.textContent = dateFormatter.format(new Date());

        const logo = clean(el.logoUrl.value);
        if (logo) {
            el.logoPreview.hidden = false;
            el.logoPreview.src = logo;
        } else {
            el.logoPreview.hidden = true;
            el.logoPreview.removeAttribute('src');
        }
    }

    function buildPrintTitle() {
        const baseTitle = clean(el.title.value) || 'prancha-grid-builder';
        return baseTitle
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .toLowerCase() || 'prancha-grid-builder';
    }

    function clean(value) {
        return String(value || '').trim();
    }

    function formatMeters(value) {
        return `${numberFormatter.format(Number(value || 0))} m`;
    }

    function roundTo(value, decimals) {
        const factor = 10 ** decimals;
        return Math.round((Number(value || 0) + Number.EPSILON) * factor) / factor;
    }
})();
