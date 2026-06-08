<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<c:set var="pageTitle" value="Trouver un binôme" scope="request"/>
<jsp:include page="fragments/header.jsp"/>

<main class="page">
    <div class="container">
        <h1 style="font-size:1.8rem;font-weight:700;margin-bottom:.5rem;">Trouver un binôme 🔍</h1>
        <p class="text-muted" style="margin-bottom:2rem;">
            Runners compatibles avec ton niveau
            <span class="badge badge-${runner.level}">${runner.level.label}</span>
        </p>

        <c:choose>
            <c:when test="${empty suggestions}">
                <div class="card" style="text-align:center;padding:4rem;">
                    <div style="font-size:3rem;margin-bottom:1rem;">🏃</div>
                    <h2 style="font-size:1.3rem;font-weight:700;margin-bottom:.5rem;">Aucun runner trouvé</h2>
                    <p class="text-muted">
                        Il n'y a pas encore d'autres runners de ton niveau.
                        Reviens bientôt !
                    </p>
                </div>
            </c:when>
            <c:otherwise>
                <div class="features-grid">
                    <c:forEach var="r" items="${suggestions}">
                        <div class="card runner-card" style="flex-direction:column;align-items:flex-start;gap:1rem;">
                            <div class="flex items-center" style="gap:1rem;width:100%;">
                                <div class="runner-avatar">
                                    ${r.displayName.substring(0,1).toUpperCase()}
                                </div>
                                <div class="runner-info">
                                    <div class="runner-name">${r.username}</div>
                                    <div class="runner-meta">
                                        <span class="badge badge-${r.level}">${r.level.label}</span>
                                        <c:if test="${not empty r.city}"> · ${r.city}</c:if>
                                    </div>
                                </div>
                            </div>

                            <div style="display:flex;gap:1rem;font-size:.85rem;width:100%;">
                                <div>
                                    <div class="text-muted">Allure</div>
                                    <strong>${r.formattedPace}</strong>
                                </div>
                                <c:if test="${r.weeklyDistance != null}">
                                    <div>
                                        <div class="text-muted">Hebdo</div>
                                        <strong>${r.weeklyDistance} km</strong>
                                    </div>
                                </c:if>
                            </div>

                            <c:if test="${not empty r.bio}">
                                <p style="font-size:.88rem;color:var(--color-text-muted);
                                          overflow:hidden;display:-webkit-box;
                                          -webkit-line-clamp:2;-webkit-box-orient:vertical;">
                                    ${r.bio}
                                </p>
                            </c:if>

                            <button class="btn btn-primary btn-sm btn-full">
                                Envoyer une demande
                            </button>
                        </div>
                    </c:forEach>
                </div>
            </c:otherwise>
        </c:choose>
    </div>
</main>

<jsp:include page="fragments/footer.jsp"/>
