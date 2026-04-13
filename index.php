<?php

declare(strict_types=1);
?><!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Montador de Estruturas Grid</title>
    <link rel="stylesheet" href="assets/styles.css">
</head>
<body data-page="tecnica">
    <div class="app-frame">
        <header class="top-nav">
            <div class="top-nav__brand">
                <p class="eyebrow">Grid Builder</p>
                <h1>Montagem tecnica</h1>
                <span>Monte estruturas, veja dimensoes e salve os projetos.</span>
            </div>
            <nav class="top-nav__menu" aria-label="Navegacao principal">
                <a class="nav-link" data-page="tecnica" href="index.php">Planta tecnica</a>
                <a class="nav-link" data-page="terreno" href="terreno.php">Planta terreno</a>
                <a class="nav-link" data-page="armacao" href="armacao.php">Planta de armacao</a>
                <div class="top-nav__more">
                    <button type="button" class="nav-link top-nav__more-btn" aria-haspopup="menu" aria-expanded="false">Mais</button>
                    <div class="top-nav__more-menu" role="menu" aria-label="Mais opcoes">
                        <a class="nav-link" role="menuitem" data-page="projetos-salvos" href="projetos-salvos.php">Projetos salvos</a>
                        <a class="nav-link" role="menuitem" data-page="salvar-plantas" href="salvar-plantas.php">Imprimir plantas</a>
                    </div>
                </div>
            </nav>
        </header>

        <div class="app-shell">
            <aside class="sidebar">
                <section class="panel">
                    <div class="panel-heading">
                        <div>
                            <p class="eyebrow">Biblioteca</p>
                            <h2>Componentes</h2>
                        </div>
                        <p class="panel-help">Arraste as pecas da pasta <code>images</code> para a planta.</p>
                    </div>
                    <div id="catalog" class="catalog-list"></div>
                </section>
            </aside>

            <main class="main-column">
                <section class="panel toolbar-panel">
                    <div class="toolbar-row">
                        <div class="toolbar-group toolbar-group--grow">
                            <label class="field">
                                <span>Monte estruturas, veja dimensoes e salve os projetos.</span>
                                <input id="projectName" type="text" maxlength="120" placeholder="Ex.: Palco principal 2026">
                            </label>
                        </div>
                        <div class="toolbar-group toolbar-actions">
                            <a href="projetos.php" class="secondary-btn button-link">Apagar JSON</a>
                            <button id="newProjectBtn" type="button" class="secondary-btn">Novo projeto</button>
                            <button id="saveProjectBtn" type="button" class="primary-btn">Salvar JSON</button>
                        </div>
                    </div>

                    <div class="toolbar-row toolbar-row--compact">
                        <div class="toolbar-group toolbar-group--canvas">
                            <label class="field field--small">
                                <span>Monte estruturas, veja dimensoes e salve os projetos.</span>
                                <input id="canvasWidthInput" type="number" min="1" step="0.1" value="30">
                            </label>
                            <label class="field field--small">
                                <span>Monte estruturas, veja dimensoes e salve os projetos.</span>
                                <input id="canvasHeightInput" type="number" min="1" step="0.1" value="8">
                            </label>
                            <div class="quick-grow-group">
                                <button id="expandWidth10Btn" type="button" class="secondary-btn">+10 m largura</button>
                                <button id="expandWidth25Btn" type="button" class="secondary-btn">+25 m largura</button>
                            </div>
                            <button id="applyCanvasBtn" type="button" class="secondary-btn">Aplicar planta</button>
                        </div>
                        <div class="toolbar-group metrics-strip">
                            <div class="metric-card">
                                <span>Monte estruturas, veja dimensoes e salve os projetos.</span>
                                <strong id="assembledWidth">0,00 m</strong>
                            </div>
                            <div class="metric-card">
                                <span>Monte estruturas, veja dimensoes e salve os projetos.</span>
                                <strong id="assembledHeight">0,00 m</strong>
                            </div>
                            <div class="metric-card">
                                <span>Monte estruturas, veja dimensoes e salve os projetos.</span>
                                <strong id="totalItems">0</strong>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="panel workspace-panel">
                    <div class="workspace-head">
                        <div>
                            <p class="eyebrow">Montagem</p>
                            <h2>Planta tecnica</h2>
                        </div>
                        <div class="workspace-head__controls">
                            <p class="panel-help">Clique e arraste para reposicionar. A area pode crescer bastante na horizontal e voce pode navegar pelo scroll lateral.</p>
                            <div class="legend-toggle-group" aria-label="Opcoes de legenda">
                                <label class="toggle-chip">
                                    <input id="toggleDimensions" type="checkbox" checked>
                                    <span>Monte estruturas, veja dimensoes e salve os projetos.</span>
                                </label>
                                <label class="toggle-chip">
                                    <input id="toggleNames" type="checkbox" checked>
                                    <span>Monte estruturas, veja dimensoes e salve os projetos.</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="workspace-scroll">
                        <div id="workspace" class="workspace" aria-label="Area de montagem"></div>
                    </div>
                </section>
            </main>

            <aside class="sidebar sidebar--right">
                <section class="panel">
                    <div class="panel-heading">
                        <div>
                            <p class="eyebrow">Edicao</p>
                            <h2>Peca selecionada</h2>
                        </div>
                    </div>

                    <div id="selectionEmpty" class="empty-state">
                        Selecione uma peca na planta para ajustar a posicao e duplicar ou remover.
                    </div>

                    <form id="selectionForm" class="selection-form" hidden>
                        <label class="field">
                            <span>Monte estruturas, veja dimensoes e salve os projetos.</span>
                            <input id="selectedName" type="text" readonly>
                        </label>
                        <div class="field-row">
                            <label class="field field--small">
                                <span>Monte estruturas, veja dimensoes e salve os projetos.</span>
                                <input id="selectedWidth" type="number" step="0.1" min="0.1">
                            </label>
                            <label class="field field--small">
                                <span>Monte estruturas, veja dimensoes e salve os projetos.</span>
                                <input id="selectedHeight" type="number" step="0.1" min="0.1">
                            </label>
                        </div>
                        <div class="field-row">
                            <label class="field field--small">
                                <span>Monte estruturas, veja dimensoes e salve os projetos.</span>
                                <input id="selectedX" type="number" step="0.1" min="0">
                            </label>
                            <label class="field field--small">
                                <span>Monte estruturas, veja dimensoes e salve os projetos.</span>
                                <input id="selectedY" type="number" step="0.1" min="0">
                            </label>
                        </div>
                        <label class="field">
                            <span>Monte estruturas, veja dimensoes e salve os projetos.</span>
                            <input id="selectedRotation" type="number" step="1" value="0">
                        </label>
                        <div class="action-row">
                            <button id="duplicateItemBtn" type="button" class="secondary-btn">Duplicar</button>
                            <button id="deleteItemBtn" type="button" class="danger-btn">Remover</button>
                        </div>
                    </form>
                </section>

                <section class="panel">
                    <div class="panel-heading">
                        <div>
                            <p class="eyebrow">Historico</p>
                            <h2>Projetos salvos</h2>
                        </div>
                        <p class="panel-help">Abra um projeto salvo, continue editando e salve de novo.</p>
                    </div>
                    <div id="projectList" class="project-list"></div>
                </section>

                <section class="panel">
                    <div class="panel-heading">
                        <div>
                            <p class="eyebrow">Status</p>
                            <h2>Fluxo</h2>
                        </div>
                    </div>
                    <div id="statusMessage" class="status-box status-box--info">Carregando aplicacao...</div>
                </section>
            </aside>
        </div>
    </div>

    <script>
        window.APP_CONFIG = {
            apiBase: 'api.php',
            defaultCanvasWidthM: 30,
            defaultCanvasHeightM: 8,
            scalePxPerMeter: 90,
            snapStepM: 0.1
        };
    </script>
    <script src="assets/nav.js" defer></script>
    <script src="assets/app.js" defer></script>
</body>
</html>



