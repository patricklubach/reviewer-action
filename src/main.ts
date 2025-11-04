import * as core from '@actions/core'
import * as github from '@actions/github'

import { check } from './check.js'
import { Config } from './config.js'
import { inputs } from './inputs.js'
import { WebhookPayload } from './interfaces'
import * as pr from './pullrequest.js'
import { Rules } from './rules.js'
import * as utils from './utils.js'
import { version } from './version'

export async function run() {
  try {
    core.info(`Starting reviewer action (version: ${version})`)
    utils.validateEvent(github.context.eventName)

    const eventPayload: WebhookPayload = github?.context?.payload
    if (!eventPayload) {
      throw new Error('event payload is empty.')
    }
    if (!eventPayload.pull_request) {
      throw new Error('event payload does not contain pull_request.')
    }

    const owner: string | undefined =
      eventPayload.pull_request.head.repo.owner.login
    const reponame: string | undefined =
      eventPayload.pull_request.head.repo.name
    const number: number | undefined = eventPayload.pull_request.number

    if (typeof owner != 'string') {
      throw new Error('Could not find owner of repository in event payload!')
    }
    if (typeof reponame != 'string') {
      throw new Error(
        'Could not find repo name of repository in event payload!'
      )
    }
    if (typeof number != 'number') {
      throw new Error('Could not find number of pull request in event payload!')
    }

    const { data: pullRequestData } = await pr.getPullRequest(
      owner,
      reponame,
      number
    )
    const { data: pullRequestReviews } = await pr.getReviews(
      owner,
      reponame,
      number
    )
    const pullRequest = new pr.PullRequest(pullRequestData, pullRequestReviews)

    const config = new Config(inputs.configPath)
    const rules = new Rules(config.rules)
    const condition = utils.getCondition(config.conditionType, pullRequest)
    const matchingRule = rules.getMatchingRule(condition)

    const reviewers = matchingRule.reviewers
    core.debug('Configured reviewers are:')
    for (const reviewer of reviewers) {
      core.debug(`- ${reviewer}`)
    }

    // if set_reviewers action property is set to true on the action,
    // check if requested reviewers are already set on pr.
    // if not these are set according to the reviewers rule.
    // Note: All previously set reviewers on the pr are overwritten and reviews are resetted!
    if (inputs.setReviewers) {
      core.debug('set_reviewers property is set on the action')
      // if (!utils.reviewersSet(reviewers, pullRequest)) {
      //   core.info(
      //     `Not all reviewers are set. Setting reviewers on pull request #${pullRequest}`
      //   )
      pullRequest.setPrReviewers(reviewers.reviewers)
      // } else {
      //   core.info('All reviewers are set')
      // }
      return
    }

    // Filter list of reviews by status 'APPROVED'
    const approvedReviews = utils.getApprovedReviews(pullRequest.reviews)

    // Check whether all conditions are met
    if (!check.isFulfilled(matchingRule, approvedReviews)) {
      throw new Error('Rule is not fulfilled!')
    }
    core.info(`Success! Rule is fulfilled!`)
  } catch (error: any) {
    // Fail the workflow run if an error occurs
    core.setFailed(`Reviewers Action failed! Details: ${error.message}`)
  }
}
