const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const files = execSync('grep -rn "from \'~/types\'" app/ | cut -d: -f1').toString().split('\n').filter(Boolean);
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/from '~\/types'/g, "from '~/core/types'");
  fs.writeFileSync(file, content);
});

const files2 = execSync('grep -rn "from \'~/composables/" app/ | cut -d: -f1').toString().split('\n').filter(Boolean);
files2.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/from '~\/composables\/usePublicCart'/g, "from '~/features/storefront/composables/usePublicCart'");
  content = content.replace(/from '~\/composables\/useStorefront'/g, "from '~/features/storefront/composables/useStorefront'");
  content = content.replace(/from '~\/composables\/useStockMovements'/g, "from '~/features/stock/composables/useStockMovements'");
  fs.writeFileSync(file, content);
});
console.log('done');
