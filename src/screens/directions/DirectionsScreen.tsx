import { useEffect, useState } from "react";
import { Screen } from "../../ui/Screen";
import { Stack } from "../../ui/Stack";
import type { Room } from "../../../shared/types";
import { loadFloorLevels } from "./floorLevels";
import {
  buildDirectionsContent,
  FLOOR_PLAN_LINK_LABEL,
  FLOOR_PLAN_PATH,
} from "./lookup";
import {
  DIRECTIONS_LINK_FOCUS,
  FLOOR_MAP_UNAVAILABLE,
  FROM_PREVIOUS_SESSION_LABEL,
  SUPPLEMENTARY_MAP_NOTE,
  WALKING_DIRECTIONS_LABEL,
} from "./a11y";
import {
  buildFromPreviousLine,
  floorImageAlt,
  formatRoomHeading,
  NOT_ON_SALT_PALACE_PLAN,
  pickFloorLevel,
  shouldShowSaltPalacePlan,
  type FloorLevelEntry,
} from "./wayfinding";

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
  /** Last done or past session room on today's plan, if known. */
  previousRoomName?: string;
}

export function DirectionsScreen({
  sessionTitle,
  sessionTime,
  roomName,
  rooms,
  onBack,
  accessNeeds,
  startingLandmark,
  previousRoomName,
}: DirectionsScreenProps) {
  const directions = buildDirectionsContent(rooms, roomName, accessNeeds);
  const headingLine = formatRoomHeading(roomName);
  const fromLine = buildFromPreviousLine(previousRoomName, roomName);
  const onSaltPalacePlan = shouldShowSaltPalacePlan(roomName);
  const [floorLevels, setFloorLevels] = useState<FloorLevelEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    void loadFloorLevels().then((levels) => {
      if (!cancelled) setFloorLevels(levels);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const levelImage = onSaltPalacePlan ? pickFloorLevel(roomName, floorLevels) : undefined;

  return (
    <Screen
      heading="Directions"
      brand
      onBack={onBack}
      backLabel="Back to Today"
      headerEnd={
        sessionTime ? (
          <>
            <span className="sr-only">Session time </span>
            {sessionTime}
          </>
        ) : undefined
      }
      lead={
        <p className="text-sm text-ink">
          <span className="text-muted">To </span>
          <span className="font-semibold">{sessionTitle}</span>
        </p>
      }
    >
      <section aria-label="Walking directions">
        <Stack gap="lg">
          <div>
            <h2 id="directions-destination" className="font-display text-lg font-semibold text-ink">
              Destination
            </h2>
            <h3 className="mt-2 text-base font-semibold leading-snug text-ink">{headingLine}</h3>
            {directions.landmark ? (
              <p className="mt-2 text-base leading-snug text-ink">
                <span className="text-sm font-semibold">Landmark </span>
                {directions.landmark}
              </p>
            ) : null}
          </div>

          {startingLandmark ? <StartingFrom startingLandmark={startingLandmark} /> : null}

          <WalkingRoute fromLine={fromLine} walkingText={directions.walkingText} />

          {directions.stepFreeText ? <StepFreeOption text={directions.stepFreeText} /> : null}

          <FloorPlanSection
            onSaltPalacePlan={onSaltPalacePlan}
            levelImage={levelImage}
            landmark={directions.landmark}
          />
        </Stack>
      </section>
    </Screen>
  );
}

function StartingFrom({ startingLandmark }: { startingLandmark: string }) {
  return (
    <div aria-labelledby="directions-starting-from">
      <h2 id="directions-starting-from" className="font-display text-lg font-semibold text-ink">
        Starting from
      </h2>
      <p className="mt-2 text-base leading-snug">{startingLandmark}</p>
      <p className="mt-1 text-sm text-muted">Hallpass does not track your live location.</p>
    </div>
  );
}

function WalkingRoute({
  fromLine,
  walkingText,
}: {
  fromLine?: string;
  walkingText: string;
}) {
  return (
    <div aria-labelledby="directions-walking-route">
      <h2 id="directions-walking-route" className="font-display text-lg font-semibold text-ink">
        Walking route
      </h2>
      {fromLine ? (
        <p className="mt-2 text-base leading-snug text-ink">
          <span className="text-sm font-semibold">{FROM_PREVIOUS_SESSION_LABEL} </span>
          {fromLine}
        </p>
      ) : null}
      <p className="mt-2 text-base leading-snug whitespace-pre-wrap text-ink">
        {fromLine ? (
          <>
            <span className="text-sm font-semibold">{WALKING_DIRECTIONS_LABEL} </span>
          </>
        ) : null}
        {walkingText}
      </p>
    </div>
  );
}

function StepFreeOption({ text }: { text: string }) {
  return (
    <div aria-labelledby="directions-step-free">
      <h2 id="directions-step-free" className="font-display text-lg font-semibold text-ink">
        Step-free option
      </h2>
      <p className="mt-2 text-base leading-snug whitespace-pre-wrap">{text}</p>
    </div>
  );
}

function FloorPlanSection({
  onSaltPalacePlan,
  levelImage,
  landmark,
}: {
  onSaltPalacePlan: boolean;
  levelImage?: FloorLevelEntry;
  landmark: string;
}) {
  return (
    <div aria-labelledby="directions-floor-plan">
      <h2 id="directions-floor-plan" className="font-display text-lg font-semibold text-ink">
        Supplementary floor plan
      </h2>
      {!onSaltPalacePlan ? (
        <p className="mt-2 text-base leading-snug text-ink">{NOT_ON_SALT_PALACE_PLAN}</p>
      ) : levelImage ? (
        <>
          <p className="mt-2 text-base leading-snug text-ink">{SUPPLEMENTARY_MAP_NOTE}</p>
          <div className="mt-3">
            <a
              href={levelImage.image}
              target="_blank"
              rel="noopener noreferrer"
              className={`block rounded-lg border border-line ${DIRECTIONS_LINK_FOCUS}`}
            >
              <img
                src={levelImage.image}
                alt={floorImageAlt(levelImage.alt, landmark)}
                className="w-full rounded-lg"
              />
              <span className="mt-2 block text-sm font-semibold text-action">
                Open full-size floor plan image (new tab)
              </span>
            </a>
          </div>
        </>
      ) : (
        <p className="mt-2 text-base leading-snug text-ink">{FLOOR_MAP_UNAVAILABLE}</p>
      )}
      <p className="mt-3 text-base leading-snug">
        <a
          href={FLOOR_PLAN_PATH}
          className={`font-semibold text-action underline underline-offset-2 ${DIRECTIONS_LINK_FOCUS}`}
        >
          {FLOOR_PLAN_LINK_LABEL}
        </a>
      </p>
    </div>
  );
}
