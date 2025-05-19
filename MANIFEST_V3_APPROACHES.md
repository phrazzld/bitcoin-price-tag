# Migrating to Manifest V3: Technical Approaches

This document outlines multiple technical approaches for migrating the Bitcoin Price Tag Chrome extension from Manifest V2 to Manifest V3, ranging from conventional to innovative "Gordian Knot" solutions.

## Deep Problem Analysis

The migration to Manifest V3 involves adapting to fundamental architectural changes:

- **Execution Model Shift:** From persistent background scripts to ephemeral Service Workers
- **State Management:** Handling BTC price data without relying on long-lived globals
- **API & Permission Changes:** Adapting to MV3's stricter permission model
- **Communication:** Ensuring robust messaging between Service Worker and content scripts
- **Functionality Preservation:** Maintaining the core price annotation functionality

## Solution Approaches

### Conventional Approaches

#### A. Direct Minimal V3 Port
- **Summary:** Minimal changes to get the extension working under MV3
- **Implementation:**
  - Update manifest.json to V3 format
  - Create basic service-worker.js
  - Move fetch call from content.js to Service Worker
  - Implement basic message passing
- **Advantages:** Fastest path to V3 compliance
- **Drawbacks:** Perpetuates existing architectural issues

#### B. Service Worker as a Caching API Layer
- **Summary:** Service Worker becomes central point for fetching/caching BTC price
- **Implementation:**
  - SW fetches price periodically (via chrome.alarms)
  - SW caches price in chrome.storage
  - Content scripts request price data from SW
  - SW serves from cache or fetches if stale
- **Advantages:** Good separation of concerns, improved performance through caching
- **Drawbacks:** More complex implementation

#### C. Phased Migration
- **Summary:** Achieve basic MV3 compliance quickly, then iteratively improve
- **Implementation:**
  - Phase 1: Minimal functional V3 port
  - Phase 2: Implement caching, refactor for modularity
- **Advantages:** Reduces initial risk, allows for learning
- **Drawbacks:** Technical debt if Phase 2 is delayed

### Alternative Paradigms

#### D. Storage-Centric Approach
- **Summary:** Use chrome.storage as the primary state bus
- **Implementation:**
  - SW fetches price and writes to chrome.storage.local
  - Content scripts read directly from storage
  - Content scripts use chrome.storage.onChanged to react to updates
- **Advantages:** Decouples content script from direct SW interaction
- **Drawbacks:** Storage I/O overhead, timing nuances

### Innovative "Gordian Knot" Solutions

#### E. Content Script Direct Fetch
- **Summary:** Keep fetch in content script, minimal Service Worker
- **Implementation:**
  - Configure host_permissions for api.coingecko.com
  - Keep fetch logic in content.js
  - Minimal Service Worker implementation
- **Advantages:** Minimal architectural change
- **Drawbacks:** Redundant API calls, doesn't centralize fetching

#### F. Service Worker Orchestrates DOM Info
- **Summary:** Push more logic to Service Worker
- **Implementation:**
  - Content script identifies text nodes, sends to SW
  - SW performs price detection and conversion
  - SW sends back instructions for DOM updates
- **Advantages:** Centralizes business logic in testable SW
- **Drawbacks:** Complex implementation, potential performance issues

#### G. External Price Service/CDN
- **Summary:** Use external service for BTC price instead of direct API calls
- **Implementation:**
  - Set up or use dedicated caching proxy/CDN for BTC price
  - Extension fetches from this endpoint
- **Advantages:** Offloads API concerns, potentially faster/more reliable
- **Drawbacks:** External dependency, operational overhead

## Recommended Approach

**B. Service Worker as a Caching API Layer** (incorporating elements of the Storage-Centric Approach for state persistence)

This approach:
1. Fully satisfies MV3 compliance requirements
2. Aligns with development philosophy (Modularity, Testability, Explicit over Implicit)
3. Provides robust performance through centralized caching
4. Creates a maintainable and extensible architecture
5. Balances implementation effort with long-term value

### Critical Success Factors
1. Well-defined SW <-> CS messaging contract (using TypeScript interfaces)
2. Robust caching using chrome.storage.local with TTL logic
3. Comprehensive error handling
4. TypeScript implementation for type safety
5. Unit tests for SW logic, basic integration tests for communication