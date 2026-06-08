package com.pacemate.servlet;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.pacemate.dao.RunnerDAO;
import com.pacemate.model.Runner;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * API REST JSON — retourne la liste des runners (sans données sensibles).
 */
public class ApiRunnerServlet extends HttpServlet {

    private final RunnerDAO runnerDAO = new RunnerDAO();
    private final ObjectMapper mapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        resp.setContentType("application/json;charset=UTF-8");
        resp.setHeader("Cache-Control", "no-store");

        List<Runner> runners = runnerDAO.findAll();

        // Projection légère — pas de hash de mot de passe exposé
        List<Map<String, Object>> payload = runners.stream()
                .map(r -> Map.of(
                        "id", r.getId(),
                        "username", r.getUsername(),
                        "level", r.getLevel().getLabel(),
                        "city", r.getCity() != null ? r.getCity() : "",
                        "pace", r.getFormattedPace()
                ))
                .toList();

        mapper.writeValue(resp.getWriter(), payload);
    }
}
