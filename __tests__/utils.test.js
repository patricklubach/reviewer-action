/**
 * Unit tests for src/wait.js
 */
const { utils } = require('../src/utils')
const { expect } = require('@jest/globals')

test("Computed approvers", () => {
  expect(utils.computeApprovers([])).toBe([]);
})
