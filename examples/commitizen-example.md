# Step-by-Step Guide

## Stage Your Changes

Add the files you want to commit to the staging area:

```sh
git add .
```

Use the Commitizen command to create a commit message:

```sh
pnpm run commit
```

Commitizen will prompt you to fill out the commit message details. For example:

```yaml
Copier le code
? Select the type of change that you're committing: (Use arrow keys)
feat: A new feature
fix: A bug fix
docs: Documentation only changes
style: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
refactor: A code change that neither fixes a bug nor adds a feature
perf: A code change that improves performance
test: Adding missing or correcting existing tests
build: Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)
ci: Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs)
chore: Other changes that don't modify src or test files
revert: Reverts a previous commit
? What is the scope of this change (e.g. component or file name):
? Write a short, imperative tense description of the change (max 94 chars):
? Provide a longer description of the change: (press enter to skip)
? Are there any breaking changes? No
? Does this change affect any open issues? No
```

## Automatic Tests and Linting

After you complete the commit message prompts, Husky will automatically run tests, lint your code, and commit.
