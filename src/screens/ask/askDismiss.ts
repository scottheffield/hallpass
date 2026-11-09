/** Whether backdrop dismiss and Escape should be ignored while a reply is in progress. */
export function shouldBlockAskDismiss(input: {
  sending: boolean;
  liveTextLength: number;
}): boolean {
  return input.sending || input.liveTextLength > 0;
}
