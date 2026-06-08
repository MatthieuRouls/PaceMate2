package com.pacemate.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "runners")
public class Runner {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "first_name", length = 50)
    private String firstName;

    @Column(name = "last_name", length = 50)
    private String lastName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Level level = Level.DEBUTANT;

    /** Allure moyenne en min/km (ex: 5.5 = 5min30/km) */
    @Column(name = "avg_pace")
    private Double avgPace;

    /** Distance hebdomadaire préférée en km */
    @Column(name = "weekly_distance")
    private Integer weeklyDistance;

    @Column(length = 100)
    private String city;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @OneToMany(mappedBy = "runner", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<RunningSession> sessions = new ArrayList<>();

    @OneToMany(mappedBy = "requester", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Match> sentMatches = new ArrayList<>();

    @OneToMany(mappedBy = "receiver", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Match> receivedMatches = new ArrayList<>();

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum Level {
        DEBUTANT("Débutant"),
        INTERMEDIAIRE("Intermédiaire"),
        AVANCE("Avancé"),
        ELITE("Élite");

        private final String label;

        Level(String label) { this.label = label; }
        public String getLabel() { return label; }
    }

    // ─── Getters / Setters ───────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public Level getLevel() { return level; }
    public void setLevel(Level level) { this.level = level; }

    public Double getAvgPace() { return avgPace; }
    public void setAvgPace(Double avgPace) { this.avgPace = avgPace; }

    public Integer getWeeklyDistance() { return weeklyDistance; }
    public void setWeeklyDistance(Integer weeklyDistance) { this.weeklyDistance = weeklyDistance; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public List<RunningSession> getSessions() { return sessions; }
    public List<Match> getSentMatches() { return sentMatches; }
    public List<Match> getReceivedMatches() { return receivedMatches; }

    /** Retourne l'allure formatée "5:30 /km" */
    public String getFormattedPace() {
        if (avgPace == null) return "—";
        int minutes = (int) Math.floor(avgPace);
        int seconds = (int) Math.round((avgPace - minutes) * 60);
        return String.format("%d:%02d /km", minutes, seconds);
    }

    public String getDisplayName() {
        if (firstName != null && !firstName.isBlank()) return firstName;
        return username;
    }
}
