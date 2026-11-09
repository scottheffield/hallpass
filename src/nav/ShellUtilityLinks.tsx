import { Button } from "../ui";

export interface ShellUtilityLinksProps {
  onReadout: () => void;
  onInsights: () => void;
}

/** Secondary destinations that stay off the tab bar. */
export function ShellUtilityLinks({ onReadout, onInsights }: ShellUtilityLinksProps) {
  return (
    <nav aria-label="More conference views" className="mt-6 border-t border-line pt-4">
      <p className="text-sm text-muted">After the event or for organizers</p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
        <Button type="button" variant="quiet" onClick={onReadout}>
          Conference readout
        </Button>
        <Button type="button" variant="quiet" onClick={onInsights}>
          Organizer insights
        </Button>
      </div>
    </nav>
  );
}
