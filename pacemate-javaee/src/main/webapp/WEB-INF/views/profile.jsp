<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<c:set var="pageTitle" value="Mon profil" scope="request"/>
<jsp:include page="fragments/header.jsp"/>

<main class="page">
    <div class="container" style="max-width:640px;">
        <h1 style="font-size:1.8rem;font-weight:700;margin-bottom:2rem;">Mon profil ✏️</h1>

        <c:if test="${not empty error}">
            <div class="alert alert-error">${error}</div>
        </c:if>
        <c:if test="${not empty success}">
            <div class="alert alert-success">${success}</div>
        </c:if>

        <div class="card">
            <form method="post" action="${pageContext.request.contextPath}/profile">
                <div class="grid-2">
                    <div class="form-group">
                        <label class="form-label" for="firstName">Prénom</label>
                        <input class="form-control" type="text" id="firstName" name="firstName"
                               value="${runner.firstName}" maxlength="50"/>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="lastName">Nom</label>
                        <input class="form-control" type="text" id="lastName" name="lastName"
                               value="${runner.lastName}" maxlength="50"/>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="city">Ville</label>
                    <input class="form-control" type="text" id="city" name="city"
                           value="${runner.city}" maxlength="100" placeholder="Paris"/>
                </div>

                <div class="form-group">
                    <label class="form-label" for="level">Niveau</label>
                    <select class="form-control" id="level" name="level">
                        <c:forEach var="lvl" items="${['DEBUTANT','INTERMEDIAIRE','AVANCE','ELITE']}">
                            <option value="${lvl}" ${runner.level.name() == lvl ? 'selected' : ''}>
                                ${lvl == 'DEBUTANT' ? '🟢 Débutant' :
                                  lvl == 'INTERMEDIAIRE' ? '🟡 Intermédiaire' :
                                  lvl == 'AVANCE' ? '🔵 Avancé' : '🟣 Élite'}
                            </option>
                        </c:forEach>
                    </select>
                </div>

                <div class="grid-2">
                    <div class="form-group">
                        <label class="form-label" for="avgPace">Allure moyenne (min/km)</label>
                        <input class="form-control" type="number" id="avgPace" name="avgPace"
                               value="${runner.avgPace}" step="0.1" min="2" max="15"
                               placeholder="5.5"/>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="weeklyDistance">Distance hebdo (km)</label>
                        <input class="form-control" type="number" id="weeklyDistance" name="weeklyDistance"
                               value="${runner.weeklyDistance}" min="0" max="999"
                               placeholder="40"/>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="bio">Bio</label>
                    <textarea class="form-control" id="bio" name="bio" rows="4"
                              placeholder="Présente-toi en quelques mots...">${runner.bio}</textarea>
                </div>

                <button type="submit" class="btn btn-primary btn-full">Enregistrer</button>
            </form>
        </div>
    </div>
</main>

<jsp:include page="fragments/footer.jsp"/>
