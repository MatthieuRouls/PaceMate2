package com.pacemate;

import com.pacemate.dao.JPAUtil;
import com.pacemate.dao.RunnerDAO;
import com.pacemate.model.Runner;
import org.junit.jupiter.api.*;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class RunnerDAOTest {

    private static RunnerDAO dao;

    @BeforeAll
    static void setup() {
        System.setProperty("pacemate.pu", "pacemate-test-pu");
        dao = new RunnerDAO();
    }

    @AfterAll
    static void teardown() {
        JPAUtil.close();
    }

    @Test
    @Order(1)
    void testSaveAndFindByEmail() {
        Runner r = new Runner();
        r.setUsername("testrunner");
        r.setEmail("test@pacemate.fr");
        r.setPasswordHash("$2a$12$hashedpassword");
        r.setLevel(Runner.Level.INTERMEDIAIRE);
        r.setCity("Paris");

        Runner saved = dao.save(r);
        assertNotNull(saved.getId());

        Optional<Runner> found = dao.findByEmail("test@pacemate.fr");
        assertTrue(found.isPresent());
        assertEquals("testrunner", found.get().getUsername());
        assertEquals(Runner.Level.INTERMEDIAIRE, found.get().getLevel());
    }

    @Test
    @Order(2)
    void testFindByUsername() {
        Optional<Runner> found = dao.findByUsername("testrunner");
        assertTrue(found.isPresent());
        assertEquals("Paris", found.get().getCity());
    }

    @Test
    @Order(3)
    void testEmailExists() {
        assertTrue(dao.emailExists("test@pacemate.fr"));
        assertFalse(dao.emailExists("nonexistent@pacemate.fr"));
    }

    @Test
    @Order(4)
    void testUsernameExists() {
        assertTrue(dao.usernameExists("testrunner"));
        assertFalse(dao.usernameExists("ghostrunner"));
    }

    @Test
    @Order(5)
    void testFormattedPace() {
        Runner r = new Runner();
        r.setAvgPace(5.5);
        assertEquals("5:30 /km", r.getFormattedPace());

        r.setAvgPace(4.0);
        assertEquals("4:00 /km", r.getFormattedPace());
    }

    @Test
    @Order(6)
    void testFindAll() {
        assertFalse(dao.findAll().isEmpty());
    }

    @Test
    @Order(7)
    void testUpdateRunner() {
        Optional<Runner> opt = dao.findByEmail("test@pacemate.fr");
        assertTrue(opt.isPresent());
        Runner r = opt.get();
        r.setCity("Lyon");
        dao.save(r);

        Optional<Runner> updated = dao.findByEmail("test@pacemate.fr");
        assertEquals("Lyon", updated.get().getCity());
    }
}
