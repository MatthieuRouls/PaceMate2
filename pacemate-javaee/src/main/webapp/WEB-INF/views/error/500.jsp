<%@ page contentType="text/html;charset=UTF-8" isErrorPage="true" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<c:set var="pageTitle" value="Erreur serveur" scope="request"/>
<jsp:include page="../fragments/header.jsp"/>
<main style="display:flex;align-items:center;justify-content:center;min-height:60vh;text-align:center;">
    <div>
        <div style="font-size:5rem;">⚠️</div>
        <h1 style="font-size:4rem;font-weight:700;color:var(--color-error);">500</h1>
        <p style="font-size:1.2rem;color:var(--color-text-muted);margin-bottom:2rem;">
            Une erreur serveur s'est produite.
        </p>
        <a href="${pageContext.request.contextPath}/" class="btn btn-primary">Retour à l'accueil</a>
    </div>
</main>
<jsp:include page="../fragments/footer.jsp"/>
