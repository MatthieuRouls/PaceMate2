package com.pacemate.servlet;

import com.pacemate.filter.ThemeFilter;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;

public class ThemeServlet extends HttpServlet {

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        HttpSession session = req.getSession(true);
        String current = (String) session.getAttribute(ThemeFilter.THEME_SESSION_KEY);

        // Bascule entre les deux thèmes
        String next = "elite".equals(current) ? "discovery" : "elite";
        session.setAttribute(ThemeFilter.THEME_SESSION_KEY, next);

        // Retour vers la page d'origine
        String referer = req.getHeader("Referer");
        resp.sendRedirect(referer != null ? referer : req.getContextPath() + "/");
    }
}
