import * as core from '@actions/core'
import { Octokit } from '@octokit/core'

import * as utils from './utils.js'

async function run() {
  try {
    const pr_number = core.getInput('pr_number', { required: true })
    const token = core.getInput('token', { required: true })
    const octokit = new Octokit({ auth: token })
    const repo = process.env.GITHUB_REPOSITORY
    const [owner, repo_name] = repo.split('/')

    core.debug(`repo: ${repo}`)
    core.debug(`owner: ${owner}`)
    core.debug(`repo_name: ${repo_name}`)
    core.debug(`pr_number: ${pr_number}`)


    // Get the data from config file
    const filePath = core.getInput('approvers_file', { required: false })
    const approverFile = utils.getYamlData(filePath)

    // Get the pull request
    const { data: pullRequest } = await utils.getPullRequest(
      octokit,
      owner,
      repo_name,
      pr_number
    )

    // Set pull request title
    const pullRequestTitle = pullRequest.title
    core.debug(`Pull request title is "${pullRequestTitle}"`)

    // Get the rule who matches the PR title.
    // When no matching rule is found then it tries to fallback to the default rule. If none is defined it throws an error.
    const rule = utils.getMatchingRule(pullRequestTitle, approverFile)
    core.debug(typeof rule)
    const approvalsNeededCount = rule.hasOwnProperty('count') ? rule['count'] : 0

    // Get a list of all reviews of the PR
    const { data: reviews } = await utils.getReviews(
      octokit,
      owner,
      repo_name,
      pr_number
    )
    core.debug(`Reviews: ${reviews.length === 0 ? '[]' : reviews}`)

    if(rule['approvers'].length > reviews.length) {
      throw new Error(`There are still reviews required.`)
    } else {
      core.info(`There are ${reviews.length} reviews to check`)
    }

    // Filter reviews by status == 'APPROVED'
    const approvedReviews = utils.getApprovals(reviews)

    // Get list of usernames which already approved the PR
    const approvers = utils.getApprovers(approvedReviews)

    // Get the list of all desired approvers. Teams are gonna be resolved
    const desiredApprovers = utils.computeApprovers(
      octokit,
      owner,
      rule['approvers']
    )

    // Check if all desired approvers approved PR
    utils.getApproversLeft(desiredApprovers, approvers, approvalsNeededCount)
    core.info(`Rule is fulfilled`)
  } catch(error) {
    // Fail the workflow run if an error occurs
    core.setFailed(`Approver Action failed! Details: ${error.message}`)
  }
}

export { run }
