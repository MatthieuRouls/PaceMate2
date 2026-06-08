<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<!DOCTYPE html>
<html lang="fr" data-theme="${theme}">
<head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>${pageTitle != null ? pageTitle : 'PaceMate'} — Trouve ton binôme running</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/styles.css"/>
</head>
<body>

<nav class="nav">
    <div class="nav-inner">
        <a class="nav-logo" href="${pageContext.request.contextPath}/">
            🏃 Pace<span>Mate</span>
        </a>

        <ul class="nav-links">
            <li><a href="${pageContext.request.contextPath}/">Accueil</a></li>
            <c:if test="${not empty sessionScope.runnerId}">
                <li><a href="${pageContext.request.contextPath}/dashboard">Dashboard</a></li>
                <li><a href="${pageContext.request.contextPath}/match">Trouver un binôme</a></li>
                <li><a href="${pageContext.request.contextPath}/profile">Mon profil</a></li>
            </c:if>
        </ul>

        <div class="nav-actions">
            <!-- Bascule de thème -->
            <form method="post" action="${pageContext.request.contextPath}/theme" style="display:inline">
                <button type="submit" class="theme-toggle" title="Changer de thème">
                    <c:choose>
                        <c:when test="${isElite}">☀️ Discovery</c:when>
                        <c:otherwise>⚡ Elite</c:otherwise>
                    </c:choose>
                </button>
            </form>

            <c:choose>
                <c:when test="${not empty sessionScope.runnerId}">
                    <form method="post" action="${pageContext.request.contextPath}/logout" style="display:inline">
                        <button type="submit" class="btn btn-ghost btn-sm">Déconnexion</button>
                    </form>
                </c:when>
                <c:otherwise>
                    <a class="btn btn-ghost btn-sm" href="${pageContext.request.contextPath}/login">Connexion</a>
                    <a class="btn btn-primary btn-sm" href="${pageContext.request.contextPath}/register">S'inscrire</a>
                </c:otherwise>
            </c:choose>
        </div>
    </div>
</nav>
