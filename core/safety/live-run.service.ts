/**
 * Live Run Safety Service
 *
 * Handles real-time run tracking, emergency detection, and notifications.
 *
 * IMPORTANT:
 * - Never expose live data to non-participants
 * - All location data auto-deletes after 7 days
 * - Encrypted transport for all location data
 * - Integrates with TrustEngine for session_completed events
 */

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import {
  RunSession,
  RunSessionStatus,
  RunParticipant,
  RunLocationPoint,
  RecordLocationInput,
  TrustedContact,
  CreateTrustedContactInput,
  UpdateTrustedContactInput,
  EmergencyAlert,
  EmergencyReason,
  TriggerEmergencyInput,
  EmergencyNotification,
  AnomalyDetectionResult,
  StartRunSessionInput,
  StartRunSessionResult,
  EndRunSessionInput,
  EndRunSessionResult,
  RunSessionStats,
  GeoPoint,
  SafetyMonitoringConfig,
  DEFAULT_SAFETY_MONITORING,
  LiveRunErrorCode,
  LiveRunConfig,
  LiveTrackingMessage,
  LocationUpdatePayload,
  ParticipantUpdatePayload,
} from './live-run.types';
import { TrustEngine, getTrustEngine } from './trust-engine';
import type { SafetyEventType } from './types';

// ============================================
// LIVE RUN SERVICE
// ============================================

export class LiveRunService {
  private supabase: ReturnType<typeof createClient> | null = null;
  private trustEngine: TrustEngine;

  // In-memory session cache for fast access
  private activeSessions: Map<string, RunSession> = new Map();

  // WebSocket connections (in production, use Redis pub/sub)
  private sessionSubscribers: Map<string, Set<string>> = new Map();

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
    this.trustEngine = getTrustEngine();
  }

  /**
   * Set the Supabase client (useful for testing)
   */
  setSupabaseClient(client: ReturnType<typeof createClient>): void {
    this.supabase = client;
  }

  /**
   * Set the TrustEngine (useful for testing)
   */
  setTrustEngine(engine: TrustEngine): void {
    this.trustEngine = engine;
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  /**
   * Start a new run session
   */
  async startSession(input: StartRunSessionInput): Promise<StartRunSessionResult> {
    // Check if host already has an active session
    const existingSession = await this.getActiveSessionForUser(input.host_id);
    if (existingSession) {
      return {
        success: false,
        error_code: LiveRunErrorCode.SESSION_ALREADY_ACTIVE,
        error_message: 'Vous avez deja une session active',
      };
    }

    // Create session
    const sessionId = this.generateId('run');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + LiveRunConfig.DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    const session: RunSession = {
      id: sessionId,
      host_id: input.host_id,
      session_id: input.session_id,
      participants: [
        {
          user_id: input.host_id,
          joined_at: now.toISOString(),
          is_active: true,
          status: 'running',
        },
      ],
      status: 'active',
      start_time: now.toISOString(),
      planned_route: input.planned_route,
      safety_monitoring: {
        ...DEFAULT_SAFETY_MONITORING,
        ...input.safety_monitoring,
      },
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    // Add invited participants
    if (input.participant_ids) {
      for (const participantId of input.participant_ids) {
        if (participantId !== input.host_id) {
          session.participants.push({
            user_id: participantId,
            joined_at: now.toISOString(),
            is_active: false,
            status: 'joined',
          });
        }
      }
    }

    // Save to database
    await this.saveSession(session);

    // Cache active session
    this.activeSessions.set(sessionId, session);

    // Generate WebSocket URL
    const websocketUrl = this.generateWebSocketUrl(sessionId, input.host_id);

    return {
      success: true,
      run_session: session,
      websocket_url: websocketUrl,
    };
  }

  /**
   * End a run session
   */
  async endSession(input: EndRunSessionInput): Promise<EndRunSessionResult> {
    const session = await this.getSession(input.session_id);
    if (!session) {
      return {
        success: false,
        error_code: LiveRunErrorCode.SESSION_NOT_FOUND,
        error_message: 'Session non trouvee',
      };
    }

    // Verify user is host or participant
    const isHost = session.host_id === input.user_id;
    const isParticipant = session.participants.some(p => p.user_id === input.user_id);

    if (!isHost && !isParticipant) {
      return {
        success: false,
        error_code: LiveRunErrorCode.NOT_PARTICIPANT,
        error_message: 'Vous ne participez pas a cette session',
      };
    }

    // Only host can end for everyone
    if (!isHost && input.status === 'completed') {
      // Participant leaving - just mark them as finished
      await this.updateParticipantStatus(input.session_id, input.user_id, 'finished');

      return {
        success: true,
        session: await this.getSession(input.session_id) || session,
      };
    }

    // End session
    const now = new Date();
    session.status = input.status;
    session.end_time = now.toISOString();
    session.updated_at = now.toISOString();

    // Mark all participants as finished
    for (const participant of session.participants) {
      if (participant.is_active) {
        participant.is_active = false;
        participant.status = 'finished';
        participant.left_at = now.toISOString();
      }
    }

    // Calculate stats
    const stats = await this.calculateSessionStats(session);

    // Save updated session
    await this.saveSession(session);

    // Remove from active cache
    this.activeSessions.delete(input.session_id);

    // Notify all subscribers
    await this.broadcastToSession(input.session_id, {
      type: 'session_ended',
      session_id: input.session_id,
      timestamp: now.toISOString(),
      payload: { status: input.status, stats },
    });

    // Emit SafetyEvent if completed successfully
    if (input.status === 'completed') {
      for (const participant of session.participants) {
        await this.trustEngine.logEventAndRecalculate(
          participant.user_id,
          'session_completed' as SafetyEventType,
          {
            description: 'Session de course terminee',
            metadata: {
              run_session_id: input.session_id,
              duration_seconds: stats.duration_seconds,
              distance_meters: stats.distance_meters,
            },
          }
        );
      }
    }

    return {
      success: true,
      session,
      stats,
    };
  }

  /**
   * Join an existing run session
   */
  async joinSession(sessionId: string, userId: string): Promise<StartRunSessionResult> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        error_code: LiveRunErrorCode.SESSION_NOT_FOUND,
        error_message: 'Session non trouvee',
      };
    }

    if (session.status !== 'active') {
      return {
        success: false,
        error_code: LiveRunErrorCode.SESSION_NOT_ACTIVE,
        error_message: 'Cette session n\'est pas active',
      };
    }

    // Check if already participant
    const existingParticipant = session.participants.find(p => p.user_id === userId);
    if (existingParticipant) {
      if (existingParticipant.is_active) {
        return {
          success: true,
          run_session: session,
          websocket_url: this.generateWebSocketUrl(sessionId, userId),
        };
      }
      // Reactivate
      existingParticipant.is_active = true;
      existingParticipant.status = 'running';
      existingParticipant.left_at = undefined;
    } else {
      // Add new participant
      session.participants.push({
        user_id: userId,
        joined_at: new Date().toISOString(),
        is_active: true,
        status: 'running',
      });
    }

    // Check participant limit
    if (session.participants.length > LiveRunConfig.MAX_PARTICIPANTS) {
      return {
        success: false,
        error_code: LiveRunErrorCode.ACCESS_DENIED,
        error_message: 'Limite de participants atteinte',
      };
    }

    session.updated_at = new Date().toISOString();
    await this.saveSession(session);

    // Notify other participants
    await this.broadcastToSession(sessionId, {
      type: 'participant_joined',
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      payload: { user_id: userId, action: 'joined' } as ParticipantUpdatePayload,
    });

    return {
      success: true,
      run_session: session,
      websocket_url: this.generateWebSocketUrl(sessionId, userId),
    };
  }

  /**
   * Leave a run session (but don't end it)
   */
  async leaveSession(sessionId: string, userId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    if (!session) return false;

    const participant = session.participants.find(p => p.user_id === userId);
    if (!participant) return false;

    participant.is_active = false;
    participant.status = 'finished';
    participant.left_at = new Date().toISOString();

    session.updated_at = new Date().toISOString();
    await this.saveSession(session);

    // Notify other participants
    await this.broadcastToSession(sessionId, {
      type: 'participant_left',
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      payload: { user_id: userId, action: 'left' } as ParticipantUpdatePayload,
    });

    return true;
  }

  // ============================================
  // LOCATION TRACKING
  // ============================================

  /**
   * Record a GPS location point
   */
  async recordLocation(input: RecordLocationInput): Promise<RunLocationPoint | null> {
    // Validate session and participant
    const session = await this.getSession(input.session_id);
    if (!session || session.status !== 'active') {
      console.log(`[LiveRun] Invalid session for location: ${input.session_id}`);
      return null;
    }

    const participant = session.participants.find(
      p => p.user_id === input.user_id && p.is_active
    );
    if (!participant) {
      console.log(`[LiveRun] User not active participant: ${input.user_id}`);
      return null;
    }

    // Create location point
    const locationPoint: RunLocationPoint = {
      id: this.generateId('loc'),
      session_id: input.session_id,
      user_id: input.user_id,
      lat: input.lat,
      lng: input.lng,
      altitude: input.altitude,
      accuracy: input.accuracy,
      speed: input.speed,
      heading: input.heading,
      timestamp: new Date().toISOString(),
      is_emergency_ping: input.is_emergency_ping || false,
    };

    // Save to database
    await this.saveLocationPoint(locationPoint);

    // Update participant's last location
    participant.last_location = locationPoint;
    await this.saveSession(session);

    // Check for anomalies if safety monitoring is enabled
    if (session.safety_monitoring.enabled) {
      const anomaly = await this.detectAnomaly(session, input.user_id, locationPoint);
      if (anomaly.should_trigger_emergency) {
        await this.triggerEmergency({
          session_id: input.session_id,
          user_id: input.user_id,
          reason: anomaly.anomaly_type === 'no_movement' ? 'no_movement' : 'route_deviation',
          location: { lat: input.lat, lng: input.lng },
        });
      } else if (anomaly.has_anomaly) {
        // Broadcast anomaly warning
        await this.broadcastToSession(input.session_id, {
          type: 'anomaly_detected',
          session_id: input.session_id,
          timestamp: new Date().toISOString(),
          payload: anomaly,
        });
      }
    }

    // Broadcast location update to participants
    await this.broadcastToSession(input.session_id, {
      type: 'location_update',
      session_id: input.session_id,
      timestamp: new Date().toISOString(),
      payload: { user_id: input.user_id, location: locationPoint } as LocationUpdatePayload,
    });

    return locationPoint;
  }

  /**
   * Get location history for a session
   * IMPORTANT: Only accessible to participants
   */
  async getLocationHistory(
    sessionId: string,
    requestingUserId: string,
    userId?: string,
    limit = 100
  ): Promise<RunLocationPoint[]> {
    // Verify requester is participant
    const session = await this.getSession(sessionId);
    if (!session) return [];

    const isParticipant = session.participants.some(p => p.user_id === requestingUserId);
    if (!isParticipant) {
      console.log(`[LiveRun] Access denied for location history: ${requestingUserId}`);
      return [];
    }

    return this.fetchLocationHistory(sessionId, userId, limit);
  }

  // ============================================
  // EMERGENCY SYSTEM
  // ============================================

  /**
   * Trigger an emergency alert
   */
  async triggerEmergency(input: TriggerEmergencyInput): Promise<EmergencyAlert | null> {
    const session = await this.getSession(input.session_id);
    if (!session) {
      console.log(`[LiveRun] Emergency trigger failed - session not found: ${input.session_id}`);
      return null;
    }

    // Check if emergency already active
    if (session.status === 'emergency') {
      console.log(`[LiveRun] Emergency already active for session: ${input.session_id}`);
      return null;
    }

    const now = new Date();

    // Get user's last known location if not provided
    let location = input.location;
    if (!location) {
      const participant = session.participants.find(p => p.user_id === input.user_id);
      if (participant?.last_location) {
        location = {
          lat: participant.last_location.lat,
          lng: participant.last_location.lng,
        };
      } else {
        location = { lat: 0, lng: 0 }; // Fallback
      }
    }

    // Create emergency alert
    const alert: EmergencyAlert = {
      id: this.generateId('emg'),
      session_id: input.session_id,
      user_id: input.user_id,
      reason: input.reason,
      location,
      timestamp: now.toISOString(),
      notified_participants: [],
      notified_contacts: [],
    };

    // Update session status
    session.status = 'emergency';
    session.emergency_triggered_at = now.toISOString();
    session.emergency_reason = input.reason;
    session.updated_at = now.toISOString();

    // Escalate tracking frequency
    session.safety_monitoring.normal_ping_interval_seconds =
      session.safety_monitoring.emergency_ping_interval_seconds;

    await this.saveSession(session);
    await this.saveEmergencyAlert(alert);

    // Notify participants
    const participantIds = session.participants
      .filter(p => p.user_id !== input.user_id)
      .map(p => p.user_id);

    for (const participantId of participantIds) {
      await this.sendEmergencyNotification(participantId, alert, input.message);
      alert.notified_participants.push(participantId);
    }

    // Notify trusted contacts
    if (session.safety_monitoring.notify_trusted_contacts) {
      const contacts = await this.getTrustedContacts(input.user_id);
      for (const contact of contacts) {
        await this.sendEmergencyNotificationToContact(contact, alert, input.message);
        alert.notified_contacts.push(contact.id);
      }
    }

    // Update alert with notification info
    await this.saveEmergencyAlert(alert);

    // Broadcast to session
    await this.broadcastToSession(input.session_id, {
      type: 'emergency_triggered',
      session_id: input.session_id,
      timestamp: now.toISOString(),
      payload: alert,
    });

    console.log(`[LiveRun] Emergency triggered for session ${input.session_id}: ${input.reason}`);

    return alert;
  }

  /**
   * Resolve an emergency
   */
  async resolveEmergency(
    sessionId: string,
    userId: string,
    notes?: string
  ): Promise<boolean> {
    const session = await this.getSession(sessionId);
    if (!session || session.status !== 'emergency') {
      return false;
    }

    // Only host or the user who triggered can resolve
    if (session.host_id !== userId) {
      const participant = session.participants.find(p => p.user_id === userId);
      if (!participant) return false;
    }

    const now = new Date();

    // Reset session status
    session.status = 'active';
    session.updated_at = now.toISOString();

    // Reset tracking frequency
    session.safety_monitoring.normal_ping_interval_seconds =
      DEFAULT_SAFETY_MONITORING.normal_ping_interval_seconds;

    await this.saveSession(session);

    // Update emergency alert
    const alert = await this.getActiveEmergencyAlert(sessionId);
    if (alert) {
      alert.resolved_at = now.toISOString();
      alert.resolution_notes = notes;
      await this.saveEmergencyAlert(alert);
    }

    // Broadcast resolution
    await this.broadcastToSession(sessionId, {
      type: 'emergency_resolved',
      session_id: sessionId,
      timestamp: now.toISOString(),
      payload: { resolved_by: userId, notes },
    });

    return true;
  }

  // ============================================
  // ANOMALY DETECTION
  // ============================================

  /**
   * Detect anomalies in user's location data
   */
  async detectAnomaly(
    session: RunSession,
    userId: string,
    currentLocation: RunLocationPoint
  ): Promise<AnomalyDetectionResult> {
    const config = session.safety_monitoring;
    const result: AnomalyDetectionResult = {
      has_anomaly: false,
      severity: 'low',
      details: {},
      should_trigger_emergency: false,
    };

    // Get recent location history
    const history = await this.fetchLocationHistory(session.id, userId, 20);
    if (history.length < 2) {
      return result; // Not enough data
    }

    // Check for no movement
    const noMovementResult = this.checkNoMovement(history, config.no_movement_threshold_seconds);
    if (noMovementResult.detected) {
      result.has_anomaly = true;
      result.anomaly_type = 'no_movement';
      result.details.last_movement_seconds_ago = noMovementResult.seconds_since_movement;

      if (noMovementResult.seconds_since_movement >= config.no_movement_threshold_seconds) {
        result.severity = 'critical';
        result.should_trigger_emergency = true;
      } else if (noMovementResult.seconds_since_movement >= config.no_movement_threshold_seconds * 0.5) {
        result.severity = 'high';
      } else {
        result.severity = 'medium';
      }
    }

    // Check for route deviation (if planned route exists)
    if (session.planned_route && session.planned_route.waypoints.length > 0) {
      const deviationMeters = this.calculateRouteDeviation(
        currentLocation,
        session.planned_route.waypoints
      );
      result.details.deviation_meters = deviationMeters;

      if (deviationMeters >= config.route_deviation_threshold_meters) {
        result.has_anomaly = true;
        result.anomaly_type = 'route_deviation';

        if (deviationMeters >= config.route_deviation_threshold_meters * 2) {
          result.severity = 'critical';
          result.should_trigger_emergency = true;
        } else {
          result.severity = 'high';
        }
      }
    }

    return result;
  }

  /**
   * Check for no movement in location history
   */
  private checkNoMovement(
    history: RunLocationPoint[],
    thresholdSeconds: number
  ): { detected: boolean; seconds_since_movement: number } {
    if (history.length < 2) {
      return { detected: false, seconds_since_movement: 0 };
    }

    // Sort by timestamp descending
    const sorted = [...history].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const latest = sorted[0];
    const movementThreshold = 5; // 5 meters minimum movement

    // Find last significant movement
    for (let i = 1; i < sorted.length; i++) {
      const distance = this.calculateDistance(
        { lat: latest.lat, lng: latest.lng },
        { lat: sorted[i].lat, lng: sorted[i].lng }
      );

      if (distance >= movementThreshold) {
        const secondsSinceMovement = Math.floor(
          (new Date(latest.timestamp).getTime() - new Date(sorted[i].timestamp).getTime()) / 1000
        );
        return {
          detected: secondsSinceMovement >= thresholdSeconds * 0.5,
          seconds_since_movement: secondsSinceMovement,
        };
      }
    }

    // No movement detected in entire history
    const oldestTimestamp = new Date(sorted[sorted.length - 1].timestamp).getTime();
    const secondsSinceOldest = Math.floor(
      (new Date(latest.timestamp).getTime() - oldestTimestamp) / 1000
    );

    return {
      detected: true,
      seconds_since_movement: secondsSinceOldest,
    };
  }

  /**
   * Calculate deviation from planned route
   */
  private calculateRouteDeviation(
    location: RunLocationPoint,
    waypoints: GeoPoint[]
  ): number {
    let minDistance = Infinity;

    // Find minimum distance to any waypoint or segment
    for (let i = 0; i < waypoints.length; i++) {
      const distance = this.calculateDistance(
        { lat: location.lat, lng: location.lng },
        waypoints[i]
      );
      minDistance = Math.min(minDistance, distance);

      // Check distance to segment between waypoints
      if (i < waypoints.length - 1) {
        const segmentDistance = this.distanceToSegment(
          { lat: location.lat, lng: location.lng },
          waypoints[i],
          waypoints[i + 1]
        );
        minDistance = Math.min(minDistance, segmentDistance);
      }
    }

    return minDistance;
  }

  // ============================================
  // TRUSTED CONTACTS
  // ============================================

  /**
   * Add a trusted contact
   */
  async addTrustedContact(input: CreateTrustedContactInput): Promise<TrustedContact | null> {
    // Validate input
    if (!input.email && !input.phone) {
      console.log('[LiveRun] Trusted contact must have email or phone');
      return null;
    }

    // Check limit
    const existingContacts = await this.getTrustedContacts(input.user_id);
    if (existingContacts.length >= LiveRunConfig.MAX_TRUSTED_CONTACTS) {
      console.log('[LiveRun] Trusted contact limit reached');
      return null;
    }

    const contact: TrustedContact = {
      id: this.generateId('tc'),
      user_id: input.user_id,
      name: input.name,
      email: input.email,
      phone: input.phone,
      relationship: input.relationship,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await this.saveTrustedContact(contact);
    return contact;
  }

  /**
   * Update a trusted contact
   */
  async updateTrustedContact(
    contactId: string,
    userId: string,
    updates: UpdateTrustedContactInput
  ): Promise<TrustedContact | null> {
    const contact = await this.getTrustedContact(contactId);
    if (!contact || contact.user_id !== userId) {
      return null;
    }

    if (updates.name !== undefined) contact.name = updates.name;
    if (updates.email !== undefined) contact.email = updates.email;
    if (updates.phone !== undefined) contact.phone = updates.phone;
    if (updates.relationship !== undefined) contact.relationship = updates.relationship;
    if (updates.is_active !== undefined) contact.is_active = updates.is_active;
    contact.updated_at = new Date().toISOString();

    await this.saveTrustedContact(contact);
    return contact;
  }

  /**
   * Delete a trusted contact
   */
  async deleteTrustedContact(contactId: string, userId: string): Promise<boolean> {
    const contact = await this.getTrustedContact(contactId);
    if (!contact || contact.user_id !== userId) {
      return false;
    }

    await this.removeTrustedContact(contactId);
    return true;
  }

  /**
   * Get all trusted contacts for a user
   */
  async getTrustedContacts(userId: string): Promise<TrustedContact[]> {
    return this.fetchTrustedContacts(userId);
  }

  // ============================================
  // PRIVACY & DATA RETENTION
  // ============================================

  /**
   * Delete expired data (run via cron job)
   * Auto-deletes all location data older than 7 days
   */
  async cleanupExpiredData(): Promise<{ sessions: number; locations: number }> {
    const now = new Date();
    let sessionsDeleted = 0;
    let locationsDeleted = 0;

    // Find and delete expired sessions
    const expiredSessions = await this.findExpiredSessions(now);
    for (const session of expiredSessions) {
      // Delete all location points for this session
      const locationCount = await this.deleteSessionLocations(session.id);
      locationsDeleted += locationCount;

      // Delete the session
      await this.deleteSession(session.id);
      sessionsDeleted++;
    }

    console.log(`[LiveRun] Cleanup: deleted ${sessionsDeleted} sessions, ${locationsDeleted} locations`);

    return { sessions: sessionsDeleted, locations: locationsDeleted };
  }

  // ============================================
  // WEBSOCKET MANAGEMENT
  // ============================================

  /**
   * Generate WebSocket URL for session
   */
  private generateWebSocketUrl(sessionId: string, userId: string): string {
    // In production, this would generate a signed URL
    const token = this.generateToken(sessionId, userId);
    return `wss://api.pacemate.com/live/${sessionId}?token=${token}`;
  }

  /**
   * Generate authentication token for WebSocket
   */
  private generateToken(sessionId: string, userId: string): string {
    // Simplified - in production use JWT
    return Buffer.from(`${sessionId}:${userId}:${Date.now()}`).toString('base64');
  }

  /**
   * Subscribe to session updates (WebSocket simulation)
   */
  subscribeToSession(sessionId: string, subscriberId: string): void {
    if (!this.sessionSubscribers.has(sessionId)) {
      this.sessionSubscribers.set(sessionId, new Set());
    }
    this.sessionSubscribers.get(sessionId)!.add(subscriberId);
  }

  /**
   * Unsubscribe from session updates
   */
  unsubscribeFromSession(sessionId: string, subscriberId: string): void {
    this.sessionSubscribers.get(sessionId)?.delete(subscriberId);
  }

  /**
   * Broadcast message to all session subscribers
   */
  private async broadcastToSession<T>(
    sessionId: string,
    message: LiveTrackingMessage<T>
  ): Promise<void> {
    const subscribers = this.sessionSubscribers.get(sessionId);
    if (!subscribers || subscribers.size === 0) {
      return;
    }

    // In production, this would use Redis pub/sub or similar
    console.log(`[LiveRun] Broadcasting to ${subscribers.size} subscribers:`, message.type);

    // Emit event for each subscriber (simulation)
    for (const subscriberId of subscribers) {
      // In real implementation, send via WebSocket
      console.log(`[LiveRun] -> ${subscriberId}`);
    }
  }

  // ============================================
  // DATABASE OPERATIONS
  // ============================================

  private async saveSession(session: RunSession): Promise<void> {
    // Update cache
    if (session.status === 'active' || session.status === 'emergency') {
      this.activeSessions.set(session.id, session);
    }

    if (!this.supabase) {
      console.log('[Mock] Saving session:', session.id);
      return;
    }

    try {
      const data = session as unknown as Record<string, unknown>;
      await (this.supabase.from('run_sessions') as unknown as {
        upsert: (data: Record<string, unknown>) => Promise<{ error: unknown }>;
      }).upsert(data);
    } catch (err) {
      console.error('Error saving session:', err);
    }
  }

  private async getSession(sessionId: string): Promise<RunSession | null> {
    // Check cache first
    const cached = this.activeSessions.get(sessionId);
    if (cached) return cached;

    if (!this.supabase) {
      console.log('[Mock] Getting session:', sessionId);
      return null;
    }

    try {
      const { data, error } = await this.supabase
        .from('run_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error || !data) return null;
      return data as RunSession;
    } catch (err) {
      console.error('Error getting session:', err);
      return null;
    }
  }

  private async getActiveSessionForUser(userId: string): Promise<RunSession | null> {
    // Check cache
    for (const session of this.activeSessions.values()) {
      if (
        session.status === 'active' &&
        session.participants.some(p => p.user_id === userId && p.is_active)
      ) {
        return session;
      }
    }

    if (!this.supabase) {
      return null;
    }

    try {
      const { data, error } = await this.supabase
        .from('run_sessions')
        .select('*')
        .eq('status', 'active')
        .contains('participants', [{ user_id: userId, is_active: true }])
        .single();

      if (error || !data) return null;
      return data as RunSession;
    } catch (err) {
      return null;
    }
  }

  private async deleteSession(sessionId: string): Promise<void> {
    this.activeSessions.delete(sessionId);

    if (!this.supabase) {
      console.log('[Mock] Deleting session:', sessionId);
      return;
    }

    try {
      await this.supabase.from('run_sessions').delete().eq('id', sessionId);
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  }

  private async findExpiredSessions(now: Date): Promise<RunSession[]> {
    if (!this.supabase) {
      return [];
    }

    try {
      const { data, error } = await this.supabase
        .from('run_sessions')
        .select('*')
        .lt('expires_at', now.toISOString());

      if (error || !data) return [];
      return data as RunSession[];
    } catch (err) {
      return [];
    }
  }

  private async saveLocationPoint(point: RunLocationPoint): Promise<void> {
    if (!this.supabase) {
      console.log('[Mock] Saving location point:', point.id);
      return;
    }

    try {
      const data = point as unknown as Record<string, unknown>;
      await (this.supabase.from('run_location_points') as unknown as {
        insert: (data: Record<string, unknown>) => Promise<{ error: unknown }>;
      }).insert(data);
    } catch (err) {
      console.error('Error saving location point:', err);
    }
  }

  private async fetchLocationHistory(
    sessionId: string,
    userId?: string,
    limit = 100
  ): Promise<RunLocationPoint[]> {
    if (!this.supabase) {
      return [];
    }

    try {
      let query = this.supabase
        .from('run_location_points')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error || !data) return [];
      return data as RunLocationPoint[];
    } catch (err) {
      return [];
    }
  }

  private async deleteSessionLocations(sessionId: string): Promise<number> {
    if (!this.supabase) {
      return 0;
    }

    try {
      const { data } = await this.supabase
        .from('run_location_points')
        .delete()
        .eq('session_id', sessionId)
        .select('id');

      return data?.length || 0;
    } catch (err) {
      return 0;
    }
  }

  private async updateParticipantStatus(
    sessionId: string,
    userId: string,
    status: RunParticipant['status']
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    const participant = session.participants.find(p => p.user_id === userId);
    if (participant) {
      participant.status = status;
      if (status === 'finished') {
        participant.is_active = false;
        participant.left_at = new Date().toISOString();
      }
      await this.saveSession(session);
    }
  }

  private async saveEmergencyAlert(alert: EmergencyAlert): Promise<void> {
    if (!this.supabase) {
      console.log('[Mock] Saving emergency alert:', alert.id);
      return;
    }

    try {
      const data = alert as unknown as Record<string, unknown>;
      await (this.supabase.from('emergency_alerts') as unknown as {
        upsert: (data: Record<string, unknown>) => Promise<{ error: unknown }>;
      }).upsert(data);
    } catch (err) {
      console.error('Error saving emergency alert:', err);
    }
  }

  private async getActiveEmergencyAlert(sessionId: string): Promise<EmergencyAlert | null> {
    if (!this.supabase) {
      return null;
    }

    try {
      const { data, error } = await this.supabase
        .from('emergency_alerts')
        .select('*')
        .eq('session_id', sessionId)
        .is('resolved_at', null)
        .single();

      if (error || !data) return null;
      return data as EmergencyAlert;
    } catch (err) {
      return null;
    }
  }

  private async saveTrustedContact(contact: TrustedContact): Promise<void> {
    if (!this.supabase) {
      console.log('[Mock] Saving trusted contact:', contact.id);
      return;
    }

    try {
      const data = contact as unknown as Record<string, unknown>;
      await (this.supabase.from('trusted_contacts') as unknown as {
        upsert: (data: Record<string, unknown>) => Promise<{ error: unknown }>;
      }).upsert(data);
    } catch (err) {
      console.error('Error saving trusted contact:', err);
    }
  }

  private async getTrustedContact(contactId: string): Promise<TrustedContact | null> {
    if (!this.supabase) {
      return null;
    }

    try {
      const { data, error } = await this.supabase
        .from('trusted_contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      if (error || !data) return null;
      return data as TrustedContact;
    } catch (err) {
      return null;
    }
  }

  private async fetchTrustedContacts(userId: string): Promise<TrustedContact[]> {
    if (!this.supabase) {
      return [];
    }

    try {
      const { data, error } = await this.supabase
        .from('trusted_contacts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error || !data) return [];
      return data as TrustedContact[];
    } catch (err) {
      return [];
    }
  }

  private async removeTrustedContact(contactId: string): Promise<void> {
    if (!this.supabase) {
      console.log('[Mock] Removing trusted contact:', contactId);
      return;
    }

    try {
      await this.supabase.from('trusted_contacts').delete().eq('id', contactId);
    } catch (err) {
      console.error('Error removing trusted contact:', err);
    }
  }

  // ============================================
  // NOTIFICATION HELPERS
  // ============================================

  private async sendEmergencyNotification(
    userId: string,
    alert: EmergencyAlert,
    message?: string
  ): Promise<void> {
    // In production, send push notification
    console.log(`[LiveRun] Sending emergency notification to user ${userId}`);

    const notification: EmergencyNotification = {
      type: 'emergency_alert',
      alert_id: alert.id,
      session_id: alert.session_id,
      user_name: 'Unknown', // Would fetch from profile
      reason: alert.reason,
      location: alert.location,
      timestamp: alert.timestamp,
      message,
      action_url: `pacemate://emergency/${alert.id}`,
    };

    // TODO: Integrate with push notification service
    console.log('[LiveRun] Notification payload:', notification);
  }

  private async sendEmergencyNotificationToContact(
    contact: TrustedContact,
    alert: EmergencyAlert,
    message?: string
  ): Promise<void> {
    console.log(`[LiveRun] Sending emergency notification to contact ${contact.name}`);

    // Send email if available
    if (contact.email) {
      // TODO: Integrate with email service
      console.log(`[LiveRun] -> Email to ${contact.email}`);
    }

    // Send SMS if available
    if (contact.phone) {
      // TODO: Integrate with SMS service
      console.log(`[LiveRun] -> SMS to ${contact.phone}`);
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
    const R = 6371e3; // Earth radius in meters
    const lat1Rad = (point1.lat * Math.PI) / 180;
    const lat2Rad = (point2.lat * Math.PI) / 180;
    const deltaLat = ((point2.lat - point1.lat) * Math.PI) / 180;
    const deltaLng = ((point2.lng - point1.lng) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Calculate distance from point to line segment
   */
  private distanceToSegment(point: GeoPoint, start: GeoPoint, end: GeoPoint): number {
    const dx = end.lng - start.lng;
    const dy = end.lat - start.lat;

    if (dx === 0 && dy === 0) {
      return this.calculateDistance(point, start);
    }

    const t = Math.max(
      0,
      Math.min(
        1,
        ((point.lng - start.lng) * dx + (point.lat - start.lat) * dy) / (dx * dx + dy * dy)
      )
    );

    const closestPoint: GeoPoint = {
      lat: start.lat + t * dy,
      lng: start.lng + t * dx,
    };

    return this.calculateDistance(point, closestPoint);
  }

  /**
   * Calculate session statistics
   */
  private async calculateSessionStats(session: RunSession): Promise<RunSessionStats> {
    if (!session.start_time || !session.end_time) {
      return {
        duration_seconds: 0,
        distance_meters: 0,
        avg_speed_ms: 0,
        max_speed_ms: 0,
        location_points_count: 0,
      };
    }

    const durationSeconds = Math.floor(
      (new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 1000
    );

    // Get all location points
    const locations = await this.fetchLocationHistory(session.id, undefined, 10000);

    if (locations.length < 2) {
      return {
        duration_seconds: durationSeconds,
        distance_meters: 0,
        avg_speed_ms: 0,
        max_speed_ms: 0,
        location_points_count: locations.length,
      };
    }

    // Sort by timestamp
    const sorted = [...locations].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Calculate total distance
    let totalDistance = 0;
    let maxSpeed = 0;

    for (let i = 1; i < sorted.length; i++) {
      const distance = this.calculateDistance(
        { lat: sorted[i - 1].lat, lng: sorted[i - 1].lng },
        { lat: sorted[i].lat, lng: sorted[i].lng }
      );
      totalDistance += distance;

      if (sorted[i].speed !== undefined && sorted[i].speed! > maxSpeed) {
        maxSpeed = sorted[i].speed!;
      }
    }

    const avgSpeed = durationSeconds > 0 ? totalDistance / durationSeconds : 0;

    return {
      duration_seconds: durationSeconds,
      distance_meters: Math.round(totalDistance),
      avg_speed_ms: Math.round(avgSpeed * 100) / 100,
      max_speed_ms: Math.round(maxSpeed * 100) / 100,
      location_points_count: locations.length,
    };
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let liveRunServiceInstance: LiveRunService | null = null;

/**
 * Get the LiveRunService singleton instance
 */
export function getLiveRunService(): LiveRunService {
  if (!liveRunServiceInstance) {
    liveRunServiceInstance = new LiveRunService(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return liveRunServiceInstance;
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetLiveRunService(): void {
  liveRunServiceInstance = null;
}
