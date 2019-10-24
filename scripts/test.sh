
if ganache_running; then
  echo "Using existing ganache instance"
else
  echo "Starting our own ganache instance"
  start_ganache
fi

npx truffle version

if [ "$MODE" = "coverage" ]; then
  npx truffle run coverage --solcoverjs .solcover.js
elif [ "$MODE" = "deploy" ]; then
  npx tsc --project ./tsconfig.json --outDir scripts/deploy && truffle exec scripts/deploy/index.js --network development
else
  npx truffle test
fi