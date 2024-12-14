# approver action

This action checks if all approvals of a PR match given rules.

## Inputs

### `gh_token`

**Required** The Github token to access the repository to check.

### `approvers_file`

**Optional** The path to the file where approver rules are defined. The syntax
of the file is as follows:

```yaml
- regex: ^feature/
  approver:
    - team:MyApproverGroup
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
    gh_token: {{ secrets.gh_token }}
    approver-file: 'approver.yaml'
```

## Test locally

To test the action locally install [`act`](https://github.com/nektos/act) and
run:

```bash
npm run test:local
```
