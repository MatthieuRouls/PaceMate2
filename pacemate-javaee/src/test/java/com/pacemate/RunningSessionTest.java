package com.pacemate;

import com.pacemate.model.RunningSession;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RunningSessionTest {

    @Test
    void testFormattedDuration_hours() {
        RunningSession s = new RunningSession();
        s.setDuration(5400); // 1h30
        assertEquals("1h 30min", s.getFormattedDuration());
    }

    @Test
    void testFormattedDuration_minutes() {
        RunningSession s = new RunningSession();
        s.setDuration(1830); // 30min 30s
        assertEquals("30min 30s", s.getFormattedDuration());
    }

    @Test
    void testFormattedPace() {
        RunningSession s = new RunningSession();
        s.setDistance(10.0);
        s.setDuration(3300); // 55 min → 5:30 /km
        assertEquals("5:30 /km", s.getFormattedPace());
    }

    @Test
    void testFormattedPace_zeroDivision() {
        RunningSession s = new RunningSession();
        s.setDistance(0.0);
        s.setDuration(600);
        assertEquals("—", s.getFormattedPace());
    }
}
