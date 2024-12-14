import { Octokit } from "octokit";

import * as utils from './utils.js';


function run() {
  try {
    const octokit =  new Octokit({ auth: token });
    const repo = process.env.GITHUB_REPOSITORY;
    const repo_name = repo.split('/')[1];
    const owner = process.env.GITHUB_REPOSITORY_OWNER;
    const pr_number = octokit.core.getInput;
    const token = octokit.core.getInput('gh_token', { required: true });

    console.log(`repo: ${repo}`);
    console.log(`repo_name: ${repo_name}`);
    console.log(`owner: ${owner}`);
    console.log(`pr_number: ${pr_number}`);

    // Get a list of all reviews of the PR
    const { data: reviews } = utils.getReviews(octokit, owner, repo_name, pr_number)
    if(reviews == 0) {
      console.log('There are no reviews to check');
      return ;
    } else {
      console.log(`There are ${reviews.length} reviews to check`);
    }

    // Filter reviews by status == 'APPROVED'
    const approvedReviews = utils.getApprovals(reviews);

    // Create a list of all persons who already reviewed and approved the PR
    const reviewers = utils.getReviewers(approvedReviews);

    // Get the pull request
    const { data: pullRequest } = utils.getPRTitle(octokit, owner, repo_name, pr_number);

    // Get the data from config file
    const filePath = octokit.core.getInput('approvers_file', { required: false });
    const data = utils.getYamlData(filePath);

    // Get the rule who matches the PR title
    const rule = utils.getMatchingRule(pullRequest.title, data);

    // Get the list of all desired approvers
    const approvers = utils.computeApprovers(octokit, owner, rule['approvers']);

    // Check if all desired approvers approved PR
    const approversLeft = utils.getApproversLeft(reviewers, approvers);

    // If there are approvers left fail action, if not pass check
    if(!approversLeft.length > 0) {
      console.log('Following approvers are missing:');
      for(let i = 0; i < approversLeft.length; i++) {
        console.log(approversLeft[i]);
      }
      throw new Error('Set rule is not fulfilled!');
    }
  } catch(error) {
    // Fail the workflow run if an error occurs
    throw error;
  }
}

export { run };
