import { Reviewers } from './entities.js'

import * as core from '@actions/core'

/**
 * Manages and validates rules for review system operations.
 *
 * @class
 */
export class Rule {
  regex: string
  type: string
  amount: number | null
  reviewers: Reviewers
  default: string

  /**
   * @param {Object} rule - The rule object containing configuration properties
   */
  constructor(rule: any) {
    this.regex = rule.regex || null
    this.type = rule.type
    this.amount = rule.amount || null
    this.reviewers = new Reviewers(rule.reviewers)
    this.default = rule.default || false

    this.validate()
  }

  /**
   * Validates that the rule meets specific criteria.
   *
   * @private
   */
  validate() {
    core.debug('Validating rule type...')
    if (this.type === 'AMOUNT' && !this.amount) {
      throw new Error(
        "When setting rule type to 'AMOUNT', rule.amount needs to be specified."
      )
    }
  }
}

/**
 * Manages an array of rules and provides functionality to get matching rules.
 *
 * @class Rules
 */
export class Rules {
  rules: Array<any>
  /**
   * @param {Array} rules - Array of rule objects to initialize with
   */
  constructor(rules: Array<any>) {
    this.rules = []
    this.init(rules)
  }

  *[Symbol.iterator]() {
    for (const rule of this.rules) {
      yield rule
    }
  }

  /**
   * Initializes the Rules class by mapping over provided rules and creating Rule instances.
   *
   * @private
   */
  init(rules: any) {
    this.rules = rules.map((rule: any) => new Rule(rule))
  }

  /**
   * Retrieves the default rule defined for the system.
   *
   * @private
   */
  getDefaultRule() {
    core.info('Getting default rule')
    const defaultRule = this.rules.find(rule => rule.default)

    if (defaultRule) {
      core.info('Default rule found')
      return defaultRule
    } else {
      throw new Error('No default rule exists!')
    }
  }

  /**
   * Finds the matching rule based on a given condition.
   *
   * @param {string} condition - The condition to check against rules' regex patterns
   *
   * @private
   */
  getMatchingRule(condition: string): Rule {
    core.debug('Attempting to find matching rule for condition: ' + condition)
    try {
      for (const rule of this.rules) {
        if (!rule.regex) {
          core.debug('Skipping rule without a regex pattern')
          continue
        }

        // Ensure that regex is a valid RegExp object
        if (typeof rule.regex === 'string') {
          const regex = new RegExp(rule.regex)
          core.debug(
            `Testing condition '${condition}' against regex '${rule.regex}'`
          )
          if (regex.test(condition)) {
            core.debug(
            `Regex '${rule.regex}' matches condition '${condition}'`
            )
            return rule
          } else {
            core.debug(
            `Regex '${rule.regex}' does not match condition '${condition}'`
            )
          }
        } else {
          throw new Error(
            'Invalid regex type provided. Please use a valid regular expression.'
          )
        }
      }
    } catch (error: any) {
      throw new Error(
        `Regular expression check failed. Details: ${error.message}`
      )
    }

    try {
      // If no match found, move to the next rule
      core.warning(
        `No rule matches condition "${condition}". Trying to fallback to default rule!`
      )
      return this.getDefaultRule()
    } catch (error: any) {
      core.error(error.message)
      throw new Error('No matching rule and no default rule exists.')
    }
  }
}
