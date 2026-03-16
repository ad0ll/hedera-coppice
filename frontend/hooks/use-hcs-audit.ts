"use client";

import { useState, useEffect, useRef } from "react";
import { MIRROR_NODE_URL, TOPIC_IDS } from "@/lib/constants";
import {
  mirrorTopicMessagesResponseSchema,
  type MirrorTopicMessage,
} from "@/lib/mirror-node";

export interface AuditEvent {
  type: string;
  ts: number;
  tx: string;
  data: Record<string, string>;
  sequenceNumber: number;
  consensusTimestamp: string;
}

function parseMessages(messages: MirrorTopicMessage[]): AuditEvent[] {
  const events: AuditEvent[] = [];
  for (const msg of messages) {
    try {
      const decoded = atob(msg.message);
      const parsed = JSON.parse(decoded);
      events.push({
        ...parsed,
        sequenceNumber: msg.sequence_number,
        consensusTimestamp: msg.consensus_timestamp,
      });
    } catch {
      // Skip malformed messages
    }
  }
  return events;
}

export function useHCSAudit(topicType: "audit" | "impact" = "audit") {
  const topicId = topicType === "audit" ? TOPIC_IDS.audit : TOPIC_IDS.impact;
  const topicMissing = !topicId;

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(!topicMissing);
  const lastSequenceRef = useRef(0);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (!topicId) return;

    let cancelled = false;

    async function initialLoad() {
      // Paginate through all messages using links.next
      const allEvents: AuditEvent[] = [];
      let nextPath: string | null = `/api/v1/topics/${topicId}/messages?order=asc&limit=100`;

      while (nextPath && !cancelled) {
        try {
          const res: Response = await fetch(`${MIRROR_NODE_URL}${nextPath}`);
          if (!res.ok) break;

          const data = mirrorTopicMessagesResponseSchema.parse(await res.json());
          const parsed = parseMessages(data.messages || []);
          allEvents.push(...parsed);

          if (parsed.length > 0) {
            lastSequenceRef.current = parsed[parsed.length - 1].sequenceNumber;
          }

          nextPath = data.links?.next || null;
        } catch {
          break;
        }
      }

      if (!cancelled) {
        setEvents(allEvents.length > 500 ? allEvents.slice(-500) : allEvents);
        setLoading(false);
        initialLoadDone.current = true;
      }
    }

    async function pollNewMessages() {
      if (!initialLoadDone.current) return;

      try {
        const url = `${MIRROR_NODE_URL}/api/v1/topics/${topicId}/messages?order=asc&limit=100&sequencenumber=gt:${lastSequenceRef.current}`;
        const response = await fetch(url);
        if (!response.ok) return;

        const data = mirrorTopicMessagesResponseSchema.parse(await response.json());
        const newEvents = parseMessages(data.messages || []);

        if (newEvents.length > 0 && !cancelled) {
          lastSequenceRef.current = newEvents[newEvents.length - 1].sequenceNumber;
          setEvents((prev) => {
            const combined = [...prev, ...newEvents];
            return combined.length > 500 ? combined.slice(-500) : combined;
          });
        }
      } catch {
        // Network error, retry on next poll
      }
    }

    initialLoad();
    const interval = setInterval(pollNewMessages, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [topicId]);

  return { events, loading, topicMissing };
}
