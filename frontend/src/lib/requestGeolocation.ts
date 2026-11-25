interface RequestGeolocationOptions {
  geolocation: Geolocation;
  signal: AbortSignal;
  onSuccess: PositionCallback;
  onError: PositionErrorCallback;
  onTimeout: () => void;
}

/**
 * Bounds the entire geolocation phase, including the permission prompt.
 * Cancellation suppresses callbacks because getCurrentPosition cannot abort.
 */
export function requestGeolocation({
  geolocation,
  signal,
  onSuccess,
  onError,
  onTimeout,
}: RequestGeolocationOptions): void {
  if (signal.aborted) {
    return;
  }

  let settled = false;
  const finish = () => {
    if (settled) {
      return false;
    }
    settled = true;
    clearTimeout(watchdog);
    signal.removeEventListener("abort", finish);
    return true;
  };
  const watchdog = setTimeout(() => {
    if (finish()) {
      onTimeout();
    }
  }, 15_000);
  signal.addEventListener("abort", finish, { once: true });

  try {
    geolocation.getCurrentPosition(
      (position) => {
        if (finish()) {
          onSuccess(position);
        }
      },
      (error) => {
        if (finish()) {
          onError(error);
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 5 * 60_000,
      },
    );
  } catch (error) {
    finish();
    throw error;
  }
}
