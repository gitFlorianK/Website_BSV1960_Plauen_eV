import * as migration_20261120_185240_initial from './20261120_185240_initial';
import * as migration_20261120_193955_phase3_frontend from './20261120_193955_phase3_frontend';
import * as migration_20261120_201032_phase4_forms from './20261120_201032_phase4_forms';
import * as migration_20261121_041514_phase5_members from './20261121_041514_phase5_members';
import * as migration_20261121_045329_phase6_security from './20261121_045329_phase6_security';
import * as migration_20261121_051437_phase7_content from './20261121_051437_phase7_content';
import * as migration_20261121_131747_r5_two_factor_moved from './20261121_131747_r5_two_factor_moved';

export const migrations = [
  {
    up: migration_20261120_185240_initial.up,
    down: migration_20261120_185240_initial.down,
    name: '20261120_185240_initial',
  },
  {
    up: migration_20261120_193955_phase3_frontend.up,
    down: migration_20261120_193955_phase3_frontend.down,
    name: '20261120_193955_phase3_frontend',
  },
  {
    up: migration_20261120_201032_phase4_forms.up,
    down: migration_20261120_201032_phase4_forms.down,
    name: '20261120_201032_phase4_forms',
  },
  {
    up: migration_20261121_041514_phase5_members.up,
    down: migration_20261121_041514_phase5_members.down,
    name: '20261121_041514_phase5_members',
  },
  {
    up: migration_20261121_045329_phase6_security.up,
    down: migration_20261121_045329_phase6_security.down,
    name: '20261121_045329_phase6_security',
  },
  {
    up: migration_20261121_051437_phase7_content.up,
    down: migration_20261121_051437_phase7_content.down,
    name: '20261121_051437_phase7_content',
  },
  {
    up: migration_20261121_131747_r5_two_factor_moved.up,
    down: migration_20261121_131747_r5_two_factor_moved.down,
    name: '20261121_131747_r5_two_factor_moved'
  },
];
