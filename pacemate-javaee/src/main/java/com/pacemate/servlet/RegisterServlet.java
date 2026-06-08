package com.pacemate.servlet;

import com.pacemate.dao.RunnerDAO;
import com.pacemate.model.Runner;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.mindrot.jbcrypt.BCrypt;
import java.io.IOException;

public class RegisterServlet extends HttpServlet {

    private final RunnerDAO runnerDAO = new RunnerDAO();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        req.getRequestDispatcher("/WEB-INF/views/register.jsp").forward(req, resp);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        String username = req.getParameter("username");
        String email = req.getParameter("email");
        String password = req.getParameter("password");
        String levelStr = req.getParameter("level");
        String city = req.getParameter("city");

        // Validation basique
        if (isEmpty(username) || isEmpty(email) || isEmpty(password)) {
            req.setAttribute("error", "Tous les champs obligatoires doivent être remplis.");
            req.getRequestDispatcher("/WEB-INF/views/register.jsp").forward(req, resp);
            return;
        }

        if (password.length() < 8) {
            req.setAttribute("error", "Le mot de passe doit contenir au moins 8 caractères.");
            req.getRequestDispatcher("/WEB-INF/views/register.jsp").forward(req, resp);
            return;
        }

        if (runnerDAO.emailExists(email)) {
            req.setAttribute("error", "Cet email est déjà utilisé.");
            req.getRequestDispatcher("/WEB-INF/views/register.jsp").forward(req, resp);
            return;
        }

        if (runnerDAO.usernameExists(username)) {
            req.setAttribute("error", "Ce pseudo est déjà pris.");
            req.getRequestDispatcher("/WEB-INF/views/register.jsp").forward(req, resp);
            return;
        }

        Runner runner = new Runner();
        runner.setUsername(username.trim());
        runner.setEmail(email.trim().toLowerCase());
        runner.setPasswordHash(BCrypt.hashpw(password, BCrypt.gensalt(12)));
        runner.setCity(city != null ? city.trim() : null);

        if (levelStr != null) {
            try {
                runner.setLevel(Runner.Level.valueOf(levelStr));
            } catch (IllegalArgumentException ignored) {
                runner.setLevel(Runner.Level.DEBUTANT);
            }
        }

        runnerDAO.save(runner);

        // Connexion automatique après inscription
        HttpSession session = req.getSession(true);
        session.setAttribute("runnerId", runner.getId());
        session.setAttribute("runnerUsername", runner.getUsername());

        resp.sendRedirect(req.getContextPath() + "/dashboard");
    }

    private boolean isEmpty(String s) {
        return s == null || s.isBlank();
    }
}
