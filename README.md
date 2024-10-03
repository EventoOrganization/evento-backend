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

## Migrations

We use `migrate-mongo` for database migrations. Follow these steps to run and manage migrations.

### Initial Setup

1. **Install migrate-mongo**:

   ```sh
   npm install -g migrate-mongo

   ```

2. **Initialize migrate-mongo**:

   ```sh
   migrate-mongo init

   ```

3. **Configure migrate-mongo**:
   Update `migrate-mongo-config.js` with your MongoDB connection details.

### Running Migrations

1. **Create a new migration**:
   ```sh
   migrate-mongo create <migration-name>
   ```
2. **Apply migrations**:
   ```sh
   migrate-mongo up
   ```
3. **Rollback migrations**:
   ```sh
   migrate-mongo down
   ```

For more details, refer to the [migrate-mongo documentation](https://github.com/seppevs/migrate-mongo)

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

- [bug_report](.github/ISSUE_TEMPLATE/bug_report.md)
- [feature_request](.github/ISSUE_TEMPLATE/feature_request.md)

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Contact

For any questions or concerns, please open an issue or contact the project maintainers.

## Useful Links

- Express.js Documentation (https://expressjs.com/en/)
- Mongoose Documentation (https://mongoosejs.com/docs/)
- PNPM Documentation (https://pnpm.io/)

### API Documentation - Authentication Routes

#### **POST /auth/signup**

- **Description**: Registers a new user.
- **Request Body**:
  - `email`: User's email.
  - `password`: User's password.
- **Response**: Returns user ID and email.

#### **POST /auth/login**

- **Description**: Authenticates a user.
- **Request Body**:
  - `email`: User's email.
  - `password`: User's password.
- **Response**: Returns user ID, email, and JWT token.

#### **POST /auth/logout** _(Requires Authentication)_

- **Description**: Logs out the current user.
- **Authentication**: Requires `JWT` token in the `Authorization` header (`Bearer <token>`).
- **Response**: Success message.

#### **POST /auth/forgot-password**

- **Description**: Sends OTP for password reset.
- **Request Body**:
  - `email`: User's email.
- **Response**: OTP sent message.

#### **POST /auth/verify-otp**

- **Description**: Verifies the OTP.
- **Request Body**:
  - `otpCode`: OTP to be verified.
- **Response**: OTP verification result.

#### **POST /auth/reset-password**

- **Description**: Resets user’s password.
- **Request Body**:
  - `email`: User's email.
  - `password`: New password.
- **Response**: Password reset confirmation.

#### **DELETE /auth/delete-account** _(Requires Authentication)_

- **Description**: Deletes the user account.
- **Authentication**: Requires `JWT` token in the `Authorization` header (`Bearer <token>`).
- **Response**: Account deletion confirmation.

### API Documentation - Profile Routes

#### **GET /profile/getLoggedUserProfile** _(Requires Authentication)_

- **Description**: Retrieves the logged-in user's profile.
- **Authentication**: Requires `JWT` token in the `Authorization` header (`Bearer <token>`).
- **Response**:
  - `userInfo`: Detailed user information.
  - `upcomingEvents`: List of upcoming events.
  - `pastEvents`: List of past events.
  - `hostedEvents`: List of events hosted by the user.

#### **PUT /profile/updateProfile** _(Requires Authentication)_

- **Description**: Updates the logged-in user's profile information.
- **Authentication**: Requires `JWT` token in the `Authorization` header (`Bearer <token>`).
- **Request Body**:
  - `username`: User's new username.
  - `firstName`: User's new first name.
  - `lastName`: User's new last name.
  - `email`: User's new email.
  - `password`: User's new password (hashed).
  - `phoneNumber`: User's phone number.
  - `address`: User's address.
  - `bio`: User's bio.
  - `DOB`: Date of birth.
  - `profileImage`: Profile image file (only image files allowed).
  - `socialLinks`: Social media links in JSON format.
  - `interests`: List of interest IDs in JSON format.
- **Response**: Updated user profile.

#### **GET /profile/userProfile/:userId**

- **Description**: Retrieves the profile of a specific user by their ID.
- **Request Parameters**:
  - `userId`: ID of the user to retrieve.
- **Response**:
  - `userInfo`: Detailed user information.
  - `upcomingEvents`: List of upcoming events.
  - `pastEvents`: List of past events.
  - `hostedEvents`: List of events hosted by the user.

### API Documentation - Event Routes

#### **POST /events/createEvent** _(Requires Authentication)_

- **Description**: Creates a new event.
- **Authentication**: Requires `JWT` token in the `Authorization` header (`Bearer <token>`).
- **Request Body**: Various event details such as title, location, guests, etc.
- **Response**: Success message with event details.

#### **GET /events/getEvent/:id**

- **Description**: Fetches event details by ID.
- **Request Parameters**:
  - `id`: Event ID.
- **Response**: Event details including guests, co-hosts, and attendees.

#### **GET /events/getUpcomingEvents**

- **Description**: Retrieves all upcoming public events.
- **Response**: List of upcoming public events.

#### **PUT /events/updateEvent/:eventId** _(Requires Authentication)_

- **Description**: Updates specific fields in the event.
- **Authentication**: Requires `JWT` token in the `Authorization` header.
- **Request Body**:
  - `field`: The field to update.
  - `value`: The new value.
- **Response**: Updated event information.

#### **POST /events/storePostEventMedia** _(Requires Authentication)_

- **Description**: Stores post-event media for an event.
- **Authentication**: Requires `JWT` token in the `Authorization` header.
- **Request Body**:
  - `eventId`: ID of the event.
  - `media`: Media data to be stored.
- **Response**: Success message with updated event details.

#### **DELETE /events/deletePostEventMedia/:eventId** _(Requires Authentication)_

- **Description**: Deletes media from the post-event section.
- **Authentication**: Requires `JWT` token in the `Authorization` header.
- **Request Parameters**:
  - `eventId`: ID of the event.
- **Request Body**:
  - `currentMediaIndex`: Index of the media to delete.
- **Response**: Success message confirming deletion.

#### **PATCH /events/toggle-upload-media** _(Requires Authentication)_

- **Description**: Toggles whether media uploads are allowed after the event.
- **Authentication**: Requires `JWT` token in the `Authorization` header.
- **Request Body**:
  - `eventId`: ID of the event.
  - `allow`: Boolean value to enable or disable media uploads.
- **Response**: Updated event details.

#### **PATCH /events/addGuests/:id** _(Requires Authentication)_

- **Description**: Adds guests to an event.
- **Authentication**: Requires `JWT` token in the `Authorization` header.
- **Request Parameters**:
  - `id`: Event ID.
- **Request Body**:
  - `guests`: List of user IDs to invite.
  - `tempGuests`: List of temporary guests (with email and username).
- **Response**: Success message with updated event guest details.

#### **POST /events/unGuestUser** _(Requires Authentication)_

- **Description**: Removes a guest from the event.
- **Authentication**: Requires `JWT` token in the `Authorization` header.
- **Request Body**:
  - `userId`: User ID of the guest.
  - `eventId`: ID of the event.
- **Response**: Success message confirming the user is no longer a guest.

#### **PUT /events/:id/updateGuestsAllowFriend** _(Requires Authentication)_

- **Description**: Updates the `guestsAllowFriend` field of an event.
- **Authentication**: Requires `JWT` token in the `Authorization` header.
- **Request Parameters**:
  - `id`: Event ID.
- **Request Body**:
  - `guestsAllowFriend`: Boolean value to allow or disallow guests to bring friends.
- **Response**: Updated event details.

#### **POST /events/attendEventStatus** _(Requires Authentication)_

- **Description**: Toggles the attendance status for a user at an event.
- **Authentication**: Requires `JWT` token in the `Authorization` header.
- **Request Body**:
  - `eventId`: Event ID.
  - `userId`: User ID.
  - `rsvpAnswers`: Optional answers to RSVP questions.
  - `attendStatus`: Current attendance status.
- **Response**: Success message confirming attendance status change.

#### **POST /events/favouriteEventStatus** _(Requires Authentication)_

- **Description**: Toggles the favorite status for an event.
- **Authentication**: Requires `JWT` token in the `Authorization` header.
- **Request Body**:
  - `eventId`: Event ID.
- **Response**: Success message confirming the event is favorited or unfavorited.

#### **POST /events/refusedEventStatus** _(Requires Authentication)_

- **Description**: Toggles the refusal status for an event.
- **Authentication**: Requires `JWT` token in the `Authorization` header.
- **Request Body**:
  - `eventId`: Event ID.
  - `reason`: Optional reason for refusing the event.
- **Response**: Success message confirming the event refusal.

#### **DELETE /events/deleteEvent/:id** _(Requires Authentication)_

- **Description**: Deletes an event.
- **Authentication**: Requires `JWT` token in the `Authorization` header.
- **Request Parameters**:
  - `id`: Event ID.
- **Response**: Success message confirming event deletion.

### API Documentation - Chat Routes

#### **POST /chat/sendMessage**

- **Description**: Sends a message in a conversation.
- **Authentication**: No authentication required.
- **Request Body**:
  - `message`: Message text.
  - `senderId`: ID of the sender.
  - `conversationId`: ID of the conversation.
  - `messageType`: Type of message (text, image, etc.).
- **Response**: Success message with message details.

#### **GET /chat/fetchMessages/:chatId** _(Requires Authentication)_

- **Description**: Fetches messages in a conversation.
- **Authentication**: Requires `JWT` token in the `Authorization` header (`Bearer <token>`).
- **Request Parameters**:
  - `chatId`: Chat ID.
- **Response**: List of messages.

#### **GET /chat/fetchConversations** _(Requires Authentication)_

- **Description**: Fetches all conversations for the authenticated user.
- **Authentication**: Requires `JWT` token in the `Authorization` header.
- **Response**: List of conversations with the most recent messages.

#### **POST /chat/startPrivateConversation** _(Requires Authentication)_

- **Description**: Starts a private conversation between two users.
- **Authentication**: Requires `JWT` token in the `Authorization` header.
- **Request Body**:
  - `userId`: ID of the other user.
- **Response**: Success message with conversation details.

#### **DELETE /chat/deleteMessage/:messageId** _(Requires Authentication)_

- **Description**: Deletes a message sent by the authenticated user.
- **Authentication**: Requires `JWT` token in the `Authorization` header.
- **Request Parameters**:
  - `messageId`: ID of the message.
- **Response**: Success message confirming message deletion.

#### **DELETE /chat/deleteConversation/:conversationId** _(Requires Authentication)_

- **Description**: Deletes a conversation by ID.
- **Authentication**: Requires `JWT` token in the `Authorization` header.
- **Request Parameters**:
  - `conversationId`: ID of the conversation.
- **Response**: Success message confirming conversation deletion.
