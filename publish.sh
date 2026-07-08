set -euo pipefail

cd "$(dirname "$0")"

npm publish --auth-type=web
