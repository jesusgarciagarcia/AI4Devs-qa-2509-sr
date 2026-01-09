import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the Dashboard Page
 * Provides reusable locators and methods for navigating from the dashboard
 */
export class DashboardPage {
    readonly page: Page;
    readonly addCandidateLink: Locator;
    readonly positionsLink: Locator;

    constructor(page: Page) {
        this.page = page;
        // Using button text-based locators since dashboard doesn't have data-testid yet
        this.addCandidateLink = page.getByRole('button', { name: /añadir nuevo candidato/i });
        this.positionsLink = page.getByRole('button', { name: /ir a posiciones/i });
    }

    /**
     * Navigate to the dashboard
     */
    async goto() {
        await this.page.goto('/');
    }

    /**
     * Navigate to positions page from dashboard
     */
    async goToPositions() {
        await this.positionsLink.click();
    }

    /**
     * Navigate to add candidate page from dashboard
     */
    async goToAddCandidate() {
        await this.addCandidateLink.click();
    }

    /**
     * Verify the dashboard is loaded correctly
     */
    async verifyPageLoaded() {
        await expect(this.page).toHaveURL('/');
        // Verify navigation cards are visible
        await expect(this.addCandidateLink).toBeVisible();
        await expect(this.positionsLink).toBeVisible();
    }
}
