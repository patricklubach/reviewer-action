import * as core from '@actions/core'
import { Octokit } from '@octokit/core'

import * as utils from './utils.js'

async function run() {
  try {
    const prNumber = core.getInput('pr_number', { required: true })
    const token = core.getInput('token', { required: true })
    const setReviewers = core.getInput('set_reviewers', { required: false }) || false
    const octokit = new Octokit({ auth: token })
    const repo = process.env.GITHUB_REPOSITORY
    const [owner, repoName] = repo.split('/')

    // Inputs debugs outputs
    core.debug('Inputs:')
    core.debug(`repo: ${repo}`)
    core.debug(`owner: ${owner}`)
    core.debug(`repo_name: ${repoName}`)
    core.debug(`pr_number: ${prNumber}`)

    // Get the data from config file
    const filePath = core.getInput('approvers_file', { required: false })
    const approverFile = utils.getYamlData(filePath)

    // Get the pull request
    const { data: pullRequest } = await utils.getPullRequest(
      octokit,
      owner,
      repoName,
      prNumber
    )

    var checkOn = 'branch_name'

    // Determines on what to check. Either title or branch name
    if(approverFile.hasOwnProperty('check_on')) {
      checkOn = approverFile.check_on
    }

    switch(checkOn) {
      case 'title':
        checkOn = pullRequest.title
        core.debug(`Action will check on title: "${checkOn}"`)
        break;
      case 'branch_name':
        checkOn = pullRequest.head.ref
        core.debug(`Action will check on branch: "${checkOn}"`)
        break;
      default:
        throw new Error(`check_on property is misconfigured. Allowed values are: [title, branch_name]. Got: ${approverFile.check_on}`)
    }

    // Get the rule who matches the PR title.
    // When no matching rule is found then it tries to fallback to the default rule. If none is defined it throws an error.
    const rule = utils.getMatchingRule(checkOn, approverFile.rules)

    // check if requested reviewers are already set on pr
    // this can be configured using the input
    if(setReviewers) {
      core.info('set_reviewers is set')
      core.info('Checking which reviewers are already set on pr')
      const requestedReviewerUsers = pullRequest.requested_reviewers.map((reviewer) => {
        return `user:${reviewer.login}`
      });
      const requestedReviewerTeams = pullRequest.requested_teams.map((team) => {
        return `team:${team.login}`
      });
      core.debug(`requested reviewer users are: ${requestedReviewerUsers}`)
      core.debug(`requested reviewer teams are: ${requestedReviewerTeams}`)
      core.debug(`required reviewers are: ${rule.approvers}`)
      if(JSON.stringify(rule.approvers.sort()) != JSON.stringify(requestedReviewerUsers.concat(requestedReviewerTeams).sort())) {
        core.info(`Setting reviewers for pull request #${id.number}`)
        const { data: id } = await utils.setApprovers(
          octokit,
          owner,
          repoName,
          prNumber,
          rule.approvers
        )
        core.info(`Updated reviewers for PR #${id.number}`)
        return
      } else {
        core.info('Required and requested reviewers are already the same. Skipping assignment')
        return
      }
    }
    const approvalsNeededCount = rule.hasOwnProperty('count') ? rule['count'] : 0

    // Get a list of all reviews of the PR
    const { data: reviews } = await utils.getReviews(
      octokit,
      owner,
      repoName,
      prNumber
    )

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
