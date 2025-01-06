FROM ubuntu:focal

# Combine apt-get commands to minimize layers and cleanup afterwards to reduce image size
RUN apt-get update && \
    apt-get install -y curl git && \
    curl -sL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get upgrade -y && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create build user and set up directories
RUN useradd -m -d /home/build builduser && \
    mkdir -p /home/app && \
    mkdir -p /home/build/output && \
    mkdir -p /home/build/.npm && \
    chown builduser:builduser /home/build/output && \
    chown -R builduser:builduser /home/build/.npm

WORKDIR /home/app

COPY package*.json ./
COPY tsconfig.json ./
RUN npm install

COPY script.ts ./

# Set proper permissions
RUN chown -R root:root /home/app && \
    chmod 700 /home/app

ENTRYPOINT ["npx", "tsx", "script.ts"]