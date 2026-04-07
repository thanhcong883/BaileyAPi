const { test, expect } = require('@playwright/test');

test('Verify dashboard has sidebar, Add Account button and API Docs link', async ({ page }) => {
  await page.goto('http://localhost:3000/dashboard');
  await expect(page.locator('#sidebar')).toBeVisible();
  const addBtn = page.locator('#sidebar-header button');
  await expect(addBtn).toBeVisible();
  const docsLink = page.locator('a:has-text("API Docs")');
  await expect(docsLink).toBeVisible();
  await expect(docsLink).toHaveAttribute('href', '/api-docs/');
});

test('Verify adding and deleting an account', async ({ page }) => {
  await page.goto('http://localhost:3000/dashboard');
  const accountId = 'test_acc_' + Date.now();

  page.on('dialog', async dialog => {
    if (dialog.type() === 'prompt') {
      await dialog.accept(accountId);
    } else if (dialog.type() === 'confirm') {
      await dialog.accept();
    } else if (dialog.type() === 'alert') {
      await dialog.accept();
    }
  });

  await page.click('#sidebar-header button');
  await expect(page.locator('#active-account-id')).toContainText(accountId);
  await expect(page.locator(`#account-list .account-item:has-text("${accountId}")`)).toBeVisible();

  await page.click('button:has-text("Delete")');
  await expect(page.locator('#welcome-screen')).toBeVisible();
  await expect(page.locator(`#account-list .account-item:has-text("${accountId}")`)).not.toBeVisible();
});

test('Verify API Docs page loads', async ({ page }) => {
  await page.goto('http://localhost:3000/api-docs/');
  await expect(page).toHaveTitle(/Swagger UI/);
});
