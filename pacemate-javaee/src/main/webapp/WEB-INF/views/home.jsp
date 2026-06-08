<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<c:set var="pageTitle" value="Accueil" scope="request"/>
<jsp:include page="fragments/header.jsp"/>

<main>
    <!-- Hero -->
    <section class="hero">
        <div class="container">
            <div class="hero-badge">🏆 La plateforme running des passionnés</div>
            <h1 class="hero-title">
                Trouve ton<br/>
                <mark>binôme running</mark><br/>
                idéal
            </h1>
            <p class="hero-subtitle">
                Que tu sois débutant ou élite, PaceMate te connecte avec des runners
                de ton niveau dans ta ville.
            </p>
            <div class="hero-actions">
                <a href="${pageContext.request.contextPath}/register" class="btn btn-primary btn-lg">
                    Commencer gratuitement
                </a>
                <a href="#features" class="btn btn-secondary btn-lg">
                    Découvrir
                </a>
            </div>
        </div>
    </section>

    <!-- Features -->
    <section class="features" id="features">
        <div class="container">
            <h2 class="section-title">Pourquoi PaceMate ?</h2>
            <p class="section-subtitle">Tout ce dont tu as besoin pour trouver le bon partenaire de course</p>

            <div class="features-grid">
                <div class="card">
                    <div class="feature-icon">🎯</div>
                    <h3 class="feature-title">Matching intelligent</h3>
                    <p class="feature-desc">
                        Notre algorithme analyse ton allure, ton niveau et tes préférences
                        pour te proposer les meilleurs binômes.
                    </p>
                </div>
                <div class="card">
                    <div class="feature-icon">📊</div>
                    <h3 class="feature-title">Suivi de performances</h3>
                    <p class="feature-desc">
                        Enregistre tes sorties, visualise ta progression et partage
                        tes stats avec ta communauté.
                    </p>
                </div>
                <div class="card">
                    <div class="feature-icon">📍</div>
                    <h3 class="feature-title">Par ville</h3>
                    <p class="feature-desc">
                        Trouve des runners près de chez toi grâce à la recherche
                        géolocalisée par ville.
                    </p>
                </div>
                <div class="card">
                    <div class="feature-icon">⚡</div>
                    <h3 class="feature-title">Deux modes</h3>
                    <p class="feature-desc">
                        Interface Discovery pour les débutants, interface Elite
                        pour les experts — bascule en un clic.
                    </p>
                </div>
                <div class="card">
                    <div class="feature-icon">🤝</div>
                    <h3 class="feature-title">Demandes de binôme</h3>
                    <p class="feature-desc">
                        Envoie une demande, attends la confirmation et organisez
                        votre première sortie ensemble.
                    </p>
                </div>
                <div class="card">
                    <div class="feature-icon">🆓</div>
                    <h3 class="feature-title">100% gratuit</h3>
                    <p class="feature-desc">
                        PaceMate est entièrement gratuit. Pas d'abonnement,
                        pas de publicité intrusive.
                    </p>
                </div>
            </div>
        </div>
    </section>

    <!-- CTA -->
    <section style="padding: 4rem 0; text-align: center;">
        <div class="container">
            <div class="card" style="max-width: 600px; margin: 0 auto; padding: 3rem;">
                <h2 style="font-size:1.7rem; font-weight:700; margin-bottom:.75rem;">
                    Prêt à courir ensemble ?
                </h2>
                <p class="text-muted" style="margin-bottom:2rem;">
                    Rejoins des milliers de runners qui ont déjà trouvé leur binôme.
                </p>
                <a href="${pageContext.request.contextPath}/register" class="btn btn-primary btn-lg">
                    Créer mon compte
                </a>
            </div>
        </div>
    </section>
</main>

<jsp:include page="fragments/footer.jsp"/>
