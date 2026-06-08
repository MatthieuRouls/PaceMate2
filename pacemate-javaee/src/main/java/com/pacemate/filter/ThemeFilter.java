package com.pacemate.filter;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;

/**
 * Injecte le thème courant dans chaque requête pour que les JSP y aient accès.
 * Thèmes disponibles : "discovery" (clair, débutants) et "elite" (sombre, experts).
 */
public class ThemeFilter implements Filter {

    public static final String THEME_SESSION_KEY = "pacemate_theme";
    public static final String DEFAULT_THEME = "discovery";

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        HttpSession session = req.getSession(false);

        String theme = DEFAULT_THEME;
        if (session != null) {
            String stored = (String) session.getAttribute(THEME_SESSION_KEY);
            if ("elite".equals(stored) || "discovery".equals(stored)) {
                theme = stored;
            }
        }

        req.setAttribute("theme", theme);
        req.setAttribute("isElite", "elite".equals(theme));
        chain.doFilter(request, response);
    }
}
