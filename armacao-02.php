<?php

declare(strict_types=1);
?><!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Planta de armacao 02</title>
    <link rel="stylesheet" href="assets/styles.css">
</head>
<body data-page="armacao-02" class="rigging-layout rigging-layout--unified">
    <div class="app-frame">
        <header class="top-nav">
            <div class="top-nav__brand">
                <p class="eyebrow">Grid Builder</p>
                <h1>Planta de armacao 02</h1>
                <span>Monte e edite a estrutura em uma unica area 3D, com camera e pecas no mesmo palco.</span>
            </div>
            <nav class="top-nav__menu" aria-label="Navegacao principal">
                <a class="nav-link" data-page="tecnica" href="index.php">Planta tecnica</a>
                <a class="nav-link" data-page="terreno" href="terreno.php">Planta terreno</a>
                <a class="nav-link" data-page="armacao" href="armacao.php">Planta de armacao</a>
                <div class="top-nav__more">
                    <button type="button" class="nav-link top-nav__more-btn" aria-haspopup="menu" aria-expanded="false">Mais</button>
                    <div class="top-nav__more-menu" role="menu" aria-label="Mais opcoes">
                        <a class="nav-link" role="menuitem" data-page="armacao-02" href="armacao-02.php">Planta de armacao 02</a>
                        <a class="nav-link" role="menuitem" data-page="projetos-salvos" href="projetos-salvos.php">Projetos salvos</a>
                        <a class="nav-link" role="menuitem" data-page="salvar-plantas" href="salvar-plantas.php">Imprimir plantas</a>
                    </div>
                </div>
            </nav>
        </header>

        <div class="app-shell">
            <aside id="rigging2LibrarySidebar" class="sidebar rigging-sidebar rigging-sidebar--library">
                <button id="rigging2LibraryToggle" type="button" class="rigging-sidebar-toggle" aria-label="Ocultar biblioteca" aria-expanded="true">
                    <span></span><span></span><span></span>
                </button>
                <section class="panel">
                    <div class="panel-heading">
                        <div>
                            <p class="eyebrow">Biblioteca</p>
                            <h2>Componentes de armacao 02</h2>
                        </div>
                        <p class="panel-help">Clique para inserir a peca na cena. A mesma area serve para montar, girar a camera e editar o objeto.</p>
                    </div>
                    <div id="rigging2Catalog" class="catalog-list"></div>
                </section>
            </aside>

            <main class="main-column rigging-main-column">
                <section class="panel toolbar-panel">
                    <div class="toolbar-row">
                        <div class="toolbar-group toolbar-group--grow">
                            <label class="field">
                                <span>Nome do projeto</span>
                                <input id="rigging2ProjectName" type="text" maxlength="120" placeholder="Ex.: Torre metalica palco 3D unificado">
                            </label>
                        </div>
                        <div class="toolbar-group toolbar-actions">
                            <a href="projetos.php" class="secondary-btn button-link">Apagar JSON</a>
                            <button id="rigging2NewBtn" type="button" class="secondary-btn">Novo projeto</button>
                            <button id="rigging2SaveBtn" type="button" class="primary-btn">Salvar JSON</button>
                        </div>
                    </div>

                    <div class="toolbar-row toolbar-row--compact">
                        <div class="toolbar-group toolbar-group--canvas">
                            <label class="field field--small">
                                <span>Largura da base (m)</span>
                                <input id="rigging2CanvasWidth" type="number" min="2" step="0.1" value="20">
                            </label>
                            <label class="field field--small">
                                <span>Altura da base (m)</span>
                                <input id="rigging2CanvasHeight" type="number" min="2" step="0.1" value="12">
                            </label>
                            <button id="rigging2ApplyCanvas" type="button" class="secondary-btn">Aplicar planta</button>
                        </div>
                        <div class="toolbar-group metrics-strip">
                            <div class="metric-card">
                                <span>Largura montada</span>
                                <strong id="rigging2WidthStat">0,00 m</strong>
                            </div>
                            <div class="metric-card">
                                <span>Altura montada</span>
                                <strong id="rigging2HeightStat">0,00 m</strong>
                            </div>
                            <div class="metric-card">
                                <span>Profundidade</span>
                                <strong id="rigging2DepthStat">0,00 m</strong>
                            </div>
                            <div class="metric-card">
                                <span>Pecas</span>
                                <strong id="rigging2TotalItems">0</strong>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="panel workspace-panel">
                    <div class="workspace-head">
                        <div>
                            <p class="eyebrow">Armacao 02</p>
                            <h2>Palco unico 3D</h2>
                        </div>
                        <div class="workspace-head__controls">
                            <p class="panel-help">Tudo acontece na mesma area: clique para selecionar, arraste para mover, arraste no vazio para orbitar a camera e use as teclas abaixo junto com o mouse para transformar a peca.</p>
                            <div class="legend-toggle-group" aria-label="Opcoes de visualizacao da armacao">
                                <label class="toggle-chip">
                                    <input id="rigging2ToggleNames" type="checkbox" checked>
                                    <span>Mostrar nomes</span>
                                </label>
                                <label class="toggle-chip">
                                    <input id="rigging2ToggleDimensions" type="checkbox" checked>
                                    <span>Mostrar medidas</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="rigging-panel-card rigging-panel-card--unified">
                        <div class="rigging-panel-card__head">
                            <strong>Area unica de edicao 3D</strong>
                            <div class="rigging-preview-toolbar" aria-label="Vistas da camera">
                                <button id="rigging2ViewIso" type="button" class="secondary-btn">Iso</button>
                                <button id="rigging2ViewFront" type="button" class="secondary-btn">Frente</button>
                                <button id="rigging2ViewSide" type="button" class="secondary-btn">Lateral</button>
                                <button id="rigging2ViewTop" type="button" class="secondary-btn">Topo</button>
                                <select id="rigging2ZoomPreset" class="rigging-zoom-select" aria-label="Zoom da cena 3D">
                                    <option value="100">100%</option>
                                    <option value="200">200%</option>
                                    <option value="300">300%</option>
                                    <option value="800">800%</option>
                                    <option value="1500">1500%</option>
                                </select>
                                <button id="rigging2FullscreenBtn" type="button" class="secondary-btn" aria-pressed="false">Tela inteira</button>
                            </div>
                        </div>
                        <div id="rigging2ViewportWrap" class="rigging-preview-wrap rigging-preview-wrap--unified">
                            <canvas id="rigging2Viewport" class="rigging-preview rigging-preview--unified" width="1280" height="720"></canvas>
                            <div class="rigging-shortcuts rigging-shortcuts--unified">
                                <span><code>Mouse</code> no vazio orbita a camera</span>
                                <span><code>Mouse</code> na peca move no plano</span>
                                <span><code>A + Mouse</code> aumenta/diminui</span>
                                <span><code>X + Mouse</code> sobe/desce nivel</span>
                                <span><code>C + Mouse</code> gira a peca</span>
                                <span><code>Shift + Mouse</code> ajusta largura/profundidade</span>
                                <span><code>Roda</code> zoom</span>
                                <span><code>Ctrl + C/V</code> copia/cola</span>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <div class="rigging-sidebar-docks">
                <button id="rigging2LibraryDock" type="button" class="rigging-sidebar-dock" hidden aria-label="Mostrar biblioteca">
                    <span></span>
                    <strong>Biblioteca</strong>
                </button>
                <button id="rigging2EditDock" type="button" class="rigging-sidebar-dock" hidden aria-label="Mostrar painel de edicao">
                    <span></span>
                    <strong>Edicao</strong>
                </button>
            </div>

            <aside id="rigging2EditSidebar" class="sidebar sidebar--right rigging-sidebar rigging-sidebar--edit">
                <button id="rigging2EditToggle" type="button" class="rigging-sidebar-toggle rigging-sidebar-toggle--right" aria-label="Ocultar painel de edicao" aria-expanded="true">
                    <span></span><span></span><span></span>
                </button>
                <section class="panel">
                    <div class="panel-heading">
                        <div>
                            <p class="eyebrow">Edicao</p>
                            <h2>Peca selecionada</h2>
                        </div>
                    </div>

                    <div id="rigging2SelectionEmpty" class="empty-state">
                        Selecione uma peca no palco para editar medidas, altura, rotacao e cor.
                    </div>

                    <form id="rigging2SelectionForm" class="selection-form" hidden>
                        <label class="field">
                            <span>Componente</span>
                            <input id="rigging2SelectedName" type="text" readonly>
                        </label>
                        <div class="field-row">
                            <label class="field field--small">
                                <span>Largura X (m)</span>
                                <input id="rigging2SelectedWidth" type="number" min="0.05" step="0.05">
                            </label>
                            <label class="field field--small">
                                <span>Altura Y (m)</span>
                                <input id="rigging2SelectedHeight" type="number" min="0.05" step="0.05">
                            </label>
                        </div>
                        <label class="field">
                            <span>Profundidade Z (m)</span>
                            <input id="rigging2SelectedDepth" type="number" min="0.02" step="0.01">
                        </label>
                        <div class="field-row">
                            <label class="field field--small">
                                <span>Posicao X (m)</span>
                                <input id="rigging2SelectedX" type="number" min="0" step="0.1">
                            </label>
                            <label class="field field--small">
                                <span>Posicao Y (m)</span>
                                <input id="rigging2SelectedY" type="number" min="0" step="0.1">
                            </label>
                        </div>
                        <label class="field">
                            <span>Elevacao Z (m)</span>
                            <input id="rigging2SelectedZ" type="number" min="0" step="0.1">
                        </label>
                        <div class="field-row field-row--triple">
                            <label class="field field--small">
                                <span>Rotacao X</span>
                                <input id="rigging2SelectedRotationX" type="number" step="1">
                            </label>
                            <label class="field field--small">
                                <span>Rotacao Y</span>
                                <input id="rigging2SelectedRotationY" type="number" step="1">
                            </label>
                            <label class="field field--small">
                                <span>Rotacao Z</span>
                                <input id="rigging2SelectedRotationZ" type="number" step="1">
                            </label>
                        </div>
                        <label class="field">
                            <span>Cor da peca</span>
                            <input id="rigging2SelectedColor" type="color" value="#3F4B5B">
                        </label>
                        <div class="action-row">
                            <button id="rigging2DuplicateBtn" type="button" class="secondary-btn">Duplicar</button>
                            <button id="rigging2DeleteBtn" type="button" class="danger-btn">Remover</button>
                        </div>
                    </form>
                </section>

                <section class="panel">
                    <div class="panel-heading">
                        <div>
                            <p class="eyebrow">Historico</p>
                            <h2>Projetos de armacao 02</h2>
                        </div>
                        <p class="panel-help">Abra um projeto salvo desse novo editor unificado sem misturar com a armação anterior.</p>
                    </div>
                    <div id="rigging2ProjectList" class="project-list"></div>
                </section>

                <section class="panel">
                    <div class="panel-heading">
                        <div>
                            <p class="eyebrow">Status</p>
                            <h2>Fluxo</h2>
                        </div>
                    </div>
                    <div id="rigging2Status" class="status-box status-box--info">Carregando editor de armacao 02...</div>
                </section>
            </aside>
        </div>
    </div>

    <script>
        window.RIGGING2_CONFIG = {
            apiBase: 'api.php',
            defaultCanvasWidthM: 20,
            defaultCanvasHeightM: 12,
            scalePxPerMeter: 54,
            snapStepM: 0.1
        };
    </script>
    <script src="assets/nav.js" defer></script>
    <script src="assets/armacao-02.js" defer></script>
</body>
</html>
