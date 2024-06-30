# approver action

This action checks if all approvals of a PR match given rules.

## Inputs

### `gh_token`

**Required** The number of the pull request that shall be checked. Either this in conjunction with `repo` and `repo` or `pr_json` must be set.

### `owner`

**Required** The name of the owner of the repository.

### `pr_number`

**Required** The number of the pull request that shall be checked.

### `repo`

**Required** The name of the repository.

### `approvers_file`

**Optional** The path to the file where approver rules are defined. The syntax of the file is as follows:

```yaml
- regex: ^feature/
  approver:
    - group:MyApproverGroup
    - user:RobotUser9
- regex: ^bugfix/
  approver:
    - user:Foo
```

**Default**: `.approvers.yaml`

## Outputs

None

## Example usage

```yaml
- name: Approvals Check
  id: approver
  uses: actions/approver-action@e76147da8e5c81eaf017dede5645551d4b94427b
  with:
    approver-file: 'approver.yaml'
    owner: foo
    repo: my-super-repo

```
