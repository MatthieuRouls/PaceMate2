package com.pacemate.servlet;

import com.pacemate.dao.RunnerDAO;
import com.pacemate.dao.SessionDAO;
import com.pacemate.model.Runner;
import com.pacemate.model.RunningSession;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.util.List;

public class DashboardServlet extends HttpServlet {

    private final RunnerDAO runnerDAO = new RunnerDAO();
    private final SessionDAO sessionDAO = new SessionDAO();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        HttpSession httpSession = req.getSession(false);

        if (httpSession == null || httpSession.getAttribute("runnerId") == null) {
            resp.sendRedirect(req.getContextPath() + "/login");
            return;
        }

        Long runnerId = (Long) httpSession.getAttribute("runnerId");
        Runner runner = runnerDAO.findById(runnerId).orElse(null);

        if (runner == null) {
            httpSession.invalidate();
            resp.sendRedirect(req.getContextPath() + "/login");
            return;
        }

        List<RunningSession> recentSessions = sessionDAO.findRecentByRunner(runnerId, 5);
        List<Runner> suggestedMatches = runnerDAO.findMatches(runner, 3);

        req.setAttribute("runner", runner);
        req.setAttribute("recentSessions", recentSessions);
        req.setAttribute("suggestedMatches", suggestedMatches);

        req.getRequestDispatcher("/WEB-INF/views/dashboard.jsp").forward(req, resp);
    }
}
