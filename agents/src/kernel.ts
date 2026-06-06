// =============================================================================
// agents/src/kernel.ts
// Semantic Kernel Initialization
// =============================================================================

import { Kernel } from 'semantic-kernel';

import { MeetingPlugin } from './plugins/MeetingPlugin.js';
import { PlannerPlugin } from './plugins/PlannerPlugin.js';
import { EmailPlugin } from './plugins/EmailPlugin.js';
import { SearchPlugin } from './plugins/SearchPlugin.js';


/**
 * Initializes and exports a singleton Semantic Kernel instance.
 * Note: SK v0.3.0 is used here.
 */
let _kernel: Kernel | null = null;

export function getKernel(): Kernel {
  if (!_kernel) {
    _kernel = new Kernel();

    // Register Plugins
    (_kernel as any).importPlugin(new MeetingPlugin(), 'MeetingPlugin');
    (_kernel as any).importPlugin(new PlannerPlugin(), 'PlannerPlugin');
    (_kernel as any).importPlugin(new EmailPlugin(), 'EmailPlugin');
    (_kernel as any).importPlugin(new SearchPlugin(), 'SearchPlugin');

    console.log('Semantic Kernel initialized with plugins.');
  }
  return _kernel;
}

export const kernel = getKernel();
