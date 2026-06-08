<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ taglib prefix="fmt" uri="jakarta.tags.fmt" %>
<c:set var="pageTitle" value="Dashboard" scope="request"/>
<jsp:include page="fragments/header.jsp"/>

<main class="page">
    <div class="container">
        <div class="flex items-center justify-between mb-2" style="margin-bottom:2rem;">
            <div>
                <h1 style="font-size:1.8rem; font-weight:700;">
                    Bonjour, ${runner.displayName} 👋
                </h1>
                <p class="text-muted">
                    <span class="badge badge-${runner.level}">${runner.level.label}</span>
                    <c:if test="${not empty runner.city}"> · ${runner.city}</c:if>
                </p>
            </div>
            <a href="${pageContext.request.contextPath}/match" class="btn btn-primary">
                🔍 Trouver un binôme
            </a>
        </div>

        <div class="dashboard-grid">
            <!-- Colonne gauche : profil rapide -->
            <aside>
                <div class="card" style="margin-bottom:1.5rem;">
                    <div class="card-title">Mon profil</div>
                    <div style="text-align:center; margin-bottom:1rem;">
                        <div class="runner-avatar" style="width:72px;height:72px;font-size:1.8rem;margin:0 auto 1rem;">
                            ${runner.displayName.substring(0,1).toUpperCase()}
                        </div>
                        <strong>${runner.username}</strong><br/>
                        <span class="text-muted" style="font-size:.9rem;">${runner.email}</span>
                    </div>
                    <div style="font-size:.9rem;">
                        <div class="flex justify-between" style="padding:.5rem 0;border-bottom:1px solid var(--color-border);">
                            <span class="text-muted">Allure moy.</span>
                            <strong>${runner.formattedPace}</strong>
                        </div>
                        <div class="flex justify-between" style="padding:.5rem 0;border-bottom:1px solid var(--color-border);">
                            <span class="text-muted">Km / semaine</span>
                            <strong>
                                <c:choose>
                                    <c:when test="${runner.weeklyDistance != null}">${runner.weeklyDistance} km</c:when>
                                    <c:otherwise>—</c:otherwise>
                                </c:choose>
                            </strong>
                        </div>
                        <div class="flex justify-between" style="padding:.5rem 0;">
                            <span class="text-muted">Niveau</span>
                            <span class="badge badge-${runner.level}">${runner.level.label}</span>
                        </div>
                    </div>
                    <a href="${pageContext.request.contextPath}/profile" class="btn btn-secondary btn-full btn-sm mt-2">
                        Modifier le profil
                    </a>
                </div>

                <!-- Suggestions de binômes -->
                <c:if test="${not empty suggestedMatches}">
                    <div class="card">
                        <div class="card-title">💡 Binômes suggérés</div>
                        <div style="display:flex;flex-direction:column;gap:.75rem;">
                            <c:forEach var="s" items="${suggestedMatches}">
                                <div class="runner-card">
                                    <div class="runner-avatar">
                                        ${s.displayName.substring(0,1).toUpperCase()}
                                    </div>
                                    <div class="runner-info">
                                        <div class="runner-name">${s.username}</div>
                                        <div class="runner-meta">
                                            ${s.formattedPace}
                                            <c:if test="${not empty s.city}"> · ${s.city}</c:if>
                                        </div>
                                    </div>
                                </div>
                            </c:forEach>
                        </div>
                        <a href="${pageContext.request.contextPath}/match" class="btn btn-ghost btn-full btn-sm mt-2">
                            Voir tous les runners →
                        </a>
                    </div>
                </c:if>
            </aside>

            <!-- Colonne droite : sessions récentes -->
            <section>
                <div class="card">
                    <div class="card-title">📋 Mes dernières sorties</div>

                    <c:choose>
                        <c:when test="${empty recentSessions}">
                            <div style="text-align:center;padding:3rem 0;">
                                <div style="font-size:3rem;margin-bottom:1rem;">🏃</div>
                                <p class="text-muted">Aucune sortie enregistrée pour l'instant.</p>
                                <p class="text-muted" style="font-size:.9rem;margin-top:.5rem;">
                                    Commence par enregistrer ta première sortie !
                                </p>
                            </div>
                        </c:when>
                        <c:otherwise>
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Sortie</th>
                                        <th>Distance</th>
                                        <th>Durée</th>
                                        <th>Allure</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <c:forEach var="s" items="${recentSessions}">
                                        <tr>
                                            <td><strong>${s.title}</strong></td>
                                            <td>${s.distance} km</td>
                                            <td>${s.formattedDuration}</td>
                                            <td>${s.formattedPace}</td>
                                            <td>
                                                <fmt:formatDate value="${s.sessionDate}" pattern="dd/MM/yyyy"
                                                    type="date"/>
                                            </td>
                                        </tr>
                                    </c:forEach>
                                </tbody>
                            </table>
                        </c:otherwise>
                    </c:choose>
                </div>
            </section>
        </div>
    </div>
</main>

<jsp:include page="fragments/footer.jsp"/>
