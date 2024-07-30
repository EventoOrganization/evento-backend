# Evento-Backend Express.js Project

## Introduction

Welcome to the Evento Backend project. This project serves as the backend for the Evento application, built with Express.js. It provides API endpoints and handles server-side logic for the application.

## Project Structure

- **backend**: Contains the Express.js application.

## Prerequisites

- Node.js version 14.x or higher
- PNPM

## Installation

1. **Clone the repository**:

   ```sh
   git clone https://github.com/EventoOrganization/evento_backend
   cd evento_backend
   ```

2. **Install dependencies**:

   ```sh
   pnpm install
   ```

3. **Create a `.env` file**:

   ```sh
   cp .env.example .env
   ```

## Usage

1. **Start the development server**:

   ```sh
   npm run start
   ```

2. **The server should now be running on http://localhost:8747**:

## Examples

We have included some examples to help you get started with dependencies.

- [Zod_example](https://github.com/EventoOrganization/evento_web/tree/main/examples/zod-example.ts)
- [jest_example](https://github.com/EventoOrganization/evento_web/tree/main/examples/jest-example.ts)
- [commitizen_example](https://github.com/EventoOrganization/evento_web/tree/main/examples/commitizen-example.md)

## Project Goals

- Provide a robust backend for the Evento application.
- Handle user authentication and management.
- Manage event creation and real-time messaging.
- Ensure a secure and scalable architecture.

## Key Features

- User authentication and management.
- Event creation and management.
- Real-time messaging with Socket.io.
- API endpoints for frontend integration.
- Add More...

## Directory Structure

- routes: Defines API routes.
- models: Mongoose models for MongoDB.
- controllers: Logic for handling requests.
- config: Configuration files (database connection).
- socket: Socket.io configuration and handlers.

## Contributing

Please refer to [Contributing](CONTRIBUTING.md) for guidelines on contributing to this project.

## Branching and Pull Request Policy

- Branching: Create a new branch for each feature or bug fix. Name your branch using the format `feature/your-feature-name` or `bugfix/your-bugfix-name`.
- Pull Requests: Once your changes are ready, create a Pull Request (PR) to merge your branch into the main branch.
- Review and Approval: Only the repository owner can approve and merge Pull Requests. Ensure your PR is clear and provides enough context for the review.

## Code Quality Configuration

### Configuration Files

1. **.editorconfig**: Ensures coding style consistency across different text editors.
2. **.eslintrc.js**: Configures ESLint to analyze and fix code issues.
3. **.eslintignore**: Specifies files and directories to be ignored by ESLint.
4. **.prettierrc**: Configures Prettier to format the code.
5. **commitlint.config.js**: Configures commitlint to validate commit messages.
6. **lint-staged.config.js**: Configures lint-staged to run ESLint and Prettier on modified files before committing.
7. **.gitignore**: Specifies files and directories to be ignored by Git.

### Issue Models

We have provided templates to help you report bugs and request new features.

- [bug_report](https://github.com/EventoOrganization/evento_web/tree/main/ISSUE_TEMPLATE/bug_report.md)
- [feature_request](https://github.com/EventoOrganization/evento_web/tree/main/ISSUE_TEMPLATE/feature_request.md)

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Contact

For any questions or concerns, please open an issue or contact the project maintainers.

## Useful Links

- Express.js Documentation (https://expressjs.com/en/)
- Mongoose Documentation (https://mongoosejs.com/docs/)
- PNPM Documentation (https://pnpm.io/)
