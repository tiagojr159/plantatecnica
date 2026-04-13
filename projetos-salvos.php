<?php

declare(strict_types=1);
?><!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Projetos salvos</title>
    <link rel="stylesheet" href="assets/styles.css">
</head>
<body data-page="projetos-salvos">
    <div class="app-frame">
        <header class="top-nav">
            <div class="top-nav__brand">
                <p class="eyebrow">Grid Builder</p>
                <h1>Projetos salvos</h1>
                <span>Veja e reabra qualquer montagem salva.</span>
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

        <main class="page-shell">
            <section class="panel">
                <div class="page-header">
                    <div>
                        <p class="eyebrow">Projetos</p>
                        <h2>Lista completa</h2>
                        <p class="panel-help">Abra qualquer projeto salvo para continuar montando sem perder as dimens�es.</p>
                    </div>
                    <strong id="listCount" class="page-count">0 projetos</strong>
                </div>
                <div id="projectStatus" class="status-box status-box--info">Carregando projetos...</div>
                <div id="projectOverview" class="project-list"></div>
            </section>
        </main>
    </div>

    <script>
        window.PROJECT_OVERVIEW_CONFIG = {
            apiBase: 'api.php'
        };
    </script>
    <script src="assets/nav.js" defer></script>
    <script src="assets/project-list.js" defer></script>
</body>
</html>



