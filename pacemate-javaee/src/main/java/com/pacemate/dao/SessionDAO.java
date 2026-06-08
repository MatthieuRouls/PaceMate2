package com.pacemate.dao;

import com.pacemate.model.RunningSession;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Optional;

public class SessionDAO {

    public RunningSession save(RunningSession session) {
        EntityManager em = JPAUtil.getEntityManager();
        try {
            em.getTransaction().begin();
            if (session.getId() == null) {
                em.persist(session);
            } else {
                session = em.merge(session);
            }
            em.getTransaction().commit();
            return session;
        } catch (Exception e) {
            em.getTransaction().rollback();
            throw e;
        } finally {
            em.close();
        }
    }

    public Optional<RunningSession> findById(Long id) {
        EntityManager em = JPAUtil.getEntityManager();
        try {
            return Optional.ofNullable(em.find(RunningSession.class, id));
        } finally {
            em.close();
        }
    }

    public List<RunningSession> findByRunner(Long runnerId) {
        EntityManager em = JPAUtil.getEntityManager();
        try {
            return em.createQuery(
                    "SELECT s FROM RunningSession s WHERE s.runner.id = :rid " +
                    "ORDER BY s.sessionDate DESC", RunningSession.class)
                    .setParameter("rid", runnerId)
                    .getResultList();
        } finally {
            em.close();
        }
    }

    public List<RunningSession> findRecentByRunner(Long runnerId, int limit) {
        EntityManager em = JPAUtil.getEntityManager();
        try {
            return em.createQuery(
                    "SELECT s FROM RunningSession s WHERE s.runner.id = :rid " +
                    "ORDER BY s.sessionDate DESC", RunningSession.class)
                    .setParameter("rid", runnerId)
                    .setMaxResults(limit)
                    .getResultList();
        } finally {
            em.close();
        }
    }

    public void delete(Long id) {
        EntityManager em = JPAUtil.getEntityManager();
        try {
            em.getTransaction().begin();
            RunningSession s = em.find(RunningSession.class, id);
            if (s != null) em.remove(s);
            em.getTransaction().commit();
        } catch (Exception e) {
            em.getTransaction().rollback();
            throw e;
        } finally {
            em.close();
        }
    }
}
