<?php

declare(strict_types=1);
?><!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Planta do terreno</title>
    <link rel="stylesheet" href="assets/styles.css">
</head>
<body data-page="terreno">
    <div class="app-frame">
        <header class="top-nav">
            <div class="top-nav__brand">
                <p class="eyebrow">Grid Builder</p>
                <h1>Planta do terreno</h1>
                <span>Monte palcos, escadas, rampas, paredes e patamares em uma vista de terreno.</span>
            </div>
            <nav class="top-nav__menu" aria-label="Navegacao principal">
                <a class="nav-link" data-page="tecnica" href="index.php">Planta tecnica</a>
                <a class="nav-link" data-page="terreno" href="terreno.php">Planta terreno</a>
                <a class="nav-link" data-page="armacao" href="armacao.php">Planta de armacao</a>
                <div class="top-nav__more">
                    <button type="button" class="nav-link top-nav__more-btn" aria-haspopup="menu" aria-expanded="false">Mais</button>
                    <div class="top-nav__more-menu" role="menu" aria-label="Mais opcoes">
                        <a class="nav-link" role="menuitem" data-page="armacao-02" href="armacao-02.php">Planta de amarracao 3D</a>
                        <a class="nav-link" role="menuitem" data-page="projetos-salvos" href="projetos-salvos.php">Projetos salvos</a>
                        <a class="nav-link" role="menuitem" data-page="salvar-plantas" href="salvar-plantas.php">Imprimir plantas</a>
                    </div>
                </div>
            </nav>
        </header>

        <div class="app-shell">
            <aside class="sidebar">
                <section class="panel terrain-catalog-panel">
                    <div class="panel-heading">
                        <div>
                            <p class="eyebrow">Biblioteca</p>
                            <h2>Componentes do terreno</h2>
                        </div>
                        <p class="panel-help">Escolha um bloco de palco, escada, rampa, parede ou patamar e monte a planta na area central.</p>
                    </div>
                    <div id="terrainCatalog" class="catalog-list terrain-catalog-list"></div>
                </section>
            </aside>

            <main class="main-column">
                <section class="panel toolbar-panel">
                    <div class="toolbar-row">
                        <div class="toolbar-group toolbar-group--grow">
                            <label class="field">
                                <span>Nome do projeto</span>
                                <input id="terrainProjectName" type="text" maxlength="120" placeholder="Ex.: Terreno principal 2026">
                            </label>
                        </div>
                        <div class="toolbar-group toolbar-actions">
                            <a href="projetos.php" class="secondary-btn button-link">Apagar JSON</a>
                            <button id="terrainNewBtn" type="button" class="secondary-btn">Novo desenho</button>
                            <button id="terrainSaveBtn" type="button" class="primary-btn">Salvar JSON</button>
                        </div>
                    </div>

                    <div class="toolbar-row toolbar-row--compact">
                        <div class="toolbar-group toolbar-group--canvas">
                            <label class="field field--small">
                                <span>Largura do terreno (m)</span>
                                <input id="terrainCanvasWidth" type="number" min="5" step="0.1" value="40">
                            </label>
                            <label class="field field--small">
                                <span>Altura do terreno (m)</span>
                                <input id="terrainCanvasHeight" type="number" min="5" step="0.1" value="20">
                            </label>
                            <div class="quick-grow-group">
                                <button id="terrainExpandWidth10" type="button" class="secondary-btn">+10 m largura</button>
                                <button id="terrainExpandWidth25" type="button" class="secondary-btn">+25 m largura</button>
                            </div>
                            <button id="terrainApplyCanvas" type="button" class="secondary-btn">Aplicar area</button>
                        </div>
                        <div class="toolbar-group metrics-strip">
                            <div class="metric-card">
                                <span>Largura montada</span>
                                <strong id="terrainAssembledWidth">0,00 m</strong>
                            </div>
                            <div class="metric-card">
                                <span>Altura montada</span>
                                <strong id="terrainAssembledHeight">0,00 m</strong>
                            </div>
                            <div class="metric-card">
                                <span>Itens na planta</span>
                                <strong id="terrainTotalItems">0</strong>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="panel workspace-panel">
                    <div class="workspace-head">
                        <div>
                            <p class="eyebrow">Terreno</p>
                            <h2>Editor da planta</h2>
                        </div>
                        <div class="workspace-head__controls">
                            <p class="panel-help">As cotas acompanham cada palco, rampa, parede ou escada. Selecione um item para mudar rotacao, legenda e medidas.</p>
                            <div class="legend-toggle-group" aria-label="Opcoes de legenda do terreno">
                                <label class="toggle-chip">
                                    <input id="terrainToggleDimensions" type="checkbox" checked>
                                    <span>Mostrar dimensoes</span>
                                </label>
                                <label class="toggle-chip">
                                    <input id="terrainToggleNames" type="checkbox" checked>
                                    <span>Mostrar nomes</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="terrain-workspace-scroll">
                        <div id="terrainBoard" class="terrain-board">
                            <svg id="terrainWorkspace" class="terrain-svg" aria-label="Area de montagem do terreno"></svg>
                        </div>
                    </div>
                </section>
            </main>

            <aside class="sidebar sidebar--right">
                <section class="panel">
                    <div class="panel-heading">
                        <div>
                            <p class="eyebrow">Edicao</p>
                            <h2>Elemento selecionado</h2>
                        </div>
                    </div>

                    <div id="terrainSelectionEmpty" class="empty-state">
                        Selecione um elemento do terreno para ajustar medidas, legenda e rotacao.
                    </div>

                    <form id="terrainSelectionForm" class="selection-form" hidden>
                        <label class="field">
                            <span>Tipo</span>
                            <input id="terrainSelectedType" type="text" readonly>
                        </label>
                        <label class="field">
                            <span>Legenda</span>
                            <input id="terrainSelectedLabel" type="text" maxlength="48">
                        </label>
                        <div class="field-row">
                            <label class="field field--small">
                                <span>Largura (m)</span>
                                <input id="terrainSelectedWidth" type="number" min="0.5" step="0.1">
                            </label>
                            <label class="field field--small">
                                <span>Altura (m)</span>
                                <input id="terrainSelectedHeight" type="number" min="0.1" step="0.1">
                            </label>
                        </div>
                        <div class="field-row">
                            <label class="field field--small">
                                <span>Posicao X (m)</span>
                                <input id="terrainSelectedX" type="number" min="0" step="0.1">
                            </label>
                            <label class="field field--small">
                                <span>Posicao Y (m)</span>
                                <input id="terrainSelectedY" type="number" min="0" step="0.1">
                            </label>
                        </div>
                        <label class="field">
                            <span>Rotacao (graus)</span>
                            <input id="terrainSelectedRotation" type="number" step="1" value="0">
                        </label>
                        <div class="action-row">
                            <button id="terrainDuplicateItem" type="button" class="secondary-btn">Duplicar</button>
                            <button id="terrainDeleteItem" type="button" class="danger-btn">Remover</button>
                        </div>
                    </form>
                </section>

                <section class="panel">
                    <div class="panel-heading">
                        <div>
                            <p class="eyebrow">Historico</p>
                            <h2>Projetos do terreno</h2>
                        </div>
                        <p class="panel-help">Abra um projeto salvo, continue editando e salve de novo.</p>
                    </div>
                    <div id="terrainProjectList" class="project-list"></div>
                </section>

                <section class="panel">
                    <div class="panel-heading">
                        <div>
                            <p class="eyebrow">Status</p>
                            <h2>Fluxo</h2>
                        </div>
                    </div>
                    <div id="terrainStatus" class="status-box status-box--info">Carregando editor do terreno...</div>
                </section>
            </aside>
        </div>
    </div>

    <script>
        window.TERRAIN_CONFIG = {
            apiBase: 'api.php',
            defaultCanvasWidthM: 40,
            defaultCanvasHeightM: 20,
            scalePxPerMeter: 52,
            snapStepM: 0.1
        };
    </script>
    <script src="assets/nav.js" defer></script>
    <script src="assets/terrain.js" defer></script>
</body>
</html>








