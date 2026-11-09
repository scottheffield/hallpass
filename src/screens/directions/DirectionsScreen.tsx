import { Screen } from "../../ui/Screen";
import { Stack } from "../../ui/Stack";
import type { Room } from "../../../shared/types";
import {
  buildDirectionsContent,
  FLOOR_PLAN_LINK_LABEL,
  FLOOR_PLAN_PATH,
} from "./lookup";

export interface DirectionsScreenProps {
  /** Session title for context above the route. */
  sessionTitle: string;
  /** e.g. 10:00–10:40 */
  sessionTime?: string;
  /** Matches Session.room and Room.name in rooms.json. */
  roomName: string;
  rooms: Room[];
  onBack?: () => void;
  /** When set, step-free text appears only if this mentions step-free and the room has a hint. */
  accessNeeds?: string;
  /** Optional starting landmark when the attendee chose one (no live location). */
  startingLandmark?: string;
}

export function DirectionsScreen({
  sessionTitle,
  sessionTime,
  roomName,
  rooms,
  onBack,
  accessNeeds,
  startingLandmark,
}: DirectionsScreenProps) {
  const directions = buildDirectionsContent(rooms, roomName, accessNeeds);

  return (
    <Screen
      heading="Directions"
      brand
      onBack={onBack}
      backLabel="Back to Today"
      headerEnd={sessionTime}
      lead={
        <p className="text-sm text-muted">
          To <span className="font-semibold text-ink">{sessionTitle}</span>
        </p>
      }
    >
      <Stack gap="lg" as="section" aria-label="Walking directions">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Destination</h2>
          <dl className="mt-2 space-y-1 text-base leading-snug">
            <div>
              <dt className="sr-only">Room</dt>
              <dd className="font-semibold text-ink">{directions.roomName}</dd>
            </div>
            {directions.level ? (
              <div>
                <dt className="text-sm font-semibold text-muted">Level</dt>
                <dd>{directions.level}</dd>
              </div>
            ) : null}
            {directions.landmark ? (
              <div>
                <dt className="text-sm font-semibold text-muted">Landmark</dt>
                <dd>{directions.landmark}</dd>
              </div>
            ) : null}
          </dl>
        </div>

        {startingLandmark ? <StartingFrom startingLandmark={startingLandmark} /> : null}

        <WalkingRoute directions={directions} />

        {directions.stepFreeText ? <StepFreeOption text={directions.stepFreeText} /> : null}

        <SupplementaryFloorPlan />
      </Stack>
    </Screen>
  );
}

function StartingFrom({ startingLandmark }: { startingLandmark: string }) {
  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-ink">Starting from</h2>
      <p className="mt-2 text-base leading-snug">{startingLandmark}</p>
      <p className="mt-1 text-sm text-muted">Hallpass does not track your live location.</p>
    </div>
  );
}

function WalkingRoute({ directions }: { directions: ReturnType<typeof buildDirectionsContent> }) {
  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-ink">Walking route</h2>
      <p className="mt-2 text-base leading-snug whitespace-pre-wrap">{directions.walkingText}</p>
    </div>
  );
}

function StepFreeOption({ text }: { text: string }) {
  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-ink">Step-free option</h2>
      <p className="mt-2 text-base leading-snug whitespace-pre-wrap">{text}</p>
    </div>
  );
}

function SupplementaryFloorPlan() {
  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-ink">Supplementary floor plan</h2>
      <p className="mt-2 text-base leading-snug">
        The map below is optional. Follow the text directions above first.
      </p>
      <p className="mt-2">
        <a
          href={FLOOR_PLAN_PATH}
          className="font-semibold text-action underline underline-offset-2"
        >
          {FLOOR_PLAN_LINK_LABEL}
        </a>
      </p>
    </div>
  );
}
