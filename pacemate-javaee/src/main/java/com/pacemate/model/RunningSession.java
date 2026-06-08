package com.pacemate.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "running_sessions")
public class RunningSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "runner_id", nullable = false)
    private Runner runner;

    @Column(nullable = false, length = 100)
    private String title;

    /** Distance en kilomètres */
    @Column(nullable = false)
    private Double distance;

    /** Durée en secondes */
    @Column(nullable = false)
    private Integer duration;

    @Column(name = "session_date", nullable = false)
    private LocalDateTime sessionDate;

    @Column(name = "avg_heart_rate")
    private Integer avgHeartRate;

    @Column(name = "elevation_gain")
    private Integer elevationGain;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // ─── Getters / Setters ───────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Runner getRunner() { return runner; }
    public void setRunner(Runner runner) { this.runner = runner; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public Double getDistance() { return distance; }
    public void setDistance(Double distance) { this.distance = distance; }

    public Integer getDuration() { return duration; }
    public void setDuration(Integer duration) { this.duration = duration; }

    public LocalDateTime getSessionDate() { return sessionDate; }
    public void setSessionDate(LocalDateTime sessionDate) { this.sessionDate = sessionDate; }

    public Integer getAvgHeartRate() { return avgHeartRate; }
    public void setAvgHeartRate(Integer avgHeartRate) { this.avgHeartRate = avgHeartRate; }

    public Integer getElevationGain() { return elevationGain; }
    public void setElevationGain(Integer elevationGain) { this.elevationGain = elevationGain; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public LocalDateTime getCreatedAt() { return createdAt; }

    /** Retourne la durée formatée "1h 23min" */
    public String getFormattedDuration() {
        if (duration == null) return "—";
        int h = duration / 3600;
        int m = (duration % 3600) / 60;
        int s = duration % 60;
        if (h > 0) return String.format("%dh %02dmin", h, m);
        return String.format("%dmin %02ds", m, s);
    }

    /** Calcule l'allure en min/km */
    public String getFormattedPace() {
        if (distance == null || distance == 0 || duration == null) return "—";
        double paceSeconds = duration / distance;
        int minutes = (int) (paceSeconds / 60);
        int seconds = (int) (paceSeconds % 60);
        return String.format("%d:%02d /km", minutes, seconds);
    }
}
