import * as core from '@actions/core'
import { PullRequestReview } from './interfaces'
import { Rule } from './rules'

/**
 * A utility class for evaluating review rules and determining their fulfillment status.
 *
 * @class Check
 */
class Check {
  /**
   * Checks if a given rule is fulfilled based on the provided reviews and reviewers.
   *
   * @param {Object} rule - The review rule to check, containing a 'type' property that can be 'ALL', 'AMOUNT', or 'ONE_OF_EACH'.
   * @param {Array} reviews - An array of review objects, each containing user information and their comments.
   *
   * @returns {Boolean} True if the rule is fulfilled; False otherwise.
   * @throws {Error} If the rule type is not recognized.
   */
  isFulfilled(
    rule: Rule,
    pullRequestReviews: Array<PullRequestReview>
  ): boolean {
    core.info(`Check if rule is fulfilled...`)
    switch (rule.type) {
      case 'ALL':
        core.debug(`Rule type is 'ALL'`)
        for (const reviewer of rule.reviewers) {
          core.debug(`Validating reviewer: ${reviewer}`)
          const validated = pullRequestReviews.some(
            review => review.user.login === reviewer
          )
          if (!validated) {
            return false
          }
        }
        return true
      case 'AMOUNT':
        core.debug(`Rule type is 'AMOUNT'`)
        let approvalCounter = 0
        for (const reviewer of rule.reviewers) {
          core.debug(`Validating reviewer: ${reviewer}`)
          const validated = pullRequestReviews.some(
            review => review.user.login === reviewer
          )
          if (validated) {
            approvalCounter++
          }
        }
        if (!rule.amount) {
          return true
        }
        return approvalCounter >= rule.amount
      default:
        return false
    }
  }
}

export const check = new Check()
