import { useEffect, useState } from "react";
import { DirectionsScreen } from "../screens/directions";
import type { Room } from "../../shared/types";
import { Notice, Screen } from "../ui";
import { loadRooms } from "./loadRooms";
import type { DirectionsTarget } from "./types";

export interface DirectionsRouteProps {
  target: DirectionsTarget;
  accessNeeds?: string;
  onBack: () => void;
}

export function DirectionsRoute({ target, accessNeeds, onBack }: DirectionsRouteProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void loadRooms().then((loaded) => {
      if (!cancelled) {
        setRooms(loaded);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Screen heading="Directions" brand onBack={onBack} backLabel="Back to Today">
        <Notice tone="loading" title="Loading floor info">
          <p>Pulling room hints.</p>
        </Notice>
      </Screen>
    );
  }

  return (
    <DirectionsScreen
      sessionTitle={target.sessionTitle}
      sessionTime={target.sessionTime}
      roomName={target.roomName}
      rooms={rooms}
      onBack={onBack}
      accessNeeds={accessNeeds}
    />
  );
}
