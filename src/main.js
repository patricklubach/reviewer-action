import * as core from '@actions/core';
import { Octokit } from "@octokit/core";

import * as utils from './utils.js';


async function run() {
  try {
    const pr_number = core.getInput('pr_number', { required: true });
    const token = core.getInput('token', { required: true });
    const octokit =  new Octokit({ auth: token });
    const repo = process.env.GITHUB_REPOSITORY;
    const [owner, repo_name] = repo.split('/');

    core.info(`repo: ${repo}`);
    core.info(`owner: ${owner}`);
    core.info(`repo_name: ${repo_name}`);
    core.info(`pr_number: ${pr_number}`);

    // Get a list of all reviews of the PR
    const { data: reviews } = await utils.getReviews(octokit, owner, repo_name, pr_number);
    core.debug(reviews)
    if(reviews.length == 0) {
      core.info('There are no reviews to check');
      return ;
    } else {
      core.info(`There are ${reviews.length} reviews to check`);
    }

    // Filter reviews by status == 'APPROVED'
    const approvedReviews = utils.getApprovals(reviews);

    // Create a list of all persons who already reviewed and approved the PR
    const reviewers = utils.getReviewers(approvedReviews);

    // Get the pull request
    const { data: pullRequest } = await utils.getPRTitle(octokit, owner, repo_name, pr_number);
    core.debug(`Pull request title is "${pullRequest.title}"`)

    // Get the data from config file
    const filePath = core.getInput('approvers_file', { required: false });
    const approverFile = utils.getYamlData(filePath);

    // Get the rule who matches the PR title
    const rule = utils.getMatchingRule(pullRequest.title, approverFile);

    // Get the list of all desired approvers
    const approvers = utils.computeApprovers(octokit, owner, rule['approvers']);

    // Check if all desired approvers approved PR
    const approversLeft = utils.getApproversLeft(reviewers, approvers);

    // If there are approvers left fail action, if not pass check
    if(approversLeft.length > 0) {
      core.info('Approvals of the following reviewer are missing:');
      for(const approver of approversLeft) {
        core.info(`- ${approver}`);
      }
      throw new Error('Set rule is not fulfilled!');
    }
  } catch(error) {
    // Fail the workflow run if an error occurs
    core.setFailed(`Approver Action failed! Details: ${error.message}`)
  }
}

export { run };
