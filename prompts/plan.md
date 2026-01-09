# Plan: Playwright E2E Testing Integration for LTI

Integrate Playwright into the LTI talent tracking system to provide comprehensive E2E test coverage for critical user flows including candidate management, position pipeline, and drag-and-drop stage transitions. Configuration will target local development environment (`http://localhost:3000`) with evidence capture and HTML reporting.

## Steps

### 1. Install and configure Playwright at project root

- Add `@playwright/test` as dev dependency
- Create `playwright.config.ts` with `baseURL: http://localhost:3000`, projects for chromium/firefox/webkit, screenshot/trace on failure
- Install browsers via `npx playwright install`
- Add scripts to root `package.json`: `test:e2e`, `test:e2e:ui`, `test:e2e:report`

### 2. Create test structure and Page Object Models

- Create `/playwright/integration/position.spec.js` (required location per prompt)
- Create optional helpers in `/tests/e2e/pages/` for `PositionDetailsPage.ts`, `PositionsListPage.ts`, `DashboardPage.ts`
- Establish pattern for data-testid selectors or accessible role-based locators

### 3. Implement position.spec.js with 2+ happy path scenarios

- Scenario 1: Verify positions page loads correctly (URL validation, visible elements using `expect(locator).toBeVisible()`)
- Scenario 2: Drag-and-drop candidate stage change flow (navigate → locate candidate → drag to new stage → validate state change with observable conditions)
- Use `waitFor`, `toBeVisible`, `toHaveURL`, `toContainText` instead of `waitForTimeout`

### 4. Configure evidence and reporting

- Enable screenshot capture on failure in `use.screenshot: 'only-on-failure'`
- Enable trace on first retry: `trace: 'on-first-retry'`
- Configure HTML reporter with output to `playwright-report/`
- Add `.gitignore` entries for reports, traces, screenshots

### 5. Document execution and test data setup

- Add README section with commands: `npx playwright test`, `npx playwright show-report`
- Document dependency on backend/frontend running (`npm start` in both folders) and database seeded
- Note selectivity for `data-testid` additions to `frontend/src/components/PositionDetails.js`, `StageColumn.js`, `CandidateCard.js`

## Further Considerations

### 1. Drag-and-drop testing complexity

`react-beautiful-dnd` may require Playwright's `dragTo()` or manual mouse events; validate approach with Position pipeline kanban board or use alternative locator.dragTo(target) strategy

### 2. Test data isolation

Should tests rely on existing `backend/prisma/seed.ts` data, or create dedicated fixtures? Recommend documenting expected seed data state or adding API-based test setup

### 3. Selector stability

Frontend currently lacks `data-testid` attributes; proceed with `getByRole`/`getByText` or propose adding testids to `PositionDetails.js`, `CandidateCard.js`?
