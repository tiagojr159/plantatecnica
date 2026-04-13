<?php

declare(strict_types=1);
?><!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Imprimir plantas em PDF</title>
    <link rel="stylesheet" href="assets/styles.css">
</head>
<body data-page="salvar-plantas">
    <div class="app-frame">
        <header class="top-nav">
            <div class="top-nav__brand">
                <p class="eyebrow">Grid Builder</p>
                <h1>Imprimir plantas</h1>
                <span>Monte a prancha e salve a planta tecnica, a planta do terreno, a armacao 3D ou a combinacao delas em PDF.</span>
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

        <div class="app-shell export-shell">
            <aside class="sidebar export-sidebar">
                <section class="panel">
                    <div class="panel-heading">
                        <div>
                            <p class="eyebrow">Selecao</p>
                            <h2>Projetos na prancha</h2>
                        </div>
                        <p class="panel-help">Escolha uma planta tecnica, uma planta do terreno, uma armacao 3D ou qualquer combinacao para gerar um unico PDF.</p>
                    </div>

                    <div class="selection-form export-form">
                        <label class="field">
                            <span>Planta tecnica</span>
                            <select id="pdfTechnicalProject"></select>
                        </label>
                        <label class="field">
                            <span>Planta do terreno</span>
                            <select id="pdfTerrainProject"></select>
                        </label>
                        <label class="field">
                            <span>Planta de armacao</span>
                            <select id="pdfRiggingProject"></select>
                        </label>
                    </div>
                </section>

                <section class="panel">
                    <div class="panel-heading">
                        <div>
                            <p class="eyebrow">Informacoes</p>
                            <h2>Caixa da prancha</h2>
                        </div>
                        <p class="panel-help">Esses dados entram no bloco lateral do PDF, junto com a logo, se voce informar um link.</p>
                    </div>

                    <div class="selection-form export-form">
                        <label class="field">
                            <span>Titulo principal</span>
                            <input id="pdfTitle" type="text" maxlength="140" placeholder="Ex.: Paixao de Cristo 2026">
                        </label>
                        <label class="field">
                            <span>Subtitulo</span>
                            <input id="pdfSubtitle" type="text" maxlength="180" placeholder="Ex.: Planta tecnica, terreno e armacao 3D">
                        </label>
                        <label class="field">
                            <span>Evento / cliente</span>
                            <input id="pdfEvent" type="text" maxlength="140" placeholder="Ex.: Prefeitura Municipal">
                        </label>
                        <label class="field">
                            <span>Local</span>
                            <input id="pdfLocation" type="text" maxlength="160" placeholder="Ex.: Iguarassu - PE">
                        </label>
                        <label class="field">
                            <span>Responsavel tecnico</span>
                            <input id="pdfResponsible" type="text" maxlength="140" placeholder="Ex.: Nome do responsavel tecnico">
                        </label>
                        <label class="field">
                            <span>Observacoes</span>
                            <textarea id="pdfNotes" rows="5" placeholder="Observacoes importantes para a prancha."></textarea>
                        </label>
                        <label class="field">
                            <span>Link da logo</span>
                            <input id="pdfLogoUrl" type="url" maxlength="320" placeholder="https://.../logo.png">
                        </label>
                    </div>
                </section>

                <section class="panel">
                    <div class="action-row export-actions">
                        <button id="pdfGenerateBtn" type="button" class="secondary-btn">Atualizar prancha</button>
                        <button id="pdfPrintBtn" type="button" class="primary-btn">Imprimir / Salvar PDF</button>
                    </div>
                    <div id="pdfStatus" class="status-box status-box--info">Carregando projetos para exportacao...</div>
                </section>
            </aside>

            <main class="main-column export-main">
                <section class="panel export-preview-panel">
                    <div class="workspace-head">
                        <div>
                            <p class="eyebrow">Prancha</p>
                            <h2>Preview do PDF</h2>
                        </div>
                        <p class="panel-help">O layout abaixo sera usado na impressao. No navegador, escolha a impressora "Salvar em PDF".</p>
                    </div>
                    <div class="export-preview-scroll">
                        <div id="pdfSheet" class="export-sheet export-sheet--empty">
                            <div class="export-sheet__canvas">
                                <section id="pdfTechnicalSection" class="export-section" hidden>
                                    <div class="export-section__header">
                                        <strong>Planta tecnica</strong>
                                        <span id="pdfTechnicalMeta"></span>
                                    </div>
                                    <div id="pdfTechnicalCanvas" class="export-canvas export-canvas--technical"></div>
                                </section>
                                <section id="pdfTerrainSection" class="export-section" hidden>
                                    <div class="export-section__header">
                                        <strong>Planta do terreno</strong>
                                        <span id="pdfTerrainMeta"></span>
                                    </div>
                                    <div id="pdfTerrainCanvas" class="export-canvas export-canvas--terrain">
                                        <svg id="pdfTerrainSvg" class="export-terrain-svg" aria-hidden="true"></svg>
                                    </div>
                                </section>
                                <section id="pdfRiggingSection" class="export-section" hidden>
                                    <div class="export-section__header">
                                        <strong>Planta de armacao</strong>
                                        <span id="pdfRiggingMeta"></span>
                                    </div>
                                    <div id="pdfRiggingCanvasWrap" class="export-canvas export-canvas--rigging">
                                        <canvas id="pdfRiggingCanvas" class="export-rigging-canvas" width="900" height="320"></canvas>
                                    </div>
                                </section>
                                <div id="pdfEmptyState" class="export-empty-state">
                                    Selecione pelo menos uma planta para montar a prancha do PDF.
                                </div>
                            </div>
                            <aside class="export-sheet__titleblock">
                                <div class="export-titleblock__logo-wrap">
                                    <img id="pdfLogoPreview" class="export-titleblock__logo" alt="Logo da prancha" hidden>
                                </div>
                                <div class="export-titleblock__content">
                                    <h2 id="pdfPreviewTitle">PLANTA DE MONTAGEM</h2>
                                    <p id="pdfPreviewSubtitle">Selecione as plantas e preencha as informacoes da prancha.</p>
                                    <dl class="export-titleblock__grid">
                                        <div>
                                            <dt>Evento / cliente</dt>
                                            <dd id="pdfPreviewEvent">-</dd>
                                        </div>
                                        <div>
                                            <dt>Local</dt>
                                            <dd id="pdfPreviewLocation">-</dd>
                                        </div>
                                        <div>
                                            <dt>Responsavel tecnico</dt>
                                            <dd id="pdfPreviewResponsible">-</dd>
                                        </div>
                                        <div>
                                            <dt>Data</dt>
                                            <dd id="pdfPreviewDate">-</dd>
                                        </div>
                                    </dl>
                                    <div class="export-titleblock__notes">
                                        <strong>Observacoes</strong>
                                        <p id="pdfPreviewNotes">-</p>
                                    </div>
                                    <div class="export-titleblock__footer">
                                        <span id="pdfPreviewCount">0 plantas</span>
                                        <span>Grid Builder</span>
                                    </div>
                                </div>
                            </aside>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    </div>

    <script>
        window.PDF_EXPORT_CONFIG = {
            apiBase: 'api.php'
        };
    </script>
    <script src="assets/nav.js" defer></script>
    <script src="assets/pdf-export.js" defer></script>
</body>
</html>
