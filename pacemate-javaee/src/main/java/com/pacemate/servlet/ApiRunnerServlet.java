package com.pacemate.servlet;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pacemate.dao.RunnerDAO;
import com.pacemate.model.Runner;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * API REST JSON — retourne la liste des runners (sans données sensibles).
 */
public class ApiRunnerServlet extends HttpServlet {

    private final RunnerDAO runnerDAO = new RunnerDAO();
    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        resp.setContentType("application/json;charset=UTF-8");
        resp.setHeader("Cache-Control", "no-store");

        List<Runner> runners = runnerDAO.findAll();

        List<Map<String, Object>> payload = runners.stream()
                .map(r -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", r.getId());
                    m.put("username", r.getUsername());
                    m.put("level", r.getLevel().getLabel());
                    m.put("city", r.getCity() != null ? r.getCity() : "");
                    m.put("pace", r.getFormattedPace());
                    return m;
                })
                .toList();

        mapper.writeValue(resp.getWriter(), payload);
    }
}
