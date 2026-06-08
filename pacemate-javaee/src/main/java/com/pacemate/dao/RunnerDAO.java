package com.pacemate.dao;

import com.pacemate.model.Runner;
import jakarta.persistence.EntityManager;
import jakarta.persistence.NoResultException;
import java.util.List;
import java.util.Optional;

public class RunnerDAO {

    public Runner save(Runner runner) {
        EntityManager em = JPAUtil.getEntityManager();
        try {
            em.getTransaction().begin();
            if (runner.getId() == null) {
                em.persist(runner);
            } else {
                runner = em.merge(runner);
            }
            em.getTransaction().commit();
            return runner;
        } catch (Exception e) {
            em.getTransaction().rollback();
            throw e;
        } finally {
            em.close();
        }
    }

    public Optional<Runner> findById(Long id) {
        EntityManager em = JPAUtil.getEntityManager();
        try {
            Runner r = em.find(Runner.class, id);
            return Optional.ofNullable(r);
        } finally {
            em.close();
        }
    }

    public Optional<Runner> findByEmail(String email) {
        EntityManager em = JPAUtil.getEntityManager();
        try {
            Runner r = em.createQuery(
                    "SELECT r FROM Runner r WHERE r.email = :email", Runner.class)
                    .setParameter("email", email)
                    .getSingleResult();
            return Optional.of(r);
        } catch (NoResultException e) {
            return Optional.empty();
        } finally {
            em.close();
        }
    }

    public Optional<Runner> findByUsername(String username) {
        EntityManager em = JPAUtil.getEntityManager();
        try {
            Runner r = em.createQuery(
                    "SELECT r FROM Runner r WHERE r.username = :username", Runner.class)
                    .setParameter("username", username)
                    .getSingleResult();
            return Optional.of(r);
        } catch (NoResultException e) {
            return Optional.empty();
        } finally {
            em.close();
        }
    }

    public List<Runner> findAll() {
        EntityManager em = JPAUtil.getEntityManager();
        try {
            return em.createQuery("SELECT r FROM Runner r ORDER BY r.createdAt DESC", Runner.class)
                    .getResultList();
        } finally {
            em.close();
        }
    }

    /**
     * Trouve des runners compatibles avec le runner donné :
     * même niveau ou niveau adjacent, même ville si renseignée.
     */
    public List<Runner> findMatches(Runner runner, int limit) {
        EntityManager em = JPAUtil.getEntityManager();
        try {
            return em.createQuery(
                    "SELECT r FROM Runner r " +
                    "WHERE r.id <> :id " +
                    "AND r.level = :level " +
                    "ORDER BY FUNCTION('RANDOM')", Runner.class)
                    .setParameter("id", runner.getId())
                    .setParameter("level", runner.getLevel())
                    .setMaxResults(limit)
                    .getResultList();
        } finally {
            em.close();
        }
    }

    public boolean emailExists(String email) {
        EntityManager em = JPAUtil.getEntityManager();
        try {
            Long count = em.createQuery(
                    "SELECT COUNT(r) FROM Runner r WHERE r.email = :email", Long.class)
                    .setParameter("email", email)
                    .getSingleResult();
            return count > 0;
        } finally {
            em.close();
        }
    }

    public boolean usernameExists(String username) {
        EntityManager em = JPAUtil.getEntityManager();
        try {
            Long count = em.createQuery(
                    "SELECT COUNT(r) FROM Runner r WHERE r.username = :username", Long.class)
                    .setParameter("username", username)
                    .getSingleResult();
            return count > 0;
        } finally {
            em.close();
        }
    }

    public void delete(Long id) {
        EntityManager em = JPAUtil.getEntityManager();
        try {
            em.getTransaction().begin();
            Runner r = em.find(Runner.class, id);
            if (r != null) em.remove(r);
            em.getTransaction().commit();
        } catch (Exception e) {
            em.getTransaction().rollback();
            throw e;
        } finally {
            em.close();
        }
    }
}
