import { Box, Notification, Portal } from "@mantine/core";
import { IconAlertTriangle, IconCheck } from "@tabler/icons-react";
import { useEffect, useState } from "react";

const DEFAULT_TOAST_HIDE_AFTER_MS = 2800;

export type BottomToastVariant = "success" | "error";

interface BottomToastProps {
  eventId: number;
  message: string;
  variant?: BottomToastVariant;
  durationMs?: number;
}

/**
 * Renders a small bottom toast for transient Home notifications.
 */
export function BottomToast({
  eventId,
  message,
  variant = "success",
  durationMs = DEFAULT_TOAST_HIDE_AFTER_MS,
}: BottomToastProps) {
  const [dismissedEventId, setDismissedEventId] = useState(0);
  const isVisible = eventId > dismissedEventId;
  const isError = variant === "error";
  const icon = isError ? (
    <IconAlertTriangle size={16} stroke={2} aria-hidden="true" />
  ) : (
    <IconCheck size={16} stroke={2} aria-hidden="true" />
  );

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDismissedEventId(eventId);
    }, durationMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [durationMs, eventId, isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <Portal>
      <Box
        style={{
          position: "fixed",
          insetInline: 0,
          bottom: "max(16px, env(safe-area-inset-bottom))",
          display: "flex",
          justifyContent: "center",
          paddingInline: 16,
          zIndex: 300,
        }}
      >
        <Notification
          role={isError ? "alert" : "status"}
          aria-live={isError ? "assertive" : "polite"}
          withCloseButton={false}
          icon={icon}
          color={isError ? "red" : "teal"}
          title={message}
          mt="md"
          w="100%"
          maw={420}
          styles={{
            root: {
              border: "1px solid var(--mantine-color-gray-3)",
            },
            icon: {
              alignSelf: "center",
            },
            body: {
              display: "flex",
              minHeight: 28,
              alignItems: "center",
            },
            title: {
              marginBottom: 0,
              textAlign: "left",
              lineHeight: "1.2",
              whiteSpace: "pre-line",
            },
            description: {
              display: "none",
            },
          }}
        />
      </Box>
    </Portal>
  );
}
