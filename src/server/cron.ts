import { Cron } from 'croner';

export function startCronJobs(
  players: Map<string, { client: unknown | null }>,
) {
  // Every day at midnight, remove disconnected players
  return new Cron('0 0 * * *', { timezone: 'America/New_York' }, () => {
    for (const [id, player] of players) {
      if (!player.client) {
        players.delete(id);
      }
    }
  });
}
