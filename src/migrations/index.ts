import * as migration_20261120_185240_initial from './20261120_185240_initial';

export const migrations = [
  {
    up: migration_20261120_185240_initial.up,
    down: migration_20261120_185240_initial.down,
    name: '20261120_185240_initial'
  },
];
