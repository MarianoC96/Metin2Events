// ─── Bot Command Handlers Registration ──────────────────────────
// Registers all Telegram bot commands via grammY.
// Each handler delegates to domain services.

import { getBotInstance } from '../telegram-adapter';
import { registerStartCommand } from './start';
import { registerEventsCommand } from './events';
import { registerSubscribeCommand } from './subscribe';
import { registerHelpCommand } from './help';
import { registerLanguageCommand } from './language';
import { registerNextCommand } from './next';
import { registerClearCommand } from './clear';

/**
 * Registers all bot commands on the grammY Bot instance.
 * Call this once during webhook initialization.
 */
export function registerAllCommands(): void {
    const bot = getBotInstance();

    registerStartCommand(bot);
    registerEventsCommand(bot);
    registerSubscribeCommand(bot);
    registerNextCommand(bot);
    registerClearCommand(bot);
    registerLanguageCommand(bot);
    registerHelpCommand(bot);
}

