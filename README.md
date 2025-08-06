# GoTravelX Flight Tracking Client

A real-time flight tracking application built with Next.js that integrates with blockchain technology for secure flight data management.

## Features

- Real-time flight tracking
- Blockchain integration for secure data
- Historical flight data analysis
- Responsive design with dark/light mode
- WebSocket connections for live updates

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Set up environment variables:
   \`\`\`bash
   cp .env.example .env.local
   \`\`\`

4. Run the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

## Testing

This project uses Jest and React Testing Library for unit testing.

### Running Tests

\`\`\`bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
\`\`\`

### Test Structure

- `__tests__/components/` - Component tests
- `__tests__/hooks/` - Custom hook tests
- `__tests__/lib/` - Utility function tests
- `__tests__/pages/` - Page component tests

### Writing Tests

Follow these guidelines when writing tests:

1. **Component Tests**: Test user interactions, rendering, and props
2. **Hook Tests**: Test state changes and side effects
3. **Utility Tests**: Test pure functions and edge cases
4. **Integration Tests**: Test component interactions and API calls

### Test Coverage

The project aims for high test coverage. Run `npm run test:coverage` to see current coverage reports.

## Project Structure

\`\`\`
├── app/                    # Next.js app directory
├── components/            # React components
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions and API calls
├── __tests__/            # Test files
├── jest.config.js        # Jest configuration
├── jest.setup.js         # Jest setup file
└── package.json          # Dependencies and scripts
\`\`\`

## Technologies Used

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Jest** - Testing framework
- **React Testing Library** - Component testing
- **WebSocket** - Real-time communication
- **Blockchain Integration** - Camino network

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

This project is licensed under the MIT License.
