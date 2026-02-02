#!/bin/bash

echo "Starting npm publish..."
npm publish --tag beta --access public > publish.log 2>&1
EXIT_CODE=$?

echo "Exit code: $EXIT_CODE"
cat publish.log

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✓ Package published successfully!"
    echo ""
    echo "Verifying publication..."
    npm view @alethea/oracle-sdk@beta version
else
    echo ""
    echo "✗ Publication failed. Check publish.log for details."
fi

exit $EXIT_CODE
