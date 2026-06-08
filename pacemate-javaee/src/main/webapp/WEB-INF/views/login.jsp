<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<c:set var="pageTitle" value="Connexion" scope="request"/>
<jsp:include page="fragments/header.jsp"/>

<main class="auth-wrapper">
    <div class="auth-card card">
        <h1 style="font-size:1.6rem; font-weight:700; margin-bottom:.5rem;">Bon retour ! 👋</h1>
        <p class="text-muted" style="margin-bottom:1.75rem;">Connecte-toi pour accéder à ton espace runner.</p>

        <c:if test="${not empty error}">
            <div class="alert alert-error">${error}</div>
        </c:if>

        <form method="post" action="${pageContext.request.contextPath}/login">
            <div class="form-group">
                <label class="form-label" for="email">Email</label>
                <input class="form-control" type="email" id="email" name="email"
                       placeholder="ton@email.com" required autofocus/>
            </div>
            <div class="form-group">
                <label class="form-label" for="password">Mot de passe</label>
                <input class="form-control" type="password" id="password" name="password"
                       placeholder="••••••••" required/>
            </div>
            <button type="submit" class="btn btn-primary btn-full btn-lg">Se connecter</button>
        </form>

        <p class="text-center mt-3 text-muted">
            Pas encore de compte ?
            <a href="${pageContext.request.contextPath}/register">S'inscrire</a>
        </p>
    </div>
</main>

<jsp:include page="fragments/footer.jsp"/>
