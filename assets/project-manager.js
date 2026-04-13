const managerConfig = window.PROJECT_MANAGER_CONFIG || {};
const managerElements = {};
const managerNumberFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const managerDateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

document.addEventListener('DOMContentLoaded', () => {
    cacheManagerElements();
    bindManagerEvents();
    loadManagedProjects();
});

function cacheManagerElements() {
    managerElements.projectList = document.getElementById('managerProjectList');
    managerElements.status = document.getElementById('managerStatus');
    managerElements.count = document.getElementById('projectCount');
}

function bindManagerEvents() {
    managerElements.projectList.addEventListener('click', handleManagerProjectClick);
}

async function loadManagedProjects() {
    try {
        setManagerStatus('Carregando projetos salvos...', 'info');
        const payload = await requestManagerJson(buildManagerApiUrl('projects'));
        const projects = Array.isArray(payload.projects) ? payload.projects : [];
        renderManagedProjects(projects);
        setManagerStatus(projects.length > 0 ? 'Escolha um projeto para apagar o JSON.' : 'Nenhum projeto salvo no momento.', projects.length > 0 ? 'success' : 'warning');
    } catch (error) {
        console.error(error);
        renderManagedProjects([]);
        setManagerStatus(error.message || 'Nao foi possivel carregar os projetos.', 'error');
    }
}

function renderManagedProjects(projects) {
    managerElements.count.textContent = `${projects.length} projeto${projects.length === 1 ? '' : 's'}`;
    managerElements.projectList.innerHTML = '';
    if (projects.length === 0) {
        managerElements.projectList.innerHTML = '<div class="empty-state">Nenhum arquivo JSON encontrado para apagar.</div>';
        return;
    }

    const fragment = document.createDocumentFragment();
    projects.forEach((project) => {
        const card = document.createElement('div');
        const stats = project.stats || {};
        card.className = 'project-card project-card--static';
        card.innerHTML = `
            <strong>${escapeManagerHtml(String(project.name || 'Projeto sem nome'))}</strong>
            <span>${escapeManagerHtml(formatManagerDate(project.updatedAt))}</span>
            <div class="project-card__meta">
                <span>${Number(project.itemCount || 0)} pecas</span>
                <span>L ${formatManagerMeters(Number(stats.widthM || 0))}</span>
                <span>A ${formatManagerMeters(Number(stats.heightM || 0))}</span>
                <span>${escapeManagerHtml(formatManagerEditor(project.editor))}</span>
            </div>
            <div class="project-card__id">Arquivo: ${escapeManagerHtml(String(project.id || ''))}.json</div>
            <div class="project-card__actions">
                <button type="button" class="danger-btn" data-action="delete" data-project-id="${escapeManagerHtml(String(project.id || ''))}" data-project-name="${escapeManagerHtml(String(project.name || 'Projeto sem nome'))}">Apagar JSON</button>
            </div>
        `;
        fragment.appendChild(card);
    });
    managerElements.projectList.appendChild(fragment);
}

function handleManagerProjectClick(event) {
    const button = event.target.closest('[data-action="delete"]');
    if (!button) {
        return;
    }
    deleteManagedProject(button.dataset.projectId || '', button.dataset.projectName || 'Projeto sem nome');
}

async function deleteManagedProject(projectId, projectName) {
    if (!projectId) {
        return;
    }
    if (!window.confirm(`Apagar o arquivo JSON do projeto \"${projectName}\"?`)) {
        return;
    }
    try {
        setManagerStatus(`Apagando ${projectName}...`, 'info');
        await requestManagerJson(buildManagerApiUrl('delete_project'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: projectId }),
        });
        await loadManagedProjects();
        setManagerStatus(`Projeto ${projectName} apagado com sucesso.`, 'success');
    } catch (error) {
        console.error(error);
        setManagerStatus(error.message || 'Nao foi possivel apagar o projeto.', 'error');
    }
}

function buildManagerApiUrl(action) {
    const url = new URL(managerConfig.apiBase || 'api.php', window.location.href);
    url.searchParams.set('action', action);
    return url.toString();
}

async function requestManagerJson(url, options = {}) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.error || 'Falha ao comunicar com o servidor.');
    }
    return payload;
}

function setManagerStatus(message, tone) {
    managerElements.status.textContent = message;
    managerElements.status.className = `status-box status-box--${tone}`;
}

function formatManagerMeters(value) {
    return `${managerNumberFormatter.format(Number(value || 0))} m`;
}

function formatManagerDate(value) {
    const date = new Date(value || '');
    if (Number.isNaN(date.getTime())) {
        return 'Data indisponivel';
    }
    return `Atualizado ${managerDateFormatter.format(date)}`;
}

function formatManagerEditor(editor) {
    return editor === 'terrain' ? 'Terreno' : editor === 'rigging2' ? 'Amarracao 3D' : editor === 'rigging' ? 'Armacao' : 'Tecnica';
}

function escapeManagerHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}


