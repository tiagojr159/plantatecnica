<?php

declare(strict_types=1);
?><!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Planta de armacao</title>
    <link rel="stylesheet" href="assets/styles.css">
</head>
<body data-page="armacao" class="rigging-layout">
    <div class="app-frame">
        <header class="top-nav">
            <div class="top-nav__brand">
                <p class="eyebrow">Grid Builder</p>
                <h1>Planta de armacao</h1>
                <span>Monte barras, travamentos e modulos em uma vista de planta com preview 3D orbitavel.</span>
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
            <aside id="riggingLibrarySidebar" class="sidebar rigging-sidebar rigging-sidebar--library">
                <button id="riggingLibraryToggle" type="button" class="rigging-sidebar-toggle" aria-label="Ocultar biblioteca" aria-expanded="true">
                    <span></span><span></span><span></span>
                </button>
                <section class="panel">
                    <div class="panel-heading">
                        <div>
                            <p class="eyebrow">Biblioteca</p>
                            <h2>Componentes de armacao</h2>
                        </div>
                        <p class="panel-help">Use os mesmos componentes da planta tecnica. Cada peca entra como volume 3D com profundidade editavel.</p>
                    </div>
                    <div id="riggingCatalog" class="catalog-list"></div>
                </section>
            </aside>

            <main class="main-column rigging-main-column">
                <section class="panel toolbar-panel">
                    <div class="toolbar-row">
                        <div class="toolbar-group toolbar-group--grow">
                            <label class="field">
                                <span>Nome do projeto</span>
                                <input id="riggingProjectName" type="text" maxlength="120" placeholder="Ex.: Torre metalica palco principal">
                            </label>
                        </div>
                        <div class="toolbar-group toolbar-actions">
                            <a href="projetos.php" class="secondary-btn button-link">Apagar JSON</a>
                            <button id="riggingNewBtn" type="button" class="secondary-btn">Novo projeto</button>
                            <button id="riggingSaveBtn" type="button" class="primary-btn">Salvar JSON</button>
                        </div>
                    </div>

                    <div class="toolbar-row toolbar-row--compact">
                        <div class="toolbar-group toolbar-group--canvas">
                            <label class="field field--small">
                                <span>Largura da base (m)</span>
                                <input id="riggingCanvasWidth" type="number" min="2" step="0.1" value="20">
                            </label>
                            <label class="field field--small">
                                <span>Altura da base (m)</span>
                                <input id="riggingCanvasHeight" type="number" min="2" step="0.1" value="12">
                            </label>
                            <button id="riggingApplyCanvas" type="button" class="secondary-btn">Aplicar planta</button>
                        </div>
                        <div class="toolbar-group metrics-strip">
                            <div class="metric-card">
                                <span>Largura montada</span>
                                <strong id="riggingWidthStat">0,00 m</strong>
                            </div>
                            <div class="metric-card">
                                <span>Altura montada</span>
                                <strong id="riggingHeightStat">0,00 m</strong>
                            </div>
                            <div class="metric-card">
                                <span>Profundidade</span>
                                <strong id="riggingDepthStat">0,00 m</strong>
                            </div>
                            <div class="metric-card">
                                <span>Pecas</span>
                                <strong id="riggingTotalItems">0</strong>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="panel workspace-panel">
                    <div class="workspace-head">
                        <div>
                            <p class="eyebrow">Armacao</p>
                            <h2>Base 2D e preview 3D</h2>
                        </div>
                        <div class="workspace-head__controls">
                            <p class="panel-help">Na planta voce posiciona a base. No preview 3D arraste com o mouse para orbitar a camera, use a roda para aproximar e <code>Q/E</code> ou a alca circular da peca para girar na diagonal.</p>
                            <div class="legend-toggle-group" aria-label="Opcoes de visualizacao da armacao">
                                <label class="toggle-chip">
                                    <input id="riggingToggleNames" type="checkbox" checked>
                                    <span>Mostrar nomes</span>
                                </label>
                                <label class="toggle-chip">
                                    <input id="riggingToggleDimensions" type="checkbox" checked>
                                    <span>Mostrar medidas</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="rigging-stage-grid">
                        <div class="rigging-panel-card">
                            <div class="rigging-panel-card__head">
                                <strong>Planta da base</strong>
                                <span>Arraste as pecas e ajuste a cota Z no painel lateral.</span>
                            </div>
                            <div class="workspace-scroll rigging-workspace-scroll">
                                <div id="riggingWorkspace" class="workspace rigging-workspace" aria-label="Base da armacao"></div>
                            </div>
                        </div>
                        <div class="rigging-panel-card">
                            <div class="rigging-panel-card__head">
                                <div>
                                    <strong>3D</strong>
                                    <span> preview.</span>
                                </div>
                                <div class="rigging-preview-toolbar" aria-label="Vistas da camera">
                                    <button id="riggingViewIso" type="button" class="secondary-btn">Iso</button>
                                    <button id="riggingViewFront" type="button" class="secondary-btn">Frente</button>
                                    <button id="riggingViewSide" type="button" class="secondary-btn">Lateral</button>
                                    <button id="riggingViewTop" type="button" class="secondary-btn">Topo</button>
                                    <select id="riggingZoomPreset" class="rigging-zoom-select" aria-label="Zoom do preview 3D">
                                        <option value="custom">Zoom livre</option>
                                        <option value="100">100%</option>
                                        <option value="200">200%</option>
                                        <option value="300">300%</option>
                                        <option value="800">800%</option>
                                        <option value="1500">1500%</option>
                                    </select>
                                    <button id="riggingFullscreenBtn" type="button" class="secondary-btn" aria-pressed="false" title="Abrir em tela inteira">Tela inteira</button>
                                </div>
                            </div>
                            <div id="riggingPreviewWrap" class="rigging-preview-wrap">
                                <canvas id="riggingPreview" class="rigging-preview" width="920" height="520"></canvas>
                                <div class="rigging-shortcuts">
                                    <span><code>A</code> orbita</span>
                                    <span><code>Mouse</code> gira camera</span>
                                    <span><code>Roda</code> zoom</span>
                                    <span><code>Setas</code> movem camera</span>
                                    <span><code>Shift + Setas</code> movem a peca</span>\r\n                                    <span><code>Ctrl + Setas</code> movem a peca (0.50m)</span>
                                    <span><code>Ctrl + C/V</code> copia/cola a peca</span>\r\n                                    <span><code>Shift + Mouse</code> sobe/desce (Z)</span>
                                    <span><code>PgUp/PgDn</code> sobe/desce</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <div class="rigging-sidebar-docks">
                <button id="riggingLibraryDock" type="button" class="rigging-sidebar-dock" hidden aria-label="Mostrar biblioteca">
                    <span></span>
                    <strong>Biblioteca</strong>
                </button>
                <button id="riggingEditDock" type="button" class="rigging-sidebar-dock" hidden aria-label="Mostrar painel de edicao">
                    <span></span>
                    <strong>Edicao</strong>
                </button>
            </div>

            <aside id="riggingEditSidebar" class="sidebar sidebar--right rigging-sidebar rigging-sidebar--edit">
                <button id="riggingEditToggle" type="button" class="rigging-sidebar-toggle rigging-sidebar-toggle--right" aria-label="Ocultar painel de edicao" aria-expanded="true">
                    <span></span><span></span><span></span>
                </button>
                <section class="panel">
                    <div class="panel-heading">
                        <div>
                            <p class="eyebrow">Edicao</p>
                            <h2>Peca selecionada</h2>
                        </div>
                    </div>

                    <div id="riggingSelectionEmpty" class="empty-state">
                        Selecione uma peca na planta para editar medidas, plano 3D, elevacao e rotacoes por eixo.
                    </div>

                    <form id="riggingSelectionForm" class="selection-form" hidden>
                        <label class="field">
                            <span>Componente</span>
                            <input id="riggingSelectedName" type="text" readonly>
                        </label>
                        <div class="field-row">
                            <label class="field field--small">
                                <span id="riggingWidthLabel">Largura X (m)</span>
                                <input id="riggingSelectedWidth" type="number" min="0.05" step="0.05">
                            </label>
                            <label class="field field--small">
                                <span id="riggingHeightLabel">Altura Y (m)</span>
                                <input id="riggingSelectedHeight" type="number" min="0.05" step="0.05">
                            </label>
                        </div>
                        <label class="field">
                            <span id="riggingDepthLabel">Profundidade Z (m)</span>
                            <input id="riggingSelectedDepth" type="number" min="0.02" step="0.01">
                        </label>
                        <p id="riggingDimensionHint" class="panel-help">Na base 2D voce ve a area ocupada no piso. Em pecas em pe, a altura aparece principalmente no preview 3D.</p>
                        <label class="field">
                            <span>Plano 3D da peca</span>
                            <select id="riggingSelectedMountMode">
                                <option value="floor">Base no piso</option>
                                <option value="wall_x">Parede frontal</option>
                                <option value="wall_y">Parede lateral</option>
                            </select>
                        </label>
                        <div class="field-row">
                            <label class="field field--small">
                                <span>Posicao X (m)</span>
                                <input id="riggingSelectedX" type="number" min="0" step="0.1">
                            </label>
                            <label class="field field--small">
                                <span>Posicao Y (m)</span>
                                <input id="riggingSelectedY" type="number" min="0" step="0.1">
                            </label>
                        </div>
                        <label class="field">
                            <span>Elevacao Z (m)</span>
                            <input id="riggingSelectedZ" type="number" min="0" step="0.1">
                        </label>
                        <div class="action-row action-row--compact">
                            <button id="riggingZUp50" type="button" class="secondary-btn">+0.50m</button>
                            <button id="riggingZDown50" type="button" class="secondary-btn">-0.50m</button>
                        </div>
                        <div class="field-row field-row--triple">
                            <label class="field field--small">
                                <span>Rotacao X</span>
                                <input id="riggingSelectedRotationX" type="number" step="1">
                            </label>
                            <label class="field field--small">
                                <span>Rotacao Y</span>
                                <input id="riggingSelectedRotationY" type="number" step="1">
                            </label>
                            <label class="field field--small">
                                <span>Rotacao Z</span>
                                <input id="riggingSelectedRotationZ" type="number" step="1">
                            </label>
                        </div>
                        <div class="action-row action-row--compact">
                            <button id="riggingRotateLeftBtn" type="button" class="secondary-btn">Girar -15deg</button>
                            <button id="riggingRotateRightBtn" type="button" class="secondary-btn">Girar +15deg</button>
                        </div>
                        <label class="field">
                            <span>Cor da peca</span>
                            <input id="riggingSelectedColor" type="color" value="#3F4B5B">
                        </label>
                        <div class="action-row">
                            <button id="riggingDuplicateBtn" type="button" class="secondary-btn">Duplicar</button>
                            <button id="riggingDeleteBtn" type="button" class="danger-btn">Remover</button>
                        </div>
                    </form>
                </section>

                <section class="panel">
                    <div class="panel-heading">
                        <div>
                            <p class="eyebrow">Historico</p>
                            <h2>Projetos de armacao</h2>
                        </div>
                        <p class="panel-help">Abra um projeto salvo e continue a modelagem da armaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o metalica.</p>
                    </div>
                    <div id="riggingProjectList" class="project-list"></div>
                </section>

                <section class="panel">
                    <div class="panel-heading">
                        <div>
                            <p class="eyebrow">Status</p>
                            <h2>Fluxo</h2>
                        </div>
                    </div>
                    <div id="riggingStatus" class="status-box status-box--info">Carregando editor de armacao...</div>
                </section>
            </aside>
        </div>
    </div>

    <script>
        window.RIGGING_CONFIG = {
            apiBase: 'api.php',
            defaultCanvasWidthM: 20,
            defaultCanvasHeightM: 12,
            scalePxPerMeter: 54,
            snapStepM: 0.1
        };
    </script>
    <script src="assets/nav.js" defer></script>
    <script src="assets/armacao.js" defer></script>
</body>
</html>

