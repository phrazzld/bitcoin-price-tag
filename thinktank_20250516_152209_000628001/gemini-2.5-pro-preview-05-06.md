## Chosen Approach
Refactor `service-worker/index.ts` to export event handlers for direct testing, mocking only Chrome APIs and network requests, and using actual `cache.ts` and `api.ts` implementations reliant on these mocks.

## Rationale
- **Simplicity:** Exporting handlers allows direct invocation in tests, simplifying test structure and comprehension compared to capturing them from event listeners.
- **Modularity + Strict Separation:** This approach treats handlers as modular, testable units. It strictly adheres to the separation of concerns by using real internal collaborators (`cache.ts`, `api.ts`) and mocking only true external dependencies (Chrome APIs, network layer via `fetch`/`msw`).
- **Testability (Minimal Mocking):** Achieves high testability by directly testing the "public API" of the service worker (its handlers). It respects the critical "NO mocking internal collaborators" policy, ensuring tests verify the actual interaction logic with `cache.ts` and `api.ts`.
- **Coding Standards:** The minor refactoring to export handlers aligns with the "Design for Testability" principle, where difficulty in testing signals a need to refactor the code under test. Tests will follow FIRST principles.
- **Coverage & Verification:** Enables thorough testing of various scenarios, error conditions, and edge cases within handlers, facilitating the >80% coverage target and robust behavior verification.

## Build Steps

1.  **Refactor `service-worker/index.ts`:**
    *   Identify the core logic within each Chrome event listener callback (e.g., `chrome.runtime.onInstalled.addListener(async (details) => { /* logic */ })`).
    *   Extract this logic into named, exported functions. For example:
        ```typescript
        // service-worker/index.ts
        import * as cache from './cache';
        import * as api from './api';

        export async function handleInstall(details: chrome.runtime.InstalledDetails): Promise<void> {
          if (details.reason === 'install') {
            await cache.initializeCache();
            await api.registerInstallation();
          }
          // ... other install/update logic
        }

        export function handleMessage(
          message: any,
          sender: chrome.runtime.MessageSender,
          sendResponse: (response?: any) => void
        ): boolean | undefined {
          if (message.type === 'GET_DATA') {
            // ... logic using cache.ts