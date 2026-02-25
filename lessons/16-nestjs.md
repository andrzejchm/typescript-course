# 16 - NestJS — Structured Backend Framework

NestJS adds structure, dependency injection, modules, and decorators on top of Express. If Express is raw `CustomPainter`, NestJS is Flutter — you can do everything manually, but the framework gives you conventions that scale with team size.

This lesson covers the core building blocks, maps each one to a Flutter concept you already know, and shows production patterns.

---

## 1) What NestJS Is and Why It Exists

Express is minimal. It gives you `req`, `res`, `next`, and nothing else. You decide how to organize files, inject dependencies, validate input, and handle errors. That freedom is fine for small services but becomes a liability when teams grow.

NestJS wraps Express (or Fastify) and adds:

- **Decorators** for routing, validation, and metadata
- **Dependency injection** built into the framework
- **Modules** for organizing features with clear boundaries
- **Guards, interceptors, pipes, filters** for cross-cutting concerns
- **CLI generators** for consistent scaffolding

The result is a framework where two developers on different teams produce structurally similar code. That consistency matters in production.

---

## 2) Flutter Developer Advantage

NestJS will feel familiar. The patterns map directly to tools you already use.

| NestJS | Flutter/Dart | What it does |
|---|---|---|
| `@Controller('tasks')` | GoRouter route definition | Maps HTTP paths to handler methods |
| `@Injectable()` | `@injectable` (Injectable pkg) | Marks a class for DI registration |
| `@Module({ providers, controllers })` | GetIt module / feature DI registration | Groups related classes and declares dependencies |
| `@Inject('TOKEN')` | `@Named('token')` in GetIt | Injects a dependency by token instead of type |
| Constructor injection | Constructor injection via GetIt | Default way to receive dependencies |
| Guards (`CanActivate`) | GoRouter redirect guards | Block or allow request processing |
| Interceptors | Dio interceptors | Transform request/response or add cross-cutting logic |
| Pipes (`ValidationPipe`) | Transformers / validators before business logic | Validate and transform input data |
| Exception filters | `FlutterError.onError` / ErrorWidget | Centralized error handling |
| DTOs with `class-validator` | freezed + json_serializable classes | Typed request/response shapes with validation |
| `ConfigService` | `flutter_dotenv` / `--dart-define` | Environment-based configuration |
| `@nestjs/swagger` decorators | build_runner code generation | Generate artifacts (API docs) from annotations |
| Middleware | Express middleware (same concept) | Runs before route matching |
| Module `exports` | Exposing classes from a package's barrel file | Controls what other modules can access |
| `Test.createTestingModule` | `setUpAll` with GetIt test registration | Configures DI container for tests |
| Singleton scope (default) | `GetIt.registerSingleton` | One instance shared across the app |
| Transient scope | `GetIt.registerFactory` | New instance on every injection |
| Request scope | Scoped registration per request | New instance per HTTP request |

If you have used Injectable + GetIt in Flutter, NestJS DI will feel like the same system with different syntax.

---

## 3) Project Setup

```bash
npm i -g @nestjs/cli
nest new my-project
cd my-project
npm run start:dev   # watch mode with auto-reload
```

Generated structure:

```text
src/
  app.module.ts        # root module — registers all feature modules
  app.controller.ts    # root controller — handles base routes
  app.service.ts       # root service — business logic
  main.ts              # bootstrap — creates app and starts listening
test/
  app.e2e-spec.ts      # end-to-end test
```

Flutter mapping:

| NestJS file | Flutter equivalent |
|---|---|
| `main.ts` | `main.dart` — app entry point |
| `app.module.ts` | Top-level GetIt registration / `runApp` widget tree root |
| `app.controller.ts` | Root router / `MaterialApp` route config |
| `app.service.ts` | App-level repository or use case |

---

## 4) Core Building Blocks

### Controllers

Controllers handle HTTP requests. Each method maps to a route.

```typescript
import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll() {
    return this.tasksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateTaskDto) {
    return this.tasksService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}
```

Flutter parallel: this is like defining GoRouter routes, but each route handler lives as a method on the controller class instead of a separate widget.

### Services

Services hold business logic. They are injected into controllers (or other services) via the constructor.

```typescript
import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(@Inject('DATABASE') private readonly db: Pool) {}

  async findAll() {
    const { rows } = await this.db.query('SELECT * FROM tasks ORDER BY created_at DESC');
    return rows;
  }

  async findOne(id: string) {
    const { rows } = await this.db.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (rows.length === 0) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    return rows[0];
  }

  async create(dto: CreateTaskDto) {
    const { rows } = await this.db.query(
      'INSERT INTO tasks (title, description) VALUES ($1, $2) RETURNING *',
      [dto.title, dto.description ?? null],
    );
    return rows[0];
  }

  async update(id: string, dto: UpdateTaskDto) {
    await this.findOne(id); // throws if not found
    const { rows } = await this.db.query(
      'UPDATE tasks SET title = COALESCE($1, title), description = COALESCE($2, description) WHERE id = $3 RETURNING *',
      [dto.title, dto.description, id],
    );
    return rows[0];
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.query('DELETE FROM tasks WHERE id = $1', [id]);
  }
}
```

Flutter parallel: this is a repository class. In Flutter you might have `TasksRepository` registered with GetIt as a singleton. Same pattern here — `@Injectable()` marks it for DI, and the framework handles instantiation.

### Modules

Modules group related controllers, services, and providers. They are the unit of organization.

```typescript
import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  controllers: [TasksController],
  providers: [
    TasksService,
    {
      provide: 'DATABASE',
      useFactory: () => {
        const { Pool } = require('pg');
        return new Pool({ connectionString: process.env.DATABASE_URL });
      },
    },
  ],
  exports: [TasksService], // makes TasksService available to other modules that import TasksModule
})
export class TasksModule {}
```

Flutter parallel: this is like a feature's DI registration file where you call `getIt.registerSingleton<TasksRepository>(...)`. The `exports` array controls what other modules can access — similar to a Dart package's barrel file that selectively exports public API.

Register feature modules in the root module:

```typescript
import { Module } from '@nestjs/common';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [TasksModule],
})
export class AppModule {}
```

### DTOs and Validation

DTOs define the shape of incoming data. Combined with `class-validator`, they validate at the HTTP boundary.

```bash
npm install class-validator class-transformer
```

```typescript
// dto/create-task.dto.ts
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;
}
```

```typescript
// dto/update-task.dto.ts
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;
}
```

Enable validation globally in `main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,           // strip unknown properties
    forbidNonWhitelisted: true, // reject unknown properties with 400
    transform: true,            // auto-transform payloads to DTO instances
  }));

  await app.listen(3000);
}
bootstrap();
```

Flutter parallel: DTOs with `class-validator` decorators serve the same purpose as freezed classes with `json_serializable` — they define the data shape and enforce constraints. The `ValidationPipe` is like having a global middleware that runs `fromJson` + validation before your logic sees the data.

**class-validator vs Zod**: NestJS supports both. `class-validator` uses decorators and fits naturally with NestJS's decorator-based style. Zod uses function chaining and is more common in plain Express apps (as shown in lesson 07). Use whichever your team prefers — `class-validator` is more "NestJS native."

---

## 5) Dependency Injection Deep Dive

### Constructor injection (default)

The most common pattern. Declare the dependency as a constructor parameter and NestJS resolves it.

```typescript
@Injectable()
export class TasksService {
  constructor(private readonly tasksService: TasksService) {}
}
```

Flutter equivalent: `GetIt.registerSingleton` + constructor injection via Injectable.

### Custom providers

When you need more control over how a dependency is created.

```typescript
// useValue — provide a static value (like GetIt.registerSingleton with a pre-built instance)
{
  provide: 'API_KEY',
  useValue: process.env.API_KEY,
}

// useFactory — provide via factory function (like GetIt.registerFactory)
{
  provide: 'DATABASE',
  useFactory: () => new Pool({ connectionString: process.env.DATABASE_URL }),
}

// useFactory with injected dependencies (like GetIt.registerFactoryParam)
{
  provide: 'DATABASE',
  useFactory: (config: ConfigService) => new Pool({
    connectionString: config.get<string>('DATABASE_URL'),
  }),
  inject: [ConfigService],
}

// useClass — swap implementation (like GetIt.registerSingleton<Abstract>(ConcreteImpl()))
{
  provide: TasksRepository,
  useClass: PostgresTasksRepository,
}
```

### Scopes

| NestJS scope | Behavior | Flutter/GetIt equivalent |
|---|---|---|
| `DEFAULT` (singleton) | One instance for the entire app | `registerSingleton` / `registerLazySingleton` |
| `TRANSIENT` | New instance every time it is injected | `registerFactory` |
| `REQUEST` | New instance per HTTP request | No direct equivalent — closest is a scoped provider per navigation context |

```typescript
@Injectable({ scope: Scope.TRANSIENT })
export class ReportGenerator {
  // new instance every time this is injected
}
```

Use `DEFAULT` (singleton) unless you have a specific reason. Request scope has performance implications because it forces all dependents to also be request-scoped.

---

## 6) Request Lifecycle — Middleware, Guards, Interceptors, Pipes, Filters

NestJS processes each request through a defined pipeline:

```text
Request
  → Middleware
    → Guards
      → Interceptors (before)
        → Pipes
          → Controller method
        → Interceptors (after)
      → Exception Filters (on error)
Response
```

### Middleware

Runs before route matching. Same concept as Express middleware.

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    req['id'] = req.headers['x-request-id'] ?? uuidv4();
    res.setHeader('x-request-id', req['id']);
    next();
  }
}
```

Register in a module:

```typescript
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

@Module({ /* ... */ })
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
```

### Guards

Guards decide whether a request should proceed. Return `true` to allow, `false` to reject.

```typescript
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (apiKey !== process.env.API_KEY) {
      throw new UnauthorizedException('Invalid API key');
    }
    return true;
  }
}
```

Apply to a controller or method:

```typescript
@Controller('tasks')
@UseGuards(ApiKeyGuard)
export class TasksController { /* ... */ }
```

Or globally in `main.ts`:

```typescript
app.useGlobalGuards(new ApiKeyGuard());
```

Flutter parallel: GoRouter's `redirect` callback that checks auth state and redirects to login. Same concept — check a condition before the handler runs.

### Interceptors

Interceptors wrap the handler execution. They can transform the response, add logging, implement caching, or measure timing.

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - start;
        this.logger.log(`${method} ${url} — ${ms}ms`);
      }),
    );
  }
}
```

Flutter parallel: Dio interceptors that log requests, add auth headers, or retry on failure.

### Pipes

Pipes validate and transform input before it reaches the controller method.

```typescript
// Built-in pipes
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
  // id is guaranteed to be a number — ParseIntPipe rejects non-numeric strings with 400
  return this.tasksService.findOne(id);
}
```

The global `ValidationPipe` (from section 4) is the most important pipe — it validates DTOs automatically.

### Exception Filters

Exception filters catch errors and transform them into HTTP responses.

```typescript
import {
  ExceptionFilter, Catch, ArgumentsHost,
  HttpException, HttpStatus, Logger,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : 'Internal server error';

    this.logger.error(`${request.method} ${request.url} — ${status}`, exception);

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

Flutter parallel: `FlutterError.onError` and `ErrorWidget.builder` — centralized error handling that catches unhandled exceptions and presents a consistent response.

---

## 7) Database Integration

### Raw `pg` with custom provider

This matches the approach from earlier lessons. Register a `Pool` as a custom provider.

```typescript
// database.provider.ts
import { Pool } from 'pg';

export const databaseProvider = {
  provide: 'DATABASE',
  useFactory: () => new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
  }),
};
```

```typescript
// database.module.ts
import { Module, Global } from '@nestjs/common';
import { databaseProvider } from './database.provider';

@Global() // makes DATABASE available everywhere without importing DatabaseModule
@Module({
  providers: [databaseProvider],
  exports: [databaseProvider],
})
export class DatabaseModule {}
```

Inject in any service:

```typescript
constructor(@Inject('DATABASE') private readonly db: Pool) {}
```

### ORM options

NestJS has official integrations for TypeORM, Prisma, and Sequelize. These add entity mapping, migrations, and query builders. For this course, raw `pg` keeps things explicit and matches what you already know from lesson 11.

---

## 8) Configuration and Environment

```bash
npm install @nestjs/config
```

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // no need to import ConfigModule in every feature module
    }),
  ],
})
export class AppModule {}
```

Use `ConfigService` anywhere:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TasksService {
  private readonly dbUrl: string;

  constructor(private readonly config: ConfigService) {
    this.dbUrl = this.config.getOrThrow<string>('DATABASE_URL');
  }
}
```

`getOrThrow` fails fast at startup if the variable is missing. Prefer it over `get` for required config.

Flutter parallel: `flutter_dotenv` for loading `.env` files, or `--dart-define` for compile-time config. `ConfigService` is like a typed wrapper around `dotenv.env['KEY']` that throws if a required value is missing.

---

## 9) Testing in NestJS

### Unit testing a service

NestJS provides `Test.createTestingModule` to build a DI container for tests. Override real dependencies with mocks.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { NotFoundException } from '@nestjs/common';

describe('TasksService', () => {
  let service: TasksService;
  let mockDb: { query: jest.Mock };

  beforeEach(async () => {
    mockDb = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: 'DATABASE', useValue: mockDb },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('returns all tasks', async () => {
    const tasks = [{ id: '1', title: 'Test' }];
    mockDb.query.mockResolvedValue({ rows: tasks });

    const result = await service.findAll();

    expect(result).toEqual(tasks);
    expect(mockDb.query).toHaveBeenCalledWith('SELECT * FROM tasks ORDER BY created_at DESC');
  });

  it('throws NotFoundException when task does not exist', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });

    await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
  });
});
```

Flutter parallel: `setUpAll` with GetIt test registration where you replace real repositories with mocks. Same idea — build a test container, swap dependencies, test behavior.

### E2E testing a controller

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Tasks (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('DATABASE')
      .useValue({ query: jest.fn().mockResolvedValue({ rows: [] }) })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /tasks validates input', async () => {
    await request(app.getHttpServer())
      .post('/tasks')
      .send({ title: '' })
      .expect(400);
  });

  it('GET /tasks returns array', async () => {
    await request(app.getHttpServer())
      .get('/tasks')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });
});
```

---

## 10) Production Patterns

### Health checks

```bash
npm install @nestjs/terminus
```

```typescript
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(private health: HealthCheckService) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // add indicators for database, redis, external services
    ]);
  }
}
```

### Rate limiting

```bash
npm install @nestjs/throttler
```

```typescript
import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
```

### CORS

```typescript
// main.ts
const app = await NestFactory.create(AppModule);
app.enableCors({
  origin: ['https://app.example.com'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
});
```

### Graceful shutdown

```typescript
// main.ts
const app = await NestFactory.create(AppModule);
app.enableShutdownHooks(); // listens for SIGTERM/SIGINT

// Any service can implement OnModuleDestroy
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.pool.end();
  }
}
```

### OpenAPI / Swagger

```bash
npm install @nestjs/swagger
```

```typescript
// main.ts
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('Tasks API')
  .setVersion('1.0')
  .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('docs', app, document);
// API docs available at http://localhost:3000/docs
```

Add decorators to DTOs for richer docs:

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({ example: 'Buy groceries', minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  title: string;
}
```

### API versioning

```typescript
// main.ts
app.enableVersioning({ type: VersioningType.URI }); // /v1/tasks, /v2/tasks

// controller
@Controller({ path: 'tasks', version: '1' })
export class TasksV1Controller { /* ... */ }
```

### Security headers and compression

```bash
npm install helmet compression
```

```typescript
// main.ts
import helmet from 'helmet';
import compression from 'compression';

app.use(helmet());
app.use(compression());
```

---

## 11) NestJS vs Express — When to Choose Which

| Aspect | Express | NestJS |
|---|---|---|
| Structure | You decide everything | Opinionated modules/controllers/services |
| Dependency injection | Manual or none | Built-in, decorator-based |
| Validation | Add Zod/Joi yourself | Built-in pipes + class-validator |
| Testing | Manual setup | `Test.createTestingModule` with DI overrides |
| Learning curve | Low | Medium |
| Boilerplate | Low | Medium-high |
| Team scaling | Harder — each dev structures differently | Easier — framework enforces consistency |
| Code generation | None | CLI generators (`nest g resource tasks`) |
| API docs | Manual (swagger-jsdoc) | Decorators auto-generate OpenAPI |
| Best for | Small APIs, microservices, learning | Large apps, teams, enterprise |

**Decision guide**: use Express for services with fewer than 3 developers or fewer than 5 modules. Use NestJS when the team or codebase will grow, when you want built-in DI and testing utilities, or when you need auto-generated API documentation.

---

## 12) Project Structure for Production

```text
src/
  main.ts                          # bootstrap, global pipes/guards/filters
  app.module.ts                    # root module, imports all feature modules
  common/
    filters/
      all-exceptions.filter.ts     # global exception filter
    guards/
      api-key.guard.ts             # auth guard
    interceptors/
      logging.interceptor.ts       # request logging
    pipes/                         # custom pipes if needed
  config/
    config.module.ts               # ConfigModule.forRoot wrapper
    database.config.ts             # database provider factory
  tasks/
    tasks.module.ts                # feature module
    tasks.controller.ts            # HTTP handlers
    tasks.service.ts               # business logic
    dto/
      create-task.dto.ts           # input validation
      update-task.dto.ts
    entities/
      task.entity.ts               # domain type definition
    tasks.controller.spec.ts       # controller tests
    tasks.service.spec.ts          # service tests
  workflows/
    workflows.module.ts
    workflows.controller.ts
    workflows.service.ts
    dto/
    entities/
```

Flutter mapping:

| NestJS | Flutter |
|---|---|
| `src/common/` | `lib/core/` — shared utilities, base classes |
| `src/tasks/` | `lib/features/tasks/` — feature folder |
| `tasks.module.ts` | Feature DI registration |
| `tasks.controller.ts` | Feature's page/screen widgets |
| `tasks.service.ts` | Feature's repository/use case |
| `dto/` | Feature's models (freezed classes) |
| `entities/` | Feature's domain entities |
| `*.spec.ts` co-located with source | `test/features/tasks/` mirroring source |

---

## 13) Quick Reference Card

| NestJS concept | Express equivalent | Flutter equivalent |
|---|---|---|
| `@Controller()` | `Router()` | GoRouter route definition |
| `@Get()`, `@Post()`, etc. | `router.get()`, `router.post()` | Route handler / page builder |
| `@Injectable()` | (no equivalent) | `@injectable` annotation |
| `@Module()` | (no equivalent — manual wiring) | GetIt module registration |
| `@Inject('TOKEN')` | (no equivalent) | `@Named('token')` in GetIt |
| `@Body()` | `req.body` | Request model deserialization |
| `@Param('id')` | `req.params.id` | `GoRouterState.pathParameters` |
| `@Query('page')` | `req.query.page` | `GoRouterState.queryParameters` |
| `ValidationPipe` | Zod `.parse()` in handler | freezed + json_serializable validation |
| `Guards` | Auth middleware | GoRouter redirect guards |
| `Interceptors` | Wrapper middleware | Dio interceptors |
| `Exception filters` | Error-handling middleware | `FlutterError.onError` |
| `ConfigService` | `process.env` + dotenv | `flutter_dotenv` / `--dart-define` |
| `@Global()` module | (no equivalent) | GetIt global singleton |
| `Test.createTestingModule` | Manual mock setup | `setUpAll` + GetIt test overrides |
| `nest g resource` | (no equivalent) | `mason` brick generators |
| `@nestjs/swagger` | swagger-jsdoc + swagger-ui | build_runner code generation |

---

## 14) Pitfalls

**Circular dependencies.** Module A imports Module B which imports Module A. NestJS will throw at startup. Fix with `forwardRef(() => ModuleA)` or restructure so shared logic lives in a third module. This is the most common DI issue.

**Forgetting to register providers.** If a service is not listed in a module's `providers` array, NestJS cannot inject it. The error message is clear ("Nest can't resolve dependencies of X"), but it trips up beginners. Always check the module file first.

**Not enabling ValidationPipe globally.** Without it, DTOs are just plain classes — no validation runs. Add it in `main.ts` on day one.

**Decorator ordering matters.** `@UseGuards(AuthGuard)` before `@UseInterceptors(LoggingInterceptor)` means the guard runs first. If you reverse them, the interceptor wraps the guard. Be intentional about order.

**Over-engineering simple APIs.** NestJS has modules, guards, interceptors, pipes, filters, and more. For a 3-endpoint service, most of that is overhead. Use the pieces you need and skip the rest.

**Request-scoped providers cascade.** If one provider is `REQUEST`-scoped, every provider that depends on it also becomes request-scoped. This can silently degrade performance. Use request scope only when truly needed (e.g., per-request tenant context).

---

## 15) Practice Tasks

1. **Scaffold a Tasks CRUD.** Run `nest new task-api`, then `nest g resource tasks` to generate controller, service, module, and DTOs. Explore the generated files and understand how they connect.

2. **Add validation.** Install `class-validator` and `class-transformer`. Add validation decorators to `CreateTaskDto` and `UpdateTaskDto`. Enable `ValidationPipe` globally. Test that invalid input returns 400.

3. **Add an API key guard.** Create `ApiKeyGuard` that checks `x-api-key` header against an environment variable. Apply it globally. Verify that requests without the key get 401.

4. **Add Swagger documentation.** Install `@nestjs/swagger`. Configure it in `main.ts`. Add `@ApiProperty()` decorators to DTOs. Visit `/docs` and verify the interactive documentation works.

5. **Write a unit test.** Test `TasksService.findOne` — mock the database provider, verify it returns the task when found, and verify it throws `NotFoundException` when not found.

---

**Previous:** [15-microservices-devops.md](./15-microservices-devops.md) - Microservices and DevOps  
**Next:** [08-exercises.md](./08-exercises.md) - Production Exercises
