import { Box, Notification, Portal } from "@mantine/core";
import { useEffect, useState } from "react";

const TOAST_HIDE_AFTER_MS = 2800;
const CHECK_ICON = (
  <svg
    viewBox="0 0 16 16"
    width="16"
    height="16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M3.5 8.5L6.5 11.5L12.5 4.5"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface BottomToastProps {
  eventId: number;
  message: string;
}

/**
 * Renders a small bottom toast for transient background update feedback.
 */
export function BottomToast({ eventId, message }: BottomToastProps) {
  const [dismissedEventId, setDismissedEventId] = useState(0);
  const isVisible = eventId > dismissedEventId;

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDismissedEventId(eventId);
    }, TOAST_HIDE_AFTER_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [eventId, isVisible]);

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
          role="status"
          aria-live="polite"
          withCloseButton={false}
          icon={CHECK_ICON}
          color="teal"
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
