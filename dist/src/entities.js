"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Reviewers = void 0;
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const inputs_js_1 = require("./inputs.js");
const client = github.getOctokit(inputs_js_1.inputs.token);
const repo = process.env.GITHUB_REPOSITORY;
if (!repo) {
    throw new Error('GITHUB_REPOSITORY environment variable is not defined');
}
const [owner, _] = repo.split('/');
/**
 * Represents a collection of reviewers who have been configured to review pull requests.
 */
class Reviewers {
    reviewers;
    entities;
    /**
     * @param {Array} reviewers - Array of strings specifying reviewers in the format 'user:username' or 'team:team_name'
     */
    constructor(reviewers) {
        this.reviewers = reviewers;
        this.entities = this.#buildEntities();
    }
    *[Symbol.iterator]() {
        for (const reviewer of this.reviewers) {
            yield reviewer;
        }
    }
    /**
     * Builds entities from the list of reviewers.
     *
     * @returns {Array} An array of Entity objects, either User or Team
     */
    #buildEntities() {
        core.debug('Building entities...');
        return this.reviewers.map(reviewer => {
            const [type, name] = reviewer.split(':');
            core.debug(`Processing reviewer: ${reviewer}`);
            if (type === 'user') {
                return new User(`${type}:${name}`);
            }
            else if (type === 'team') {
                return new Team(`${type}:${name}`);
            }
            else {
                throw new Error(`Invalid reviewer type. Expected one of: 'user', 'team'. Got: ${type}`);
            }
        });
    }
}
exports.Reviewers = Reviewers;
/**
 * Represents a single entity, which can be either a User or a Team.
 *
 * @class Entity
 */
class Entity {
    principle;
    type;
    name;
    checked;
    /**
     * @param {string} principle - The principle string in the format 'type:name' e.g., 'user:john'
     * @throws {Error} If the format is invalid
     */
    constructor(principle) {
        if (!principle.includes(':')) {
            throw new Error("Invalid format. Use '<type>:<name>'");
        }
        const [type, name] = principle.split(':');
        this.principle = `${type}:${name}`;
        this.type = type;
        this.name = name;
        this.checked = false;
    }
}
/**
 * Represents a user principle.
 *
 * @class User
 */
class User extends Entity {
    /**
     * @param {string} principle - The principle string in the format 'user:username'
     * @super
     * @throws {Error} If the type is not 'user'
     */
    constructor(principle) {
        super(principle);
        if (this.type !== 'user') {
            throw new Error(`Principle type needs to be of type 'user'. Got: ${this.type}`);
        }
    }
}
/**
 * Represents a Github team principle.
 *
 * @class Team
 */
class Team extends Entity {
    members;
    approvalsCounter;
    neededApprovalsCounter;
    /**
     * @param {string} principle - The principle string in the format 'team:team_name'
     * @super
     * @throws {Error} If the type is not 'team'
     */
    constructor(principle) {
        super(principle);
        if (this.type !== 'team') {
            throw new Error(`Type needs to be of type 'team'. Got: ${this.type}`);
        }
        this.members = [];
        this.resolveTeam()
            .then((users) => {
            for (const user of users) {
                this.members.push(user);
            }
        })
            .catch(error => {
            console.error('Error fetching members:', error);
        });
        this.approvalsCounter = 0;
        this.neededApprovalsCounter = this.members.length;
    }
    /**
     * Resolves the team members from the GitHub API.
     *
     * @returns {Array} An array of User objects representing the team members
     * @throws {Error} If there's an issue fetching team members
     */
    async resolveTeam() {
        core.debug(`Getting members for the team ${this.name}`);
        try {
            const response = await client.request(`GET /orgs/${owner}/teams/${this.name}/members`, {
                org: owner,
                team_slug: this.name,
                headers: {
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            });
            const members = response.data.map((member) => new User(`${member.type}:${member.login}`));
            return members;
        }
        catch (error) {
            throw new Error(`The members of team ${this.name} could not be retrieved from GitHub. Details: ${error.message}`);
        }
    }
    /**
     * Updates the approval counter for each member in the team.
     *
     */
    updateApprovalsCounter() {
        core.debug('Updating approvals counter');
        this.members.forEach(() => this.approvalsCounter++);
    }
    /**
     * Checks if a given username is a member of the team.
     *
     * @param {string} name - The username to check
     * @returns {boolean} True if the user is in the team, false otherwise
     */
    isMember(name) {
        core.debug(`Check if ${name} is member of team ${this.name}`);
        return this.members.some(member => member.name === name);
    }
}
