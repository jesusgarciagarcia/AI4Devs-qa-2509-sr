import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the Position Details Page (Kanban Board)
 * Provides reusable locators and methods for interacting with the candidate pipeline
 */
export class PositionDetailsPage {
    readonly page: Page;
    readonly pageContainer: Locator;
    readonly positionName: Locator;
    readonly backToPositionsButton: Locator;
    readonly kanbanBoard: Locator;

    constructor(page: Page) {
        this.page = page;
        this.pageContainer = page.getByTestId('position-details-page');
        this.positionName = page.getByTestId('position-name');
        this.backToPositionsButton = page.getByTestId('back-to-positions-btn');
        this.kanbanBoard = page.getByTestId('kanban-board');
    }

    /**
     * Navigate to a position details page by ID
     */
    async goto(positionId: number) {
        await this.page.goto(`/positions/${positionId}`);
    }

    /**
     * Get a stage column by its title (kebab-case)
     * Example: "Initial Screening" -> "initial-screening"
     */
    getStageColumn(stageTitle: string): Locator {
        const kebabCase = stageTitle.toLowerCase().replace(/\s+/g, '-');
        return this.page.getByTestId(`stage-column-${kebabCase}`);
    }

    /**
     * Get a stage header by its title (kebab-case)
     */
    getStageHeader(stageTitle: string): Locator {
        const kebabCase = stageTitle.toLowerCase().replace(/\s+/g, '-');
        return this.page.getByTestId(`stage-header-${kebabCase}`);
    }

    /**
     * Get a candidate card by candidate ID
     */
    getCandidateCard(candidateId: string | number): Locator {
        return this.page.getByTestId(`candidate-card-${candidateId}`);
    }

    /**
     * Get a candidate name by candidate ID
     */
    getCandidateName(candidateId: string | number): Locator {
        return this.page.getByTestId(`candidate-name-${candidateId}`);
    }

    /**
     * Verify the position details page is loaded correctly
     */
    async verifyPageLoaded(expectedPositionName?: string) {
        await expect(this.page).toHaveURL(/\/positions\/\d+/);
        await expect(this.pageContainer).toBeVisible();
        await expect(this.kanbanBoard).toBeVisible();

        if (expectedPositionName) {
            await expect(this.positionName).toHaveText(expectedPositionName);
        }
    }

    /**
     * Verify a stage column exists and is visible
     */
    async verifyStageExists(stageTitle: string) {
        const column = this.getStageColumn(stageTitle);
        await expect(column).toBeVisible();

        const header = this.getStageHeader(stageTitle);
        await expect(header).toBeVisible();
        await expect(header).toContainText(stageTitle);
    }

    /**
     * Verify multiple stages exist in order
     */
    async verifyStagesExist(stageTitles: string[]) {
        for (const title of stageTitles) {
            await this.verifyStageExists(title);
        }
    }

    /**
     * Check if a candidate is in a specific stage
     */
    async verifyCandidateInStage(candidateId: string | number, stageTitle: string) {
        const stageColumn = this.getStageColumn(stageTitle);
        const candidateCard = this.getCandidateCard(candidateId);

        // Wait for both to be visible
        await expect(stageColumn).toBeVisible();
        await expect(candidateCard).toBeVisible();

        // Verify the candidate card is within the stage column
        const isInStage = await candidateCard.locator('..').locator('..').locator('..').evaluate(
            (el, stage) => {
                return el.closest(`[data-testid="${stage}"]`) !== null;
            },
            `stage-column-${stageTitle.toLowerCase().replace(/\s+/g, '-')}`
        );

        expect(isInStage).toBe(true);
    }

    /**
     * Drag and drop a candidate from one stage to another
     * Uses native mouse events for react-beautiful-dnd compatibility
     */
    async dragCandidateToStage(candidateId: string | number, targetStageTitle: string) {
        const candidateCard = this.getCandidateCard(candidateId);
        const targetStage = this.getStageColumn(targetStageTitle);

        await expect(candidateCard).toBeVisible();
        await expect(targetStage).toBeVisible();

        // Get bounding boxes
        const sourceBox = await candidateCard.boundingBox();
        const targetBox = await targetStage.boundingBox();

        if (!sourceBox || !targetBox) {
            throw new Error('Cannot get bounding boxes for drag and drop');
        }

        // Calculate center points
        const sourceX = sourceBox.x + sourceBox.width / 2;
        const sourceY = sourceBox.y + sourceBox.height / 2;
        const targetX = targetBox.x + targetBox.width / 2;
        const targetY = targetBox.y + 50; // Drop near top of column

        // Perform drag with native mouse events
        await this.page.mouse.move(sourceX, sourceY);
        await this.page.mouse.down();
        await this.page.mouse.move(targetX, targetY, { steps: 10 });
        await this.page.waitForTimeout(100); // Brief pause before drop
        await this.page.mouse.up();

        // Wait for API call and state update
        await this.page.waitForTimeout(800);
    }

    /**
     * Click on a candidate card to open details
     */
    async clickCandidate(candidateId: string | number) {
        const card = this.getCandidateCard(candidateId);
        await expect(card).toBeVisible();
        await card.click();
    }

    /**
     * Navigate back to positions list
     */
    async goBackToPositions() {
        await this.backToPositionsButton.click();
    }

    /**
     * Get all candidates in a specific stage
     */
    getCandidatesInStage(stageTitle: string): Locator {
        const stageColumn = this.getStageColumn(stageTitle);
        return stageColumn.locator('[data-testid^="candidate-card-"]');
    }

    /**
     * Count candidates in a specific stage
     */
    async countCandidatesInStage(stageTitle: string): Promise<number> {
        const candidates = this.getCandidatesInStage(stageTitle);
        return await candidates.count();
    }
}
