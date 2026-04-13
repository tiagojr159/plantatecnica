const overviewConfig = window.PROJECT_OVERVIEW_CONFIG || {};
const overviewElements = {};

const numberFormatter = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});
const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
});

document.addEventListener('DOMContentLoaded', () => {
    overviewElements.list = document.getElementById('projectOverview');
    overviewElements.status = document.getElementById('projectStatus');
    overviewElements.count = document.getElementById('listCount');
    loadOverviewProjects();
});

async function loadOverviewProjects() {
    try {
        setStatus('Carregando projetos salvos...', 'info');
        const payload = await requestOverviewJson(buildOverviewUrl('projects'));
        const projects = Array.isArray(payload.projects) ? payload.projects : [];
        renderOverviewProjects(projects);
        setStatus(projects.length ? 'Clique em abrir para editar um projeto existente.' : 'Nenhum projeto salvo no momento.', projects.length ? 'success' : 'warning');
    } catch (error) {
        console.error(error);
        setStatus(error.message || 'Nao foi possivel carregar os projetos.', 'error');
        renderOverviewProjects([]);
    }
}

function renderOverviewProjects(projects) {
    overviewElements.count.textContent = `${projects.length} projeto${projects.length === 1 ? '' : 's'}`;
    overviewElements.list.innerHTML = '';
    if (projects.length === 0) {
        overviewElements.list.innerHTML = '<div class="empty-state">Sem projetos armazenados.</div>';
        return;
    }

    const fragment = document.createDocumentFragment();
    projects.forEach((project) => {
        const card = document.createElement('div');
        card.className = 'project-card';
        const stats = project.stats || {};
        const projectId = escapeHtml(project.id || '');
        const editor = String(project.editor || 'technical');
        const editorLabel = editor === 'terrain' ? 'Terreno' : editor === 'rigging2' ? 'Amarracao 3D' : editor === 'rigging' ? 'Armacao' : 'Tecnica';
        const targetPage = editor === 'terrain' ? 'terreno.php' : editor === 'rigging2' ? 'armacao-02.php' : editor === 'rigging' ? 'armacao.php' : 'index.php';
        card.innerHTML = `
            <strong>${escapeHtml(project.name || 'Projeto sem nome')}</strong>
            <span>${escapeHtml(formatProjectDate(project.updatedAt))}</span>
            <div class="project-card__meta">
                <span>${Number(project.itemCount || 0)} pecas</span>
                <span>L ${formatOverviewMeters(Number(stats.widthM || 0))}</span>
                <span>A ${formatOverviewMeters(Number(stats.heightM || 0))}</span>
                <span>${escapeHtml(editorLabel)}</span>
            </div>
            <div class="project-card__actions">
                <a class="primary-btn" href="${targetPage}?project=${encodeURIComponent(projectId)}">Abrir projeto</a>
            </div>
        `;
        fragment.appendChild(card);
    });
    overviewElements.list.appendChild(fragment);
}

async function requestOverviewJson(url, options = {}) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.error || 'Falha na comunicacao com o servidor.');
    }
    return payload;
}

function buildOverviewUrl(action) {
    const url = new URL(overviewConfig.apiBase || 'api.php', window.location.href);
    url.searchParams.set('action', action);
    return url.toString();
}

function setStatus(message, tone) {
    overviewElements.status.textContent = message;
    overviewElements.status.className = `status-box status-box--${tone}`;
}

function formatOverviewMeters(value) {
    return `${numberFormatter.format(Number(value || 0))} m`;
}

function formatProjectDate(value) {
    const date = new Date(value || '');
    if (Number.isNaN(date.getTime())) {
        return 'Data indisponivel';
    }
    return `Atualizado ${dateFormatter.format(date)}`;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}



