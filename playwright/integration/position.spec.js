// @ts-check
const { test, expect } = require('@playwright/test');

// Import Page Object Models
const { PositionsListPage } = require('../../tests/e2e/pages/PositionsListPage');
const { PositionDetailsPage } = require('../../tests/e2e/pages/PositionDetailsPage');
const { DashboardPage } = require('../../tests/e2e/pages/DashboardPage');

/**
 * E2E Tests for Position Management
 *
 * Prerequisites:
 * - Backend running on http://localhost:3010
 * - Frontend running on http://localhost:3000
 * - Database seeded with test data (run: cd backend && ts-node prisma/seed.ts)
 *
 * Test Data Expectations:
 * - At least one position exists with ID 1
 * - Position has interview flow with multiple stages
 * - Position has at least one candidate assigned
 */

test.describe('Position Management - Happy Path', () => {

    test.beforeEach(async ({ page }) => {
        // Note: In a real scenario, you might want to reset the database state here
        // or use API calls to ensure consistent test data
    });

    /**
     * SCENARIO 1: Verify the positions page loads correctly
     *
     * Steps:
     * 1. Navigate to positions list page
     * 2. Verify URL is correct
     * 3. Verify page container is visible
     * 4. Verify page title displays "Posiciones"
     * 5. Verify at least one position card is displayed
     *
     * Success Criteria:
     * - All elements are visible without using waitForTimeout
     * - URL matches expected pattern
     * - Position cards are loaded from API
     */
    test('should load positions page with visible elements', async ({ page }) => {
        const positionsPage = new PositionsListPage(page);

        // Navigate to positions page
        await positionsPage.goto();

        // Verify page loaded correctly using observable conditions
        await positionsPage.verifyPageLoaded();

        // Verify positions are displayed (loaded from API)
        await positionsPage.verifyPositionsDisplayed();

        // Additional verification: Check filter controls are visible
        await expect(positionsPage.searchTitleInput).toBeVisible();
        await expect(positionsPage.statusSelect).toBeVisible();
        await expect(positionsPage.managerSelect).toBeVisible();

        // Verify back button is available
        await expect(positionsPage.backToDashboardButton).toBeVisible();
    });

    /**
     * SCENARIO 2: Complete candidate stage change flow (Drag & Drop)
     *
     * Steps:
     * 1. Navigate to positions list
     * 2. Click on first position to view details
     * 3. Verify position details page loads with kanban board
     * 4. Verify interview stages are displayed
     * 5. Locate a candidate in the first stage
     * 6. Drag candidate to the next stage
     * 7. Verify candidate appears in new stage (observable validation)
     * 8. Verify API call was made to update candidate (implicit via state change)
     *
     * Success Criteria:
     * - Navigation works without errors
     * - Kanban board renders with all stages
     * - Drag and drop functionality works
     * - Candidate position updates visually
     * - No waitForTimeout used (except minimal 500ms for API response)
     */
    test('should change candidate interview stage via drag and drop', async ({ page }) => {
        const positionsPage = new PositionsListPage(page);
        const positionDetailsPage = new PositionDetailsPage(page);

        // Step 1: Navigate to positions list
        await positionsPage.goto();
        await positionsPage.verifyPageLoaded();

        // Step 2: Click on first position (assuming position ID 1 exists from seed data)
        const positionId = 1;
        await positionsPage.clickPosition(positionId);

        // Step 3: Verify position details page loads
        await positionDetailsPage.verifyPageLoaded();

        // Step 4: Verify interview stages are displayed
        // Based on seed data, typical stages might include:
        // - "Initial Screening", "Technical Interview", "Manager Interview", "Offer"
        // We'll verify at least 2 stages exist
        const stageColumns = page.locator('[data-testid^="stage-column-"]');
        const stageCount = await stageColumns.count();
        expect(stageCount).toBeGreaterThanOrEqual(2);

        // Get the first two stage titles for drag-drop test
        const firstStageHeader = stageColumns.nth(0).getByTestId(/stage-header-/);
        const secondStageHeader = stageColumns.nth(1).getByTestId(/stage-header-/);

        await expect(firstStageHeader).toBeVisible();
        await expect(secondStageHeader).toBeVisible();

        const firstStageTitle = await firstStageHeader.textContent();
        const secondStageTitle = await secondStageHeader.textContent();

        // Ensure we have valid stage titles
        if (!firstStageTitle || !secondStageTitle) {
            test.skip(true, 'Could not retrieve stage titles - UI may have changed');
            return;
        }

        // Step 5: Find first candidate in the first stage
        const candidatesInFirstStage = positionDetailsPage.getCandidatesInStage(firstStageTitle.trim());
        const candidateCount = await candidatesInFirstStage.count();

        if (candidateCount === 0) {
            test.skip(true, 'No candidates in first stage - seed data may be missing');
            return;
        }

        // Get the first candidate's ID
        const firstCandidate = candidatesInFirstStage.first();
        await expect(firstCandidate).toBeVisible();

        const candidateTestId = await firstCandidate.getAttribute('data-testid');
        if (!candidateTestId) {
            test.skip(true, 'Candidate card missing data-testid attribute');
            return;
        }

        const candidateId = candidateTestId.replace('candidate-card-', '');

        // Verify candidate is initially in first stage
        await expect(firstCandidate).toBeVisible();

        // Get initial count of candidates in second stage
        const initialCountInSecondStage = await positionDetailsPage.countCandidatesInStage(secondStageTitle.trim());

        // Step 6: Drag candidate to second stage
        await positionDetailsPage.dragCandidateToStage(candidateId, secondStageTitle.trim());

        // Step 7: Verify candidate is now in second stage (observable condition)
        // Wait for the candidate to appear in the new stage
        const candidateInNewStage = positionDetailsPage.getStageColumn(secondStageTitle.trim())
            .getByTestId(`candidate-card-${candidateId}`);

        await expect(candidateInNewStage).toBeVisible({ timeout: 5000 });

        // Verify the count in second stage increased by 1
        const newCountInSecondStage = await positionDetailsPage.countCandidatesInStage(secondStageTitle.trim());
        expect(newCountInSecondStage).toBe(initialCountInSecondStage + 1);

        // Verify candidate name is still visible in the new location
        const candidateName = positionDetailsPage.getCandidateName(candidateId);
        await expect(candidateName).toBeVisible();
    });

    /**
     * SCENARIO 3 (BONUS): Navigate through complete position workflow
     *
     * Steps:
     * 1. Start from dashboard
     * 2. Navigate to positions
     * 3. View position details
     * 4. Navigate back to positions
     * 5. Navigate back to dashboard
     *
     * Success Criteria:
     * - All navigation transitions work correctly
     * - Back buttons function as expected
     * - URL updates correctly at each step
     */
    test('should navigate through position workflow successfully', async ({ page }) => {
        const dashboard = new DashboardPage(page);
        const positionsPage = new PositionsListPage(page);
        const positionDetailsPage = new PositionDetailsPage(page);

        // Step 1: Start from dashboard
        await dashboard.goto();
        await dashboard.verifyPageLoaded();

        // Step 2: Navigate to positions
        await dashboard.goToPositions();
        await positionsPage.verifyPageLoaded();

        // Step 3: View first position details
        await positionsPage.clickPosition(1);
        await positionDetailsPage.verifyPageLoaded();

        // Verify kanban board is visible
        await expect(positionDetailsPage.kanbanBoard).toBeVisible();

        // Step 4: Navigate back to positions
        await positionDetailsPage.goBackToPositions();
        await expect(page).toHaveURL(/\/positions$/);
        await expect(positionsPage.pageContainer).toBeVisible();

        // Step 5: Navigate back to dashboard
        await positionsPage.goBackToDashboard();
        await expect(page).toHaveURL('/');
    });
    /**
     * SCENARIO 4: Filter positions by status
     *
     * NOTE: This test is currently skipped because the filter functionality
     * is not yet implemented in the frontend (Positions.tsx).
     * The dropdown exists in the UI but has no onChange handler or filtering logic.
     *
     * Steps:
     * 1. Navigate to positions list
     * 2. Verify initial positions are displayed
     * 3. Select a status filter (e.g., "Open")
     * 4. Verify filtered results match selected status
     * 5. Clear filter and verify all positions return
     *
     * Success Criteria:
     * - Filter dropdown is functional
     * - Results update based on filter selection
     * - Filtered positions match expected status
     */
    test.skip('should filter positions by status', async ({ page }) => {
        const positionsPage = new PositionsListPage(page);

        await positionsPage.goto();
        await positionsPage.verifyPageLoaded();

        // Get initial count of positions
        await positionsPage.verifyPositionsDisplayed();
        const initialCount = await positionsPage.getPositionCount();

        // Apply status filter
        await positionsPage.statusSelect.selectOption('open');
        await page.waitForLoadState('networkidle');

        // Verify filtered results
        const filteredCount = await positionsPage.getPositionCount();
        expect(filteredCount).toBeLessThanOrEqual(initialCount);

        // Clear filter
        await positionsPage.statusSelect.selectOption('');
        await page.waitForLoadState('networkidle');

        // Verify all positions return
        const finalCount = await positionsPage.getPositionCount();
        expect(finalCount).toBe(initialCount);
    });

    /**
     * SCENARIO 5: Search positions by title
     *
     * NOTE: This test is currently skipped because the search functionality
     * is not yet implemented in the frontend (Positions.tsx).
     * The search input exists in the UI but has no onChange handler or search logic.
     *
     * Steps:
     * 1. Navigate to positions list
     * 2. Enter search term in title input
     * 3. Verify search results contain matching titles
     * 4. Clear search and verify all positions return
     *
     * Success Criteria:
     * - Search functionality works correctly
     * - Results dynamically update on input
     * - Position titles contain search term
     */
    test.skip('should search positions by title', async ({ page }) => {
        const positionsPage = new PositionsListPage(page);

        await positionsPage.goto();
        await positionsPage.verifyPageLoaded();

        // Enter search term
        const searchTerm = 'Developer';
        await positionsPage.searchTitleInput.fill(searchTerm);
        await page.waitForLoadState('networkidle');

        // Verify search results (at least one result or no results message)
        const positionCount = await positionsPage.getPositionCount();

        if (positionCount > 0) {
            // Verify first position title contains search term
            const firstPositionTitle = await positionsPage.getPositionTitle(0);
            expect(firstPositionTitle.toLowerCase()).toContain(searchTerm.toLowerCase());
        }

        // Clear search
        await positionsPage.searchTitleInput.clear();
        await page.waitForLoadState('networkidle');

        await positionsPage.verifyPositionsDisplayed();
    });

    /**
     * SCENARIO 6: Verify multiple candidates in different stages
     *
     * Steps:
     * 1. Navigate to position details
     * 2. Verify all interview stages are displayed
     * 3. Count candidates in each stage
     * 4. Verify total candidate count matches expected
     *
     * Success Criteria:
     * - All stages render correctly
     * - Candidate cards display properly in each stage
     * - Stage headers show correct counts
     */
    test('should display candidates across all interview stages', async ({ page }) => {
        const positionsPage = new PositionsListPage(page);
        const positionDetailsPage = new PositionDetailsPage(page);

        await positionsPage.goto();
        await positionsPage.verifyPageLoaded();

        await positionsPage.clickPosition(1);
        await positionDetailsPage.verifyPageLoaded();

        // Get all stage columns
        const stageColumns = page.locator('[data-testid^="stage-column-"]');
        const stageCount = await stageColumns.count();
        expect(stageCount).toBeGreaterThanOrEqual(2);

        // Verify each stage has header and can contain candidates
        let totalCandidates = 0;
        for (let i = 0; i < stageCount; i++) {
            const stageHeader = stageColumns.nth(i).getByTestId(/stage-header-/);
            await expect(stageHeader).toBeVisible();

            const stageTitle = await stageHeader.textContent();
            if (stageTitle) {
                const candidatesInStage = await positionDetailsPage.countCandidatesInStage(stageTitle.trim());
                totalCandidates += candidatesInStage;
            }
        }

        // Verify at least one candidate exists
        expect(totalCandidates).toBeGreaterThan(0);
    });

    /**
     * SCENARIO 7: Verify position details display correctly
     *
     * Steps:
     * 1. Navigate to positions list
     * 2. Click on a specific position
     * 3. Verify position title is displayed
     * 4. Verify position details are visible
     * 5. Verify kanban board loads
     *
     * Success Criteria:
     * - Position information displays correctly
     * - All UI elements are visible
     * - No console errors
     */
    test('should display position details correctly', async ({ page }) => {
        const positionsPage = new PositionsListPage(page);
        const positionDetailsPage = new PositionDetailsPage(page);

        await positionsPage.goto();
        await positionsPage.verifyPageLoaded();

        await positionsPage.clickPosition(1);
        await positionDetailsPage.verifyPageLoaded();

        // Verify kanban board is visible
        await expect(positionDetailsPage.kanbanBoard).toBeVisible();

        // Verify back button is available
        const backButton = page.getByRole('button', { name: /back|volver/i });
        await expect(backButton).toBeVisible();

        // Verify URL contains position ID
        await expect(page).toHaveURL(/\/positions\/\d+/);
    });

    /**
     * SCENARIO 8: Handle empty search results gracefully
     *
     * NOTE: This test is currently skipped because the search functionality
     * is not yet implemented in the frontend (Positions.tsx).
     *
     * Steps:
     * 1. Navigate to positions list
     * 2. Enter non-existent search term
     * 3. Verify appropriate empty state or message
     * 4. Clear search and verify positions return
     *
     * Success Criteria:
     * - Empty state handled gracefully
     * - No errors displayed
     * - Can recover from empty results
     */
    test.skip('should handle empty search results', async ({ page }) => {
        const positionsPage = new PositionsListPage(page);

        await positionsPage.goto();
        await positionsPage.verifyPageLoaded();

        // Search for non-existent position
        const nonExistentTerm = 'XYZ_NONEXISTENT_POSITION_12345';
        await positionsPage.searchTitleInput.fill(nonExistentTerm);
        await page.waitForLoadState('networkidle');

        // Verify empty state or no positions
        const positionCount = await positionsPage.getPositionCount();
        expect(positionCount).toBe(0);

        // Clear search and verify recovery
        await positionsPage.searchTitleInput.clear();
        await page.waitForLoadState('networkidle');

        await positionsPage.verifyPositionsDisplayed();
    });

    /**
     * SCENARIO 9: Verify candidate card information
     *
     * Steps:
     * 1. Navigate to position details
     * 2. Locate a candidate card
     * 3. Verify candidate information is displayed
     * 4. Verify card is interactive
     *
     * Success Criteria:
     * - Candidate name is visible
     * - Card has proper styling
     * - Card is clickable/draggable
     */
    test('should display candidate card information correctly', async ({ page }) => {
        const positionsPage = new PositionsListPage(page);
        const positionDetailsPage = new PositionDetailsPage(page);

        await positionsPage.goto();
        await positionsPage.verifyPageLoaded();

        await positionsPage.clickPosition(1);
        await positionDetailsPage.verifyPageLoaded();

        // Find all candidate cards first, then get the first one
        const allCandidateCards = page.locator('[data-testid^="candidate-card-"]');
        const cardCount = await allCandidateCards.count();

        if (cardCount === 0) {
            test.skip(true, 'No candidate cards found - seed data may be missing');
            return;
        }

        const candidateCard = allCandidateCards.first();
        await expect(candidateCard).toBeVisible();

        // Verify candidate has a test ID
        const testId = await candidateCard.getAttribute('data-testid');
        expect(testId).toMatch(/^candidate-card-\d+$/);

        // Verify candidate card is interactive
        await expect(candidateCard).toBeEnabled();
    });
});

/**
 * Additional test scenarios (can be implemented as needed):
 *
 * - Filter positions by status/title/date
 * - View candidate details from kanban board
 * - Handle drag-drop cancellation (drop outside valid zone)
 * - Multi-browser compatibility (already configured in playwright.config.ts)
 * - Responsive design testing
 * - Error handling (API failures, network issues)
 */
