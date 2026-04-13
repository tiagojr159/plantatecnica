<?php

declare(strict_types=1);
?><!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gerenciar projetos JSON</title>
    <link rel="stylesheet" href="assets/styles.css">
</head>
<body data-page="projetos-salvos">
    <div class="app-frame">
        <header class="top-nav">
            <div class="top-nav__brand">
                <p class="eyebrow">Grid Builder</p>
                <h1>Manutencao de projetos</h1>
                <span>Apague os JSON salvos com seguranca.</span>
            </div>
            <nav class="top-nav__menu" aria-label="Navegacao principal">
                <a class="nav-link" data-page="tecnica" href="index.php">Planta tecnica</a>
                <a class="nav-link" data-page="terreno" href="terreno.php">Planta terreno</a>
                <a class="nav-link" data-page="armacao" href="armacao.php">Planta de armacao</a>
                <a class="nav-link" data-page="projetos-salvos" href="projetos-salvos.php">Projetos salvos</a>
                <a class="nav-link" data-page="salvar-plantas" href="salvar-plantas.php">Salvar plantas</a>
            </nav>
        </header>

        <div class="page-shell">
            <section class="panel">
                <div class="page-header">
                    <div>
                        <p class="eyebrow">Manutencao</p>
                        <h1>Manutencao de projetos</h1>
                        <p class="panel-help">Aqui voce pode remover os projetos salvos em <code>data/projects</code> sem mexer no restante da aplicacao.</p>
                    </div>
                    <a href="index.php" class="secondary-btn button-link">Voltar ao editor</a>
                </div>
            </section>

            <section class="panel">
                <div class="page-header">
                    <div>
                        <p class="eyebrow">Projetos</p>
                        <h2>Arquivos salvos</h2>
                    </div>
                    <strong id="projectCount" class="page-count">0 projetos</strong>
                </div>
                <div id="managerStatus" class="status-box status-box--info">Carregando projetos salvos...</div>
                <div id="managerProjectList" class="project-list"></div>
            </section>
        </div>
    </div>

    <script>
        window.PROJECT_MANAGER_CONFIG = {
            apiBase: 'api.php'
        };
    </script>
    <script src="assets/nav.js" defer></script>
    <script src="assets/project-manager.js" defer></script>
</body>
</html>



