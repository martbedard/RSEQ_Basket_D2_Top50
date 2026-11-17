import {defineConfig} from '@playwright/test';
export default defineConfig({
  testMatch:'**/tests/ui.spec.mjs',
  webServer:{command:'python3 -m http.server 8134 --bind 127.0.0.1 --directory site',url:'http://127.0.0.1:8134',reuseExistingServer:false},
  use:{baseURL:'http://127.0.0.1:8134',channel:process.env.CHROME_CHANNEL || undefined},
  projects:[{name:'ordinateur',use:{viewport:{width:1440,height:900}}},
            {name:'téléphone',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}}]
});
