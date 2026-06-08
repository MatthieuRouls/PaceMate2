package com.pacemate.dao;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.Persistence;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class JPAUtil {

    private static final Logger log = LoggerFactory.getLogger(JPAUtil.class);
    private static volatile EntityManagerFactory emf;

    private JPAUtil() {}

    public static EntityManagerFactory getEntityManagerFactory() {
        if (emf == null) {
            synchronized (JPAUtil.class) {
                if (emf == null) {
                    String unit = System.getProperty("pacemate.pu", "pacemate-pu");
                    log.info("Initialisation JPA avec l'unité de persistance '{}'", unit);
                    emf = Persistence.createEntityManagerFactory(unit);
                }
            }
        }
        return emf;
    }

    public static EntityManager getEntityManager() {
        return getEntityManagerFactory().createEntityManager();
    }

    public static void close() {
        if (emf != null && emf.isOpen()) {
            emf.close();
            log.info("EntityManagerFactory fermé.");
        }
    }
}
