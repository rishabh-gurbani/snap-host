#!/bin/bash

# Allow DNS traffic for builduser (IPv4)
iptables -A OUTPUT -m owner --uid-owner builduser -p udp --dport 53 -j ACCEPT
iptables -A OUTPUT -m owner --uid-owner builduser -p tcp --dport 53 -j ACCEPT

# Allow DNS traffic for builduser (IPv6)
ip6tables -A OUTPUT -m owner --uid-owner builduser -p udp --dport 53 -j ACCEPT 2>/dev/null || true
ip6tables -A OUTPUT -m owner --uid-owner builduser -p tcp --dport 53 -j ACCEPT 2>/dev/null || true

# Dynamically resolve and allow npm registry IPs
NPM_REGISTRY_DOMAIN="registry.npmjs.org"

# Get IPv4 addresses
IPV4_ADDRESSES=$(getent ahostsv4 $NPM_REGISTRY_DOMAIN | awk '{print $1}' | sort -u)

# Get IPv6 addresses
IPV6_ADDRESSES=$(getent ahostsv6 $NPM_REGISTRY_DOMAIN | awk '{print $1}' | sort -u)

if [ -z "$IPV4_ADDRESSES" ] && [ -z "$IPV6_ADDRESSES" ]; then
    echo "Failed to resolve NPM registry IPs"
    exit 1
fi

# Add IPv4 rules
for ip in $IPV4_ADDRESSES; do
    iptables -A OUTPUT -m owner --uid-owner builduser -d $ip -j ACCEPT
done

# Add IPv6 rules
for ip in $IPV6_ADDRESSES; do
    ip6tables -A OUTPUT -m owner --uid-owner builduser -d $ip -j ACCEPT 2>/dev/null || true
done

# Block all other traffic for builduser (IPv4)
iptables -A OUTPUT -m owner --uid-owner builduser -j DROP

# Block all other traffic for builduser (IPv6)
ip6tables -A OUTPUT -m owner --uid-owner builduser -j DROP 2>/dev/null || true

# Execute the passed command
exec "$@"
