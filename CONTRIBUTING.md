# Contributing to Evento Next.js Project

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## How to Contribute

1. **Fork the repository**:
   Click on the 'Fork' button at the top right corner of the repository page.

2. **Clone the repository**:

   ```bash
   git clone https://github.com/EventoOrganization/evento_backend
   cd evento_backend
   ```

3. **Create a new branch**

   ```bash
   git checkout -b feature/your-feature-name
   or
   git checkout -b bug/your-bug-name
   ```

4. **Make your changes**

Implement your feature or fix the bug.

5. **Commit your changes**

   ```bash
   git add .
   git commit -m "Add your feature"
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**

   Go to the original repository and create a pull request from your fork.

## Branching and Pull Request Policy

- Branching: Create a new branch for each feature or bug fix. Name your branch using the format `feature/your-feature-name` or `bugfix/your-bugfix-name`.
- Pull Requests: Once your changes are ready, create a Pull Request (PR) to merge your branch into the main branch.
- Review and Approval: Only the repository owner can approve and merge Pull Requests. Ensure your PR is clear and provides enough context for the review.

## Guidelines

- Write clean, readable, and well-documented code.
- Follow the existing code style and conventions.
- Write tests for new features and bug fixes.
- Make sure your changes do not break existing functionality.
- Keep your branch updated with the latest changes from the main branch.

## Reporting Issues

If you encounter any issues, please open an issue on GitHub with detailed information on how to reproduce the problem. Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) for reporting bugs and the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md) for suggesting new features.

### .gitignore

```plaintext
# dependencies
/node_modules

# production
/build

# misc
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local
npm-debug.log*
yarn-debug.log*
yarn-error.log*

```
