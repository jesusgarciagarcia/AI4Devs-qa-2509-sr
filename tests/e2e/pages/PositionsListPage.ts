import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the Positions List Page
 * Provides reusable locators and methods for interacting with the positions list
 */
export class PositionsListPage {
    readonly page: Page;
    readonly pageContainer: Locator;
    readonly pageTitle: Locator;
    readonly backToDashboardButton: Locator;
    readonly positionsList: Locator;
    readonly searchTitleInput: Locator;
    readonly searchDateInput: Locator;
    readonly statusSelect: Locator;
    readonly managerSelect: Locator;

    constructor(page: Page) {
        this.page = page;
        this.pageContainer = page.getByTestId('positions-page');
        this.pageTitle = page.getByTestId('positions-title');
        this.backToDashboardButton = page.getByTestId('back-to-dashboard-btn');
        this.positionsList = page.getByTestId('positions-list');
        this.searchTitleInput = page.getByPlaceholder('Buscar por título');
        this.searchDateInput = page.locator('input[type="date"]');
        this.statusSelect = page.locator('select').filter({ hasText: 'Estado' });
        this.managerSelect = page.locator('select').filter({ hasText: 'Manager' });
    }

    /**
     * Navigate to the positions list page
     */
    async goto() {
        await this.page.goto('/positions');
    }

    /**
     * Get a position card by its ID
     */
    getPositionCard(positionId: number): Locator {
        return this.page.getByTestId(`position-card-${positionId}`);
    }

    /**
     * Click on a position card to navigate to its details
     * Clicks the "Ver proceso" button within the position card
     */
    async clickPosition(positionId: number) {
        const card = this.getPositionCard(positionId);
        await expect(card).toBeVisible();

        // Click the "Ver proceso" button within the card
        const viewButton = card.getByRole('button', { name: /ver proceso/i });
        await expect(viewButton).toBeVisible();
        await viewButton.click();
    }

    /**
     * Verify the positions page is loaded correctly
     */
    async verifyPageLoaded() {
        await expect(this.page).toHaveURL(/\/positions/);
        await expect(this.pageContainer).toBeVisible();
        await expect(this.pageTitle).toBeVisible();
        await expect(this.pageTitle).toHaveText('Posiciones');
    }

    /**
     * Verify at least one position is displayed
     */
    async verifyPositionsDisplayed() {
        await expect(this.positionsList).toBeVisible();
        const positionCards = this.page.locator('[data-testid^="position-card-"]');
        await expect(positionCards.first()).toBeVisible();
    }

    /**
     * Search for positions by title
     */
    async searchByTitle(title: string) {
        await this.searchTitleInput.fill(title);
    }

    /**
     * Filter positions by status
     */
    async filterByStatus(status: 'open' | 'filled' | 'closed' | 'draft') {
        await this.statusSelect.selectOption({ value: status });
    }

    /**
     * Navigate back to dashboard
     */
    async goBackToDashboard() {
        await this.backToDashboardButton.click();
    }

    /**
     * Get the count of position cards currently displayed
     */
    async getPositionCount(): Promise<number> {
        const positionCards = this.page.locator('[data-testid^="position-card-"]');
        return await positionCards.count();
    }

    /**
     * Get the title of a position by its index
     * @param index - Zero-based index of the position card
     */
    async getPositionTitle(index: number): Promise<string> {
        const positionCards = this.page.locator('[data-testid^="position-card-"]');
        const card = positionCards.nth(index);
        await expect(card).toBeVisible();

        // The title is typically in a Card.Title or heading element
        const titleLocator = card.locator('.card-title, h5, h4').first();
        const title = await titleLocator.textContent();
        return title?.trim() || '';
    }
}
