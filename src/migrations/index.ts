import * as migration_20261120_185240_initial from './20261120_185240_initial';
import * as migration_20261120_193955_phase3_frontend from './20261120_193955_phase3_frontend';

export const migrations = [
  {
    up: migration_20261120_185240_initial.up,
    down: migration_20261120_185240_initial.down,
    name: '20261120_185240_initial',
  },
  {
    up: migration_20261120_193955_phase3_frontend.up,
    down: migration_20261120_193955_phase3_frontend.down,
    name: '20261120_193955_phase3_frontend'
  },
];
