# NestJS Boilerplate

A production-ready NestJS boilerplate with SQL Server, Redis, Docker, and comprehensive security features.

## Features

### Core Features

- 🚀 NestJS framework with TypeScript
- 🛡️ SQL Server database integration
- 📝 Prisma ORM for type-safe database access
- 🔄 Redis for caching and session management
- 🐳 Docker and Docker Compose setup
- 🔒 Advanced security features

### Development Features

- 📦 ESLint and Prettier for code quality
- 🧪 Jest for testing
- 🔄 Hot reload for development
- 📝 Swagger API documentation
- 🪝 Git hooks with Husky
- 🔍 TypeScript path aliases

### Security Features

- 🔒 Helmet security middleware
- 🛡️ CORS protection
- 🚧 Rate limiting
- 🔐 CSRF protection
- 📝 Request validation
- 🔍 Security headers

### Additional Features

- 🎯 Exception handling system
- 📝 Request logging
- 🏥 Health checks
- 🔄 Database migrations
- 🧪 Testing utilities
- 📊 Performance monitoring

## Prerequisites

- Node.js (v18+ recommended)
- Docker and Docker Compose
- Git

## Getting Started

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/nestjs-boilerplate.git
cd nestjs-boilerplate
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

4. Start the development environment:

```bash
docker-compose up -d
```

### Development

Start the development server:

```bash
npm run start:dev
```

Run tests:

```bash
npm run test        # Unit tests
npm run test:e2e    # E2E tests
npm run test:cov    # Test coverage
```

### Database Migrations

Generate a migration:

```bash
npx prisma migrate dev --name migration_name
```

Apply migrations:

```bash
npx prisma migrate deploy
```

## Project Structure

```
├── src/
│   ├── common/          # Common utilities, filters, guards
│   ├── config/          # Configuration modules
│   ├── modules/         # Feature modules
│   ├── prisma/         # Prisma configuration and client
│   └── main.ts         # Application entry point
├── test/               # Test files
├── docker/             # Docker configuration files
├── prisma/             # Prisma schema and migrations
└── docs/              # Documentation
```

## Configuration

The application can be configured using environment variables. Check `.env.example` for all available options.

### Key Configuration Files

- `docker-compose.yml` - Docker services configuration
- `.env` - Environment variables
- `prisma/schema.prisma` - Database schema
- `src/config/*` - Module configurations

## API Documentation

Swagger documentation is available at `/docs` when running the application.

## Testing

### Unit Tests

```bash
npm run test
```

### E2E Tests

```bash
npm run test:e2e
```

### Test Coverage

```bash
npm run test:cov
```

## Security

This boilerplate includes several security features:

- Helmet for secure headers
- CORS protection
- Rate limiting
- CSRF protection
- Request validation
- SQL injection protection
- XSS protection

## Performance

Performance optimizations include:

- Response compression
- Redis caching
- Database query optimization
- Connection pooling

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the GNU License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- NestJS Team
- Contributors and maintainers
- Open source community

## Support

For support, please raise an issue in the GitHub repository or contact the maintainers.
