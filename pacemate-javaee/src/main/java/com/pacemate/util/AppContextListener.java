package com.pacemate.util;

import com.pacemate.dao.JPAUtil;
import jakarta.servlet.ServletContextEvent;
import jakarta.servlet.ServletContextListener;
import jakarta.servlet.annotation.WebListener;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@WebListener
public class AppContextListener implements ServletContextListener {

    private static final Logger log = LoggerFactory.getLogger(AppContextListener.class);

    @Override
    public void contextInitialized(ServletContextEvent sce) {
        log.info("=== PaceMate démarrage ===");
        // Force l'initialisation de JPA au démarrage
        JPAUtil.getEntityManagerFactory();
        log.info("JPA initialisé avec succès.");
    }

    @Override
    public void contextDestroyed(ServletContextEvent sce) {
        JPAUtil.close();
        log.info("=== PaceMate arrêt ===");
    }
}
