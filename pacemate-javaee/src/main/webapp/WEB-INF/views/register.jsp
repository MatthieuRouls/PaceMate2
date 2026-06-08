<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<c:set var="pageTitle" value="Inscription" scope="request"/>
<jsp:include page="fragments/header.jsp"/>

<main class="auth-wrapper">
    <div class="auth-card card">
        <h1 style="font-size:1.6rem; font-weight:700; margin-bottom:.5rem;">Rejoins PaceMate 🏃</h1>
        <p class="text-muted" style="margin-bottom:1.75rem;">Crée ton compte et trouve ton binôme running.</p>

        <c:if test="${not empty error}">
            <div class="alert alert-error">${error}</div>
        </c:if>

        <form method="post" action="${pageContext.request.contextPath}/register">
            <div class="grid-2">
                <div class="form-group">
                    <label class="form-label" for="username">Pseudo *</label>
                    <input class="form-control" type="text" id="username" name="username"
                           placeholder="runner42" required autofocus minlength="3" maxlength="50"/>
                </div>
                <div class="form-group">
                    <label class="form-label" for="city">Ville</label>
                    <input class="form-control" type="text" id="city" name="city"
                           placeholder="Paris" maxlength="100"/>
                </div>
            </div>

            <div class="form-group">
                <label class="form-label" for="email">Email *</label>
                <input class="form-control" type="email" id="email" name="email"
                       placeholder="ton@email.com" required/>
            </div>

            <div class="form-group">
                <label class="form-label" for="password">Mot de passe * (8 caractères min.)</label>
                <input class="form-control" type="password" id="password" name="password"
                       placeholder="••••••••" required minlength="8"/>
            </div>

            <div class="form-group">
                <label class="form-label" for="level">Niveau</label>
                <select class="form-control" id="level" name="level">
                    <option value="DEBUTANT">🟢 Débutant — Je débute la course à pied</option>
                    <option value="INTERMEDIAIRE">🟡 Intermédiaire — Quelques courses derrière moi</option>
                    <option value="AVANCE">🔵 Avancé — Semi-marathon et plus</option>
                    <option value="ELITE">🟣 Élite — Compétitions régulières</option>
                </select>
            </div>

            <button type="submit" class="btn btn-primary btn-full btn-lg">Créer mon compte</button>
        </form>

        <p class="text-center mt-3 text-muted">
            Déjà un compte ?
            <a href="${pageContext.request.contextPath}/login">Se connecter</a>
        </p>
    </div>
</main>

<jsp:include page="fragments/footer.jsp"/>
