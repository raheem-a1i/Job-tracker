// Run a one-off refresh from the command line: `npm run refresh`.
import { runRefresh } from './pipeline.js';

runRefresh()
  .then((meta) => {
    console.log('\nRefresh complete:');
    console.log(JSON.stringify(meta, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Refresh failed:', err);
    process.exit(1);
  });
