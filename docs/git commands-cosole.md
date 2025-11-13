For Emulators
pnpm run emulators:start

FOR FUNCTIONS ONLY
pnpm run emulators:start:functions
$env:NO_PROXY='localhost,127.0.0.1'; firebase deploy --only functions --project umoyo-health-hub --debug 
cd 'F:\Mobile Apps\umoyo-health-hub\umoyo-health-hub' ; $env:NO_PROXY='localhost,127.0.0.1'; firebase deploy --only functions --project umoyo-health-hub --debug

pnpm run ingest-from-bucket


firebase emulators:start
firebase emulators:start --only functions
#killing ports
taskkill /PID 29796 /F
