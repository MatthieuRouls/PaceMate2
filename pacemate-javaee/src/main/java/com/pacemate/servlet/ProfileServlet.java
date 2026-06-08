package com.pacemate.servlet;

import com.pacemate.dao.RunnerDAO;
import com.pacemate.model.Runner;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;

public class ProfileServlet extends HttpServlet {

    private final RunnerDAO runnerDAO = new RunnerDAO();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        Runner runner = getAuthenticatedRunner(req, resp);
        if (runner == null) return;

        req.setAttribute("runner", runner);
        req.getRequestDispatcher("/WEB-INF/views/profile.jsp").forward(req, resp);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        Runner runner = getAuthenticatedRunner(req, resp);
        if (runner == null) return;

        runner.setFirstName(req.getParameter("firstName"));
        runner.setLastName(req.getParameter("lastName"));
        runner.setCity(req.getParameter("city"));
        runner.setBio(req.getParameter("bio"));

        String levelStr = req.getParameter("level");
        if (levelStr != null) {
            try { runner.setLevel(Runner.Level.valueOf(levelStr)); }
            catch (IllegalArgumentException ignored) {}
        }

        String paceStr = req.getParameter("avgPace");
        if (paceStr != null && !paceStr.isBlank()) {
            try { runner.setAvgPace(Double.parseDouble(paceStr)); }
            catch (NumberFormatException ignored) {}
        }

        String distStr = req.getParameter("weeklyDistance");
        if (distStr != null && !distStr.isBlank()) {
            try { runner.setWeeklyDistance(Integer.parseInt(distStr)); }
            catch (NumberFormatException ignored) {}
        }

        runnerDAO.save(runner);
        req.setAttribute("success", "Profil mis à jour avec succès !");
        req.setAttribute("runner", runner);
        req.getRequestDispatcher("/WEB-INF/views/profile.jsp").forward(req, resp);
    }

    private Runner getAuthenticatedRunner(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {
        HttpSession session = req.getSession(false);
        if (session == null || session.getAttribute("runnerId") == null) {
            resp.sendRedirect(req.getContextPath() + "/login");
            return null;
        }
        Long runnerId = (Long) session.getAttribute("runnerId");
        return runnerDAO.findById(runnerId).orElse(null);
    }
}
