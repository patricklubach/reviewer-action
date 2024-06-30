const core = require('@actions/core')
const github = require('@actions/github')

import utils from './utils'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */

const filePath = core.getInput('approvers_file', { required: false })

async function run() {
  try {
    // Get a list of all reviews of the PR
    const reviews = utils.getReviews(owner, repo, pr_number)

    // Filter reviews by status == 'APPROVED'
    const approvedReviews = utils.getApprovals(reviews)

    // Create a list of all persons who already reviewed and approved the PR
    const reviewers = utils.getReviewers(approvedReviews)

    // Get the title of the PR
    const title = utils.getPRTitle()

    // Get the data from config file
    const data = utils.getYamlData(filePath)

    // Get the rule who matches the PR title
    const rule = utils.getMatchingRule(title, data)

    // Get the list of all desired approvers
    const approvers = utils.computeApprovers(rule['approvers'])

    // Check if all desired approvers approved PR
    const approversLeft = utils.getApproversLeft(reviewers, approvers)

    // If there are approvers left fail action, if not pass check
    if (!approversLeft.length > 0) {
      console.error('Following approvers are missing:')
      for (let i = 0; i < approversLeft.length; i++) {
        console.log(approversLeft[i])
      }
      throw new Error('Set rule is not fulfilled!')
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error)
  }
}

module.exports = {
  run
}
