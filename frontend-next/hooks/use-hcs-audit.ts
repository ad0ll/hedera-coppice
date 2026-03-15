"use client";

import { useState, useEffect, useRef } from "react";
import { MIRROR_NODE_URL, TOPIC_IDS } from "@/lib/constants";

export interface AuditEvent {
  type: string;
  ts: number;
  tx: string;
  data: Record<string, string>;
  sequenceNumber: number;
  consensusTimestamp: string;
}

export function useHCSAudit(topicType: "audit" | "impact" = "audit") {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const lastSequenceRef = useRef(0);

  const topicId = topicType === "audit" ? TOPIC_IDS.audit : TOPIC_IDS.impact;

  useEffect(() => {
    if (!topicId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchMessages() {
      try {
        const url = `${MIRROR_NODE_URL}/api/v1/topics/${topicId}/messages?order=asc&limit=100`;
        const response = await fetch(url);
        if (!response.ok) return;

        const data = await response.json();
        const newEvents: AuditEvent[] = [];

        for (const msg of data.messages || []) {
          if (msg.sequence_number <= lastSequenceRef.current) continue;

          try {
            const decoded = atob(msg.message);
            const parsed = JSON.parse(decoded);
            newEvents.push({
              ...parsed,
              sequenceNumber: msg.sequence_number,
              consensusTimestamp: msg.consensus_timestamp,
            });
          } catch {
            // Skip malformed messages
          }
        }

        if (newEvents.length > 0 && !cancelled) {
          lastSequenceRef.current = newEvents[newEvents.length - 1].sequenceNumber;
          setEvents((prev) => [...prev, ...newEvents]);
        }
      } catch {
        // Network error, retry on next poll
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [topicId]);

  return { events, loading };
}
