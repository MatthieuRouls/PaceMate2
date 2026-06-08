package com.pacemate.servlet;

import com.pacemate.dao.RunnerDAO;
import com.pacemate.model.Runner;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.util.List;

public class MatchServlet extends HttpServlet {

    private final RunnerDAO runnerDAO = new RunnerDAO();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        HttpSession session = req.getSession(false);
        if (session == null || session.getAttribute("runnerId") == null) {
            resp.sendRedirect(req.getContextPath() + "/login");
            return;
        }

        Long runnerId = (Long) session.getAttribute("runnerId");
        Runner current = runnerDAO.findById(runnerId).orElse(null);
        if (current == null) {
            resp.sendRedirect(req.getContextPath() + "/login");
            return;
        }

        List<Runner> suggestions = runnerDAO.findMatches(current, 10);
        req.setAttribute("runner", current);
        req.setAttribute("suggestions", suggestions);
        req.getRequestDispatcher("/WEB-INF/views/match.jsp").forward(req, resp);
    }
}
