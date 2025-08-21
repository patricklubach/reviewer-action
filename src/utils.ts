/*
  This file contains all the helper functions used in main file.
*/

import * as core from '@actions/core'
import { PullRequest } from './pullrequest'

/**
 * Validates if the event name is either 'pull_request' or 'pull_request_review'.
 * If not, throws an error indicating unsupported event type.
 *
 * @param {string} eventName - The name of the event to validate
 * @throws Error - If the event type is not supported
 */
function validateEvent(eventName: string) {
  core.debug(`Validating if event type '${eventName}' is supported`)
  if (!['pull_request', 'pull_request_review'].includes(eventName)) {
    throw new Error(
      `Unsupported event type! Supporing: ["pull_request", "pull_request_review"]. Got: ${eventName}`
    )
  }
  core.debug(`Event type '${eventName}' is supported`)
}

/**
 * Checks and filters reviewers into user and team categories,
 * then validates against pull request's requested reviewers.
 *
 * @param {Array} reviewers - Array of reviewer strings (e.g., 'user:alice', 'team:engineering')
 * @param {Object} pullRequest - Pull request object containing repository details
 * @returns {boolean} true if all required reviewers are correctly set, false otherwise
 */
function reviewersSet(reviewers: Array<string>, pullRequest: PullRequest): boolean {
  core.info('Checking if reviewers are already set')
  const userReviewers = reviewers.filter(reviewer => {
    if (reviewer.startsWith('user')) {
      return reviewer.split(':')[0]
    }
  })
  const teamReviewers = reviewers.filter(reviewer => {
    if (reviewer.startsWith('team')) {
      return reviewer.split(':')[0]
    }
  })

  const pullRequestRequestedReviewerUsers = pullRequest.requestedReviewers
  const pullRequestRequestedReviewerTeams = pullRequest.requestedTeams

  // Check if desired reviewer user are already assigned to the pr
  pullRequestRequestedReviewerUsers.forEach((reviewer: any) => {
    let reviewerName = reviewer.login
    core.debug(`Check if user ${reviewerName} is already set`)
    if (!userReviewers.includes(reviewerName)) {
      core.warning(
        `Reviewer user ${reviewerName} is not in requested reviewers of PR #${pullRequest.number}`
      )
      return false
    }
  })

  // Check if desired reviewer teams are already assigned to the pr
  pullRequestRequestedReviewerTeams.forEach((reviewer: any) => {
    let reviewerName = reviewer.login
    core.debug(`Check if team ${reviewerName} is already set`)
    if (!teamReviewers.includes(reviewerName)) {
      core.warning(
        `Reviewer team ${reviewerName} is not in requested reviewers of PR #${pullRequest.number}`
      )
      return false
    }
  })

  return true
}

/**
 * Determines the condition value based on the given type.
 *
 * @param {string} conditionType - Type of condition ('branch_name' or 'title')
 * @param {Object} pullRequest - Pull request object containing necessary data
 * @returns {string} Corresponding condition value
 * @throws Error - If invalid condition type is provided
 */
function getCondition(conditionType: string, pullRequest: PullRequest) {
  core.debug(
    `Determine condition value based on condition type '${conditionType}'`
  )
  if (conditionType === 'branch_name') {
    return pullRequest.branchName
  }
  if (conditionType === 'title') {
    return pullRequest.title
  }
  throw new Error(`Invalid condition type: ${conditionType}`)
}

/**
 * Filters reviews to include only those marked as APPROVED.
 *
 * @param {Array} reviews - Array of review objects
 * @returns {Array} Filtered list of approved reviews
 * @throws Error - If filtering fails
 */
function getApprovedReviews(reviews: any) {
  core.info('Filtering reviews by status = approved')
  try {
    return reviews.filter((review: any) => review.state === 'APPROVED')
  } catch (error: any) {
    throw new Error(
      `Cannot filter reviews for status 'APPROVED'. Details: ${error.message}`
    )
  }
}

export {
  getApprovedReviews,
  getCondition,
  reviewersSet,
  validateEvent
}
