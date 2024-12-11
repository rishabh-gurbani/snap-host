#!/bin/bash

# Build the docker image
echo "Building Docker image..."
docker build -t snap-host-builder-image .

# Run the image with the first repository and project ID
# echo "Running image with react-boilerplate..."
docker run -it \
  --env GIT_REPOSITORY_URL="https://github.com/hkirat/react-boilerplate" \
  --env PROJECT_ID="p7" \
  snap-host-builder-image

# Run the image with the second repository and project ID
echo "Running image with test-repo..."
docker run -it \
  --env GIT_REPOSITORY_URL="https://github.com/rishabh-gurbani/test-repo" \
  --env PROJECT_ID="sec-test" \
  --env DEPLOYMENT_ID="sec_deployment" \
  --env-file .env.example \
  snap-host-builder-image

echo "Done!"