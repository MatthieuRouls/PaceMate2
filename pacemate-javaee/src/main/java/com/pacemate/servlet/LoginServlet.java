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
import java.util.Optional;

public class LoginServlet extends HttpServlet {

    private final RunnerDAO runnerDAO = new RunnerDAO();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        // Si déjà connecté, rediriger vers le dashboard
        HttpSession existing = req.getSession(false);
        if (existing != null && existing.getAttribute("runnerId") != null) {
            resp.sendRedirect(req.getContextPath() + "/dashboard");
            return;
        }
        req.getRequestDispatcher("/WEB-INF/views/login.jsp").forward(req, resp);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        String email = req.getParameter("email");
        String password = req.getParameter("password");

        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            req.setAttribute("error", "Email et mot de passe requis.");
            req.getRequestDispatcher("/WEB-INF/views/login.jsp").forward(req, resp);
            return;
        }

        Optional<Runner> opt = runnerDAO.findByEmail(email.trim().toLowerCase());

        if (opt.isEmpty() || !BCrypt.checkpw(password, opt.get().getPasswordHash())) {
            req.setAttribute("error", "Email ou mot de passe incorrect.");
            req.getRequestDispatcher("/WEB-INF/views/login.jsp").forward(req, resp);
            return;
        }

        Runner runner = opt.get();
        HttpSession session = req.getSession(true);
        session.setAttribute("runnerId", runner.getId());
        session.setAttribute("runnerUsername", runner.getUsername());

        resp.sendRedirect(req.getContextPath() + "/dashboard");
    }
}
